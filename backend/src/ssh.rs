use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::sync::Arc;
use parking_lot::Mutex;
use ssh2::{DisconnectCode, Session};

pub struct SshSession {
    session: Session,
    stream: TcpStream,
    channel: ssh2::Channel,
}

pub struct SshManager {
    sessions: Mutex<HashMap<String, Arc<Mutex<SshSession>>>>,
}

impl SshManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }

    pub fn connect(&self, id: &str, host: &str, port: u16, username: &str, password: &str) -> Result<(), String> {
        let addr = format!("{}:{}", host, port);
        let mut stream = TcpStream::connect(&addr).map_err(|e| e.to_string())?;
        stream.set_read_timeout(Some(std::time::Duration::from_secs(60)))
              .map_err(|e| e.to_string())?;

        let mut session = Session::new().map_err(|e| e.to_string())?;
        session.set_tcp_stream(stream.try_clone().map_err(|e| e.to_string())?);
        session.handshake().map_err(|e| e.to_string())?;

        // Authenticate with password
        session.userauth_password(username, password).map_err(|e| e.to_string())?;
        if !session.authenticated() {
            return Err("Authentication failed".to_string());
        }

        // Open a shell channel
        let mut channel = session.channel_session().map_err(|e| e.to_string())?;
        channel.request_pty(
            "xterm-256color",
            None,
            Some((80, 24, 0, 0)),
        ).map_err(|e| e.to_string())?;
        channel.shell().map_err(|e| e.to_string())?;

        self.sessions.lock().insert(
            id.to_string(),
            Arc::new(Mutex::new(SshSession { session, stream, channel }))
        );

        Ok(())
    }

    pub fn disconnect(&self, id: &str) {
        if let Some(ssh) = self.sessions.lock().remove(id) {
            let _ = ssh.lock().session.disconnect(Some(DisconnectCode::ByApplication), "", None);
        }
    }

    pub fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.write(data).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn read(&self, id: &str, buf: &mut [u8]) -> Result<usize, String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.read(buf).map_err(|e| e.to_string())
    }

    pub fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let sessions = self.sessions.lock();
        let ssh = sessions.get(id).ok_or("Session not found")?;
        let mut ssh = ssh.lock();
        ssh.channel.request_pty_size(cols as u32, rows as u32, None, None).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn is_connected(&self, id: &str) -> bool {
        self.sessions.lock().contains_key(id)
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}
