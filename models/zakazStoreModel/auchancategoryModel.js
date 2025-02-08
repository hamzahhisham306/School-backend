const mongoose = require("mongoose");

// Define the schema for your MongoDB model  
const auchancategorySchema = new mongoose.Schema(  
{  
id: { type: String, required: true, unique: false },  
title: { type: String, required: true, unique: false },  
count: { type: Number, required: true, unique: false },  
children: [  
{ type: mongoose.Schema.Types.Mixed, ref: "Category", default: [] },  
],  
description: { type: String, required: false, unique: false },  
image_url: {  
svg: { type: String, required: false, unique: false },  
png: { type: String, required: false, unique: false },  
main_category_preview: { type: String, required: false, unique: false }  
},  
excisable: { type: Boolean, required: false, unique: false },  
is_popular: { type: Boolean, required: false, unique: false },  
is_collection: { type: Boolean, required: false, unique: false },  
parent_id: { type: String, required: false, unique: false },  
},  
{ timestamps: true }  
);

// Create and export the model  
module.exports = mongoose.model("auchancategory", auchancategorySchema);  