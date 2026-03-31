export interface Session {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  createdAt: number;
}

export type ClientMessage = {
  type: 'resize';
  cols: number;
  rows: number;
} | {
  type: 'input';
  data: string;
} | {
  type: 'ping';
};

export type ServerMessage = {
  type: 'output';
  data: string;
} | {
  type: 'pong';
} | {
  type: 'error';
  data: string;
} | {
  type: 'connected';
};
