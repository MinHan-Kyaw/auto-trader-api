const mongoose = require("mongoose");

const CarListingSchema = new mongoose.Schema({
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    mileage: { type: Number, required: true },
    vin: { type: String, required: true, unique: true },
    engine_size: { type: String, required: true },
    transmission: { type: String, required: true },
    fuel_type: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    photos: { type: [String], required: false },
    location: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true });

module.exports = mongoose.model("CarListing", CarListingSchema);
