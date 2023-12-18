const { format, startOfDay, endOfDay, addMinutes } = require('date-fns')

const { CustomApiError, createCustomError } = require('../errors/custom-error')
const Screening = require('../models/Screening')
const Movie = require('../models/Movie')
const Room = require('../models/Room')

const getAllScreenings = async (req, res) => {
    const { date, movie } = req.query
    const queryObject = {}

    if (date) {
        const startOfDayDate = startOfDay(new Date(date));
        const endOfDayDate = endOfDay(new Date(date));

        queryObject.date = { $gte: startOfDayDate, $lt: endOfDayDate };
    }

    if (movie) {
        if (!queryObject.movie) {
            queryObject.movie = {};
        }

        queryObject.movie._id = movie;
    }


    const screenings = await Screening.find(queryObject).populate('movie').populate('room').sort({
        date: 'asc',
        'movie._id': 'asc'
    })

    const formattedScreenings = screenings.map(screening => {
        return {
            date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
            movie: screening.movie,
            room: screening.room,
            reservations: screening.reservations,
        };
    });

    res.status(201).json({ total: screenings.length, screenings: screenings })
}

const getScreening = async (req, res, next) => {
    const { id: screeningID } = req.params
    const screening = await Screening.findOne({ _id: screeningID }).populate('movie').populate('room')

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    res.status(200).json(screening)
}

const createScreening = async (req, res, next) => {
    const { movie, room, date } = req.body

    const { _id: movieID } = movie
    const movieExists = await Movie.findOne({ _id: movieID })

    if (!movieExists) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 409))
    }

    const { duration: movieDuration } = movieExists

    const { _id: roomID } = room
    const roomExists = await Room.exists({ _id: roomID })

    if (!roomExists) {
        return next(createCustomError(`No room with ID: ${roomID}`, 409))
    }

    const existingScreenings = await Screening.find({
        room: roomID,
    }).populate('movie')

    const isOverlap = existingScreenings.some(screening => {
        const screeningStartTime = new Date(screening.date);
        const screeningEndTime = addMinutes(new Date(screening.date), screening.movie.duration);
        const newScreeningStartTime = new Date(date);
        const newScreeningEndTime = addMinutes(newScreeningStartTime, movieDuration);

        return screeningStartTime < newScreeningEndTime && newScreeningStartTime < screeningEndTime;
    })

    if (isOverlap) {
        return next(createCustomError(`Room is not available at the specified time.`, 409));
    }

    const screening = await Screening.create(req.body)
    res.status(201).json(screening)
}

const updateScreening = async (req, res, next) => {
    res.end("under construction")
}

const deleteScreening = async (req, res, next) => {
    res.end("under construction")
}

const getAllReservations = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const { reservations } = screening

    res.status(200).json({ total: reservations.length, reservations })
}

const createReservation = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOne({ _id: screeningID }).populate('room')

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const { room, reservations } = screening

    const bookedSeatNumbers = [...new Set(reservations.flatMap(reservation => reservation.seats.map(seat => seat.seatNumber)))].sort()

    const { numberOfSeats } = room

    const newReservation = {
        seats: req.body.seats,
        client: req.body.client,
    };

    for (const seat of newReservation.seats) {
        const seatNumber = seat.seatNumber;

        if (seatNumber < 1 || seatNumber > numberOfSeats) {
            return next(createCustomError(`Seat number ${seatNumber} is not valid. It should be in the range of 1 to ${numberOfSeats}.`, 400));
        }

        if (bookedSeatNumbers.includes(seatNumber)) {
            return next(createCustomError(`Seat number ${seatNumber} is already booked.`, 400));
        }
    }

    await screening.updateOne({ $push: { reservations: newReservation } });

    res.status(201).json({ message: 'Reservation created successfully' });
}

const getSeats = async (req, res) => {

}


module.exports = {
    getAllScreenings,
    getScreening,
    updateScreening,
    deleteScreening,
    createScreening,
    getAllReservations,
    createReservation,
    getSeats
}