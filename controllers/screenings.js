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

module.exports = {
    getAllScreenings,
    createScreening
}