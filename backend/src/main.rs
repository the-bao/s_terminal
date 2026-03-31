mod message;
mod ssh;
mod ws_handler;

use crate::ssh::SshManager;
use crate::ws_handler::handle_connection;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::oneshot;
use tokio_tungstenite::accept_hdr_async;
use log::{info, error};
use tokio_tungstenite::tungstenite::http::Request;

fn percent_decode(s: &str) -> String {
    percent_encoding::percent_decode_str(s)
        .decode_utf8_lossy()
        .to_string()
}

#[derive(Clone)]
struct SshParams {
    host: String,
    port: u16,
    username: String,
    password: String,
}

#[tokio::main]
async fn main() {
    env_logger::init();
    info!("Starting Super Terminal server...");

    let ssh_manager = Arc::new(SshManager::new());
    let listener = TcpListener::bind("0.0.0.0:8081").await.unwrap();
    info!("Listening on ws://0.0.0.0:8081");

    while let Ok((stream, addr)) = listener.accept().await {
        info!("New connection from {}", addr);
        let ssh_manager = Arc::clone(&ssh_manager);

        tokio::spawn(async move {
            let (tx, rx) = oneshot::channel::<SshParams>();

            let result = accept_hdr_async(stream, |req: &Request<()>, res| {
                // Extract path and query params
                // URL format: /ssh/{host}/{port}/{username}/{password}
                if let Some(path) = req.uri().path_and_query() {
                    let path_str = path.to_string();
                    // Path starts with /ssh/, skip first 5 chars
                    if path_str.starts_with("/ssh/") {
                        let after_ssh = &path_str[5..];
                        let parts: Vec<&str> = after_ssh.split('/').collect();
                        if parts.len() >= 4 {
                            let params = SshParams {
                                host: percent_decode(parts[0]),
                                port: parts[1].parse().unwrap_or(22),
                                username: percent_decode(parts[2]),
                                password: percent_decode(parts[3]),
                            };
                            // Send params through channel
                            let _ = tx.send(params);
                            return Ok(res);
                        }
                    }
                }
                error!("Invalid request path");
                Ok(res)
            }).await;

            match result {
                Ok(ws) => {
                    if let Ok(params) = rx.await {
                        handle_connection(ws, ssh_manager, params.host, params.port, params.username, params.password).await;
                    }
                }
                Err(e) => {
                    error!("WebSocket handshake failed: {}", e);
                }
            }
        });
    }
}
