import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e8 // 100MB for image uploads
  });

  const PORT = Number(process.env.PORT) || 3000;

  io.on('connection', (socket) => {
    let currentRoom: string | null = null;
    let currentRole: string | null = null;

    socket.on('join-room', (roomId, role) => {
      currentRoom = roomId;
      currentRole = role;
      socket.join(roomId);
      
      if (role === 'remote') {
        // Ask host to sync state to the new remote
        socket.to(roomId).emit('REQUEST_CONTROL_STATE');
        // Notify host that remote connected
        socket.to(roomId).emit('remote-connected');
      } else if (role === 'host') {
        // Notify remote that host connected
        socket.to(roomId).emit('host-connected');
      }
    });

    socket.on('FULL_CONTROL_STATE', (roomId, state) => {
      socket.to(roomId).emit('state-update', state);
    });

    socket.on('send-command', (roomId, command) => {
      socket.to(roomId).emit('command', command);
    });

    socket.on('upload-image', (roomId, imagePayload) => {
      socket.to(roomId).emit('new-image', imagePayload);
    });

    socket.on('disconnect', () => {
      if (currentRoom) {
        if (currentRole === 'remote') {
          socket.to(currentRoom).emit('remote-disconnected');
        } else if (currentRole === 'host') {
          socket.to(currentRoom).emit('host-disconnected');
        }
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
