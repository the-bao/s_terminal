use crate::message::{ClientMessage, ServerMessage};
use crate::ssh::SshManager;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_tungstenite::{tungstenite::Message, WebSocketStream};
use uuid::Uuid;

pub async fn handle_connection(
    ws: WebSocketStream<tokio::net::TcpStream>,
    ssh_manager: Arc<SshManager>,
    host: String,
    port: u16,
    username: String,
    password: String,
) {
    let session_id = Uuid::new_v4().to_string();
    let (mut write, mut read) = ws.split();

    // Connect to SSH
    if let Err(e) = ssh_manager.connect(&session_id, &host, port, &username, &password) {
        let msg = ServerMessage::Error { message: e };
        let _ = write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await;
        return;
    }

    // Send connected message
    let connected = ServerMessage::Connected;
    let _ = write.send(Message::Text(serde_json::to_string(&connected).unwrap())).await;

    // Spawn reader task
    let reader_id = session_id.clone();
    let reader_ssh = Arc::clone(&ssh_manager);
    let (tx, mut rx) = mpsc::channel(100);

    tokio::spawn(async move {
        let mut buf = [0u8; 8192];
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            match reader_ssh.read(&reader_id, &mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    if tx.send(data).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    // Main event loop
    loop {
        tokio::select! {
            // WebSocket input
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            match client_msg {
                                ClientMessage::Input { data } => {
                                    let _ = ssh_manager.write(&session_id, data.as_bytes());
                                }
                                ClientMessage::Resize { cols, rows } => {
                                    let _ = ssh_manager.resize(&session_id, cols, rows);
                                }
                                ClientMessage::Ping => {
                                    let msg = ServerMessage::Pong;
                                    let _ = write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await;
                                }
                            }
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            // SSH output forward
            data = rx.recv() => {
                if let Some(data) = data {
                    let msg = ServerMessage::Output { data };
                    if write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    ssh_manager.disconnect(&session_id);
}
