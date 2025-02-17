const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const authRouters = require("./routes/user-route");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const Location = require("./models/LocationSchema");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

app.use(express.json())
app.use(cors());
app.use(authRouters);

mongoose
    .connect(MONGO_URI)
    .then(() => console.log("mongodb is connected"))
    .catch((e) => console.log(e));

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on("authenticate", async (userId) => {
        try {
            const user = await User.findById(userId);
            if (user) {
                socket.userId = userId;
                socket.userName = user.userName;
                
                // Get all active locations
                const locations = await Location.find({});
                io.emit("updateLocations", locations);
            }
        } catch (error) {
            console.error("Authentication error:", error);
        }
    });

    socket.on("sendLocation", async (data) => {
        if (!socket.userId) return;

        try {
            // Update or create location document
            const updatedLocation = await Location.findOneAndUpdate(
                { userId: socket.userId },
                {
                    userId: socket.userId,
                    userName: socket.userName,
                    lat: data.lat,
                    lng: data.lng,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

            // Emit the updated location immediately
            io.emit("locationUpdate", updatedLocation);

            // Every 5 seconds, send full location update to all clients
            if (!socket.fullUpdateInterval) {
                socket.fullUpdateInterval = setInterval(async () => {
                    const locations = await Location.find({});
                    io.emit("updateLocations", locations);
                }, 5000);
            }
        } catch (error) {
            console.error("Error updating location:", error);
        }
    });

    socket.on("disconnect", async () => {
        if (socket.userId) {
            try {
                // Clear the interval
                if (socket.fullUpdateInterval) {
                    clearInterval(socket.fullUpdateInterval);
                }
                
                // Remove user's location on disconnect
                await Location.deleteOne({ userId: socket.userId });
                const locations = await Location.find({});
                io.emit("updateLocations", locations);
            } catch (error) {
                console.error("Error removing location:", error);
            }
        }
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));