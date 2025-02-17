// models/Location.js
const mongoose = require("mongoose");

const LocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  lat: Number,
  lng: Number,
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Location", LocationSchema);