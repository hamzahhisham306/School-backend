const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const authRouters = require("./routes/user-route");
const cors = require("cors");
const { debounce } = require('lodash');
require("dotenv").config();
const mongoose = require("mongoose");
const Location = require("./models/LocationSchema");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);

// Connection management configuration
const connectionManager = {
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    
    handleReconnect: async (socket) => {
        if (connectionManager.reconnectAttempts < connectionManager.maxReconnectAttempts) {
            connectionManager.reconnectAttempts++;
            setTimeout(() => {
                socket.connect();
            }, connectionManager.reconnectDelay);
        }
    }
};

// Socket.io configuration with enhanced settings
const io = socketIo(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(authRouters);

// MongoDB connection
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB is connected"))
    .catch((e) => console.log("MongoDB connection error:", e));

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    connectionManager.reconnectAttempts = 0;

    // Handle connection errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
        connectionManager.handleReconnect(socket);
    });

    // Throttled location update function
    const throttledLocationUpdate = debounce(async (data) => {
        if (!socket.userId || !socket.userPermissions?.locationSharing) return;

        try {
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

            io.emit("locationUpdate", updatedLocation);

            // Periodic full update
            if (!socket.fullUpdateInterval) {
                socket.fullUpdateInterval = setInterval(async () => {
                    try {
                        const locations = await Location.find({});
                        io.emit("updateLocations", locations);
                    } catch (error) {
                        console.error("Error in periodic update:", error);
                    }
                }, 5000);
            }
        } catch (error) {
            socket.emit("error", "Failed to update location");
            console.error("Error updating location:", error);
        }
    }, 1000);

    // Authentication handler
    socket.on("authenticate", async (userId) => {
        try {
            const user = await User.findById(userId);
            if (user) {
                socket.userId = userId;
                socket.userName = user.userName;
                socket.userPermissions = {
                    locationSharing: true // Default permission
                };
                
                const locations = await Location.find({});
                io.emit("updateLocations", locations);
                socket.emit("permissionsUpdated", socket.userPermissions);
            }
        } catch (error) {
            socket.emit("error", "Authentication failed");
            console.error("Authentication error:", error);
        }
    });

    // Permission management
    socket.on("updatePermissions", (permissions) => {
        if (socket.userId) {
            socket.userPermissions = {
                ...socket.userPermissions,
                ...permissions
            };
            socket.emit("permissionsUpdated", socket.userPermissions);
        }
    });

    // Location update handler
    socket.on("sendLocation", (data) => throttledLocationUpdate(data));

    // Disconnect handler
    socket.on("disconnect", async () => {
        if (socket.userId) {
            try {
                if (socket.fullUpdateInterval) {
                    clearInterval(socket.fullUpdateInterval);
                }
                
                await Location.deleteOne({ userId: socket.userId });
                const locations = await Location.find({});
                io.emit("updateLocations", locations);
            } catch (error) {
                console.error("Error handling disconnect:", error);
            }
        }
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));