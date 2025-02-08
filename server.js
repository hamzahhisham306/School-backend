const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());

let users = {}; // Store connected users and their locations

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("sendLocation", (data) => {
        users[socket.id] = { ...data, id: socket.id }; // Store user location
        io.emit("updateLocations", Object.values(users)); // Send updated list to all clients
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        delete users[socket.id]; // Remove user on disconnect
        io.emit("updateLocations", Object.values(users)); // Send updated locations
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
