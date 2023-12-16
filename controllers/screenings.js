const { format } = require('date-fns')

const { CustomApiError, createCustomError } = require('../errors/custom-error')
const Screening = require('../models/Screening')
const Movie = require('../models/Movie')
const Room = require('../models/Room')

const getAllScreenings = async (req, res) => {
    let screenings = await Screening.find({}).populate('movie').populate('room').sort({ date: 'asc' })
    // @TODO Sort Check if OK

    const formattedScreenings = screenings.map(screening => {
        return {
            date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
            movie: screening.movie,
            room: screening.room,
            reservations: screening.reservations,
        };
    });

    res.status(200).json({ total: screenings.length, screenings: formattedScreenings })
}

const createScreening = async (req, res, next) => {
    const { movie, room } = req.body

    const { _id: movieID } = movie
    const movieExists = await Movie.exists({ _id: movieID })

    if (!movieExists) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 409))
    }

    const { _id: roomID } = room
    const roomExists = await Room.exists({ _id: roomID })

    if (!roomExists) {
        return next(createCustomError(`No room with ID: ${roomID}`, 409))
    }

    const screening = await Screening.create(req.body)
    res.status(200).json(screening)

    // @TODO sprawdz czy room jest wolny w danej godzinie i czasie filmu
    // @TODO zablokuj tworzenie obiektu rezerwacja z danymi
}

module.exports = {
    getAllScreenings,
    createScreening
}