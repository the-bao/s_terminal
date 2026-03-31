import { Terminal } from './components/Terminal';

function App() {
  // Demo session - in production this would come from session management
  const session = {
    id: 'demo-session',
    host: 'localhost',
    port: 22,
    username: 'demo',
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Terminal
        sessionId={session.id}
        host={session.host}
        port={session.port}
        username={session.username}
      />
    </div>
  );
}

export default App
