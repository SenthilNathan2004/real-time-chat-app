const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Store users per room
let users = [];

const formatTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ username, room }, callback) => {
    const existingUser = users.find(
      (user) =>
        user.username.toLowerCase() === username.toLowerCase() &&
        user.room === room
    );

    if (existingUser) {
      callback({ error: "Username already taken in this room" });
      return;
    }

    const user = { id: socket.id, username, room };
    users.push(user);

    socket.join(room);

    const roomUsers = users.filter((u) => u.room === room);

    io.to(room).emit(
      "users",
      roomUsers.map((u) => u.username)
    );

    io.to(room).emit("message", {
      username: "System",
      message: `${username} joined ${room}`,
      time: formatTime(),
    });

    callback({ success: true });
  });

  socket.on("sendMessage", ({ username, message, room }) => {
    io.to(room).emit("message", {
      username,
      message,
      time: formatTime(),
    });
  });

  socket.on("typing", ({ username, room }) => {
    socket.to(room).emit("typing", username);
  });

  socket.on("disconnect", () => {
    const user = users.find((u) => u.id === socket.id);

    if (user) {
      users = users.filter((u) => u.id !== socket.id);

      const roomUsers = users.filter((u) => u.room === user.room);

      io.to(user.room).emit(
        "users",
        roomUsers.map((u) => u.username)
      );

      io.to(user.room).emit("message", {
        username: "System",
        message: `${user.username} left the chat`,
        time: formatTime(),
      });
    }
  });
});

server.listen(5001, () => {
  console.log("Server running on port 5001");
});