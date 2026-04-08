var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_socket = require("socket.io");
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
async function startServer() {
  const app = (0, import_express.default)();
  const server = import_http.default.createServer(app);
  const io = new import_socket.Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8
    // 100MB for image uploads
  });
  const PORT = Number(process.env.PORT) || 8080;
  io.on("connection", (socket) => {
    let currentRoom = null;
    let currentRole = null;
    socket.on("join-room", (roomId, role) => {
      currentRoom = roomId;
      currentRole = role;
      socket.join(roomId);
      if (role === "remote") {
        socket.to(roomId).emit("REQUEST_CONTROL_STATE");
        socket.to(roomId).emit("remote-connected");
      } else if (role === "host") {
        socket.to(roomId).emit("host-connected");
      }
    });
    socket.on("FULL_CONTROL_STATE", (roomId, state) => {
      socket.to(roomId).emit("state-update", state);
    });
    socket.on("send-command", (roomId, command) => {
      socket.to(roomId).emit("command", command);
    });
    socket.on("upload-image", (roomId, imagePayload) => {
      socket.to(roomId).emit("new-image", imagePayload);
    });
    socket.on("disconnect", () => {
      if (currentRoom) {
        if (currentRole === "remote") {
          socket.to(currentRoom).emit("remote-disconnected");
        } else if (currentRole === "host") {
          socket.to(currentRoom).emit("host-disconnected");
        }
      }
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
