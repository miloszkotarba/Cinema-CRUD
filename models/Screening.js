const mongoose = require('mongoose');

const SeatSchema = new mongoose.Schema({
    seatNumber: {
        type: Number,
        required: [true, "Seat is required"]
    },
    typeofSeat: {
        type: String,
        required: [true, "Type of seat is required"],
        enum: {
            values: ["ulgowy", "normalny"],
            message: "{VALUE} is not correct",
        },
    },
}, { _id: false })

const ClientSchema = new mongoose.Schema({
    lastName: {
        type: String,
        required: [true, "Last Name is required"]
    },
    firstName: {
        type: String,
        required: [true, "First Name is required"]
    },
    email: {
        type: String,
        required: [true, "Email is required"]
    },
}, { _id: false })

const ReservationSchema = new mongoose.Schema({
    seats: {
        type: [SeatSchema],
        required: [true, "You must have at least one seat selected"]
    },
    client: {
        type: ClientSchema,
        required: [true, "Client is required"],
    },
})

const ScreeningSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, "Screening date is required"],
        default: Date.now()
    },
    movie: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Movie',
        required: [true, "Movie is required"],
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, "Room is required"],
    },
    reservations: {
        type: [ReservationSchema],
        default: [],
    },
}, {
    versionKey: false
})

module.exports = mongoose.model('Screening', ScreeningSchema);
