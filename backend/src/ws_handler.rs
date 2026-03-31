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

    log::info!("Connecting SSH to {}:{} as {}", host, port, username);

    // Run blocking SSH connect in a dedicated thread
    let ssh_mgr = Arc::clone(&ssh_manager);
    let sid = session_id.clone();
    let h = host.clone();
    let u = username.clone();
    let p = password.clone();
    let connect_result = tokio::task::spawn_blocking(move || {
        ssh_mgr.connect(&sid, &h, port, &u, &p)
    }).await;

    match connect_result {
        Ok(Ok(())) => {
            log::info!("SSH connected to {}:{}", host, port);
        }
        Ok(Err(e)) => {
            log::error!("SSH connection failed: {}", e);
            let msg = ServerMessage::Error { data: e };
            let _ = write.send(Message::Text(serde_json::to_string(&msg).unwrap())).await;
            return;
        }
        Err(e) => {
            log::error!("SSH connect task panicked: {}", e);
            return;
        }
    }

    // Send connected message
    let connected = ServerMessage::Connected;
    let _ = write.send(Message::Text(serde_json::to_string(&connected).unwrap())).await;

    // Spawn reader task (uses blocking SSH read, runs on tokio thread pool)
    let reader_id = session_id.clone();
    let reader_ssh = Arc::clone(&ssh_manager);
    let (tx, mut rx) = mpsc::channel(100);

    tokio::spawn(async move {
        loop {
            // Use spawn_blocking for the blocking SSH read
            // buf must be created inside the closure to avoid Copy semantics losing data
            let ssh = Arc::clone(&reader_ssh);
            let id = reader_id.clone();
            let result = tokio::task::spawn_blocking(move || {
                let mut buf = [0u8; 8192];
                match ssh.read(&id, &mut buf) {
                    Ok(0) => Ok(None),
                    Ok(n) => Ok(Some(String::from_utf8_lossy(&buf[..n]).to_string())),
                    Err(e) if e.to_lowercase().contains("timed out") || e.to_lowercase().contains("would block") => {
                        Ok(None) // timeout is normal, keep looping
                    }
                    Err(e) => {
                        log::warn!("SSH read error: {}", e);
                        Err(e)
                    }
                }
            }).await;

            match result {
                Ok(Ok(None)) => {
                    // no data (EOF or timeout), continue
                }
                Ok(Ok(Some(data))) => {
                    if tx.send(data).await.is_err() {
                        break;
                    }
                }
                Ok(Err(e)) => {
                    log::error!("Reader spawn_blocking error: {}", e);
                    break;
                }
                Err(e) => {
                    log::error!("Reader task join error: {}", e);
                    break;
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
        log::warn!("Reader task exited");
    });

    // Main event loop
    loop {
        tokio::select! {
            // WebSocket input
            msg = read.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        log::info!("Received WS message: {}", text);
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            match client_msg {
                                ClientMessage::Input { data } => {
                                    let ssh = Arc::clone(&ssh_manager);
                                    let sid = session_id.clone();
                                    let data_bytes = data.into_bytes();
                                    // Spawn as a separate task to avoid blocking the select loop
                                    tokio::spawn(async move {
                                        let _ = tokio::task::spawn_blocking(move || {
                                            ssh.write(&sid, &data_bytes)
                                        }).await;
                                    });
                                }
                                ClientMessage::Resize { cols, rows } => {
                                    let ssh = Arc::clone(&ssh_manager);
                                    let sid = session_id.clone();
                                    tokio::spawn(async move {
                                        let _ = tokio::task::spawn_blocking(move || {
                                            ssh.resize(&sid, cols, rows)
                                        }).await;
                                    });
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
