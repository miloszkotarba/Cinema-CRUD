const { format, startOfDay, endOfDay, addMinutes } = require('date-fns')

const { CustomApiError, createCustomError } = require('../errors/custom-error')
const Screening = require('../models/Screening')
const Movie = require('../models/Movie')
const Room = require('../models/Room')
const Ticket = require('../models/Ticket')
const { buildPDF } = require('../pdf/invoiceTemplate')
const sendEmail = require('../mailer/sendEmail')

const getAllScreenings = async (req, res) => {
    const { date, movie } = req.query
    const queryObject = {}

    if (date) {
        // Zmiana formatu daty z "31-12-2024" na "2024-12-31"
        const [day, month, year] = date.split('-');
        const isoFormatDate = `${year}-${month}-${day}`;

        const startOfDayDate = startOfDay(new Date(isoFormatDate));
        const endOfDayDate = endOfDay(new Date(isoFormatDate));

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
            _id: screening._id,
            advertisementsDuration: screening.advertisementsDuration,
            date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
            movie: screening.movie,
            room: screening.room,
            reservations: screening.reservations,
        };
    });

    res.status(200).json({ total: screenings.length, screenings: formattedScreenings })
}

const getScreening = async (req, res, next) => {
    const { id: screeningID } = req.params
    const screening = await Screening.findOne({ _id: screeningID }).populate('movie').populate('room')

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const formattedScreening = {
        _id: screening._id,
        advertisementsDuration: screening.advertisementsDuration,
        date: format(new Date(screening.date), 'yyyy-MM-dd HH:mm:ss'),
        movie: screening.movie,
        room: screening.room,
        reservations: screening.reservations,
    };

    res.status(200).json(formattedScreening)
}

const createScreening = async (req, res, next) => {
    const { movie, room, date } = req.body
    console.log(req.body.movie)

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
    const { id: screeningID } = req.params

    const screening = await Screening.findOneAndDelete({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    res.status(200).json(screening)
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

const getReservation = async (req, res, next) => {
    const { id: screeningID, reservationID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const reservation = screening.reservations.find(reservation => String(reservation._id) === reservationID)

    if (!reservation) {
        return next(createCustomError(`No reservation with ID: ${reservationID}`, 404))
    }

    res.status(200).json(reservation)
}

const createReservation = async (req, res, next) => {
    const { id: screeningID } = req.params

    const screening = await Screening.findOne({ _id: screeningID }).populate('room').populate('movie')

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

    await screening.updateOne(
        { $push: { reservations: newReservation } },
        { runValidators: true }
    );

    const ticket = await Ticket.find({})

    function convertSeatsToItems(seats)
    {
        const seatTypes = {};
        seats.forEach(seat => {
            if (!seatTypes[seat.typeOfSeat]) {
                seatTypes[seat.typeOfSeat] = [];
            }
            seatTypes[seat.typeOfSeat].push(seat.seatNumber);
        });

        const items = [];
        Object.entries(seatTypes).forEach(([seatType, seatNumbers]) => {
            items.push({
                item: `Bilet ${seatType}`,
                description: seatType === 'ulgowy' ? 'Dla osób uprawnionych do ulgi' : '',
                quantity: seatNumbers.length,
                amount: seatType === 'ulgowy' ? 2000 : 3000 // @TODO Fix to database
            });
        });

        return items;
    }

    const invoice = {
        reservation: {
            id: "test" // @TODO to fix
            // @TODO fix advertisementDuration + movieTime
        },
        client: {
            name: `${newReservation.client.lastName} ${newReservation.client.firstName}`,
            email: newReservation.client.email
        },
        items: convertSeatsToItems(newReservation.seats),
        screening: {
            movie: screening.movie.title,
            date: screening.date,
            room: screening.room.name
        },
        seats: newReservation.seats
    }

    let pdfBuffer

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            const chunks = []
            buildPDF(
                (chunk) => chunks.push(chunk),
                () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer);
                    } catch (error) {
                        reject(error)
                    }
                },
                invoice
            )
        })
    } catch (error) {
        console.error(error)
        return next(createCustomError(error, 500))
    }

    try {
        const attachments = [
            {
                filename: 'invoice.pdf',
                content: pdfBuffer,
                encoding: 'base64',
            },
        ];

        await sendEmail({
            name: invoice.client.name,
            email: invoice.client.email
        }, "Potwierdzenie zakupu biletów", "Dziękujemy za kupienie biletów. Zajrzyj do załącznika. Pozdrawiamy.", attachments);

    } catch (error) {
        console.error("Błąd wysyłania e-maila:", error);
        return next(createCustomError(error, 500))
    }

    res.status(201).json({ message: 'Reservation created successfully' });
}

const updateReservation = async (req, res, next) => {

}

const deleteReservation = async (req, res, next) => {
    const { id: screeningID, reservationID } = req.params

    const screening = await Screening.findOne({ _id: screeningID })

    if (!screening) {
        return next(createCustomError(`No screening with ID: ${screeningID}`, 404))
    }

    const reservationIndex = screening.reservations.findIndex(reservation => String(reservation._id) === reservationID)

    if (reservationIndex === -1) {
        return next(createCustomError(`No reservation with ID: ${reservationID}`, 404))
    }

    screening.reservations.splice(reservationIndex, 1);

    await screening.save()

    res.status(200).json({ message: 'Reservation deleted successfully' })
}

const getSeats = async (req, res) => {

}

const testFunction = async (req, res, next) => {
    const invoice = {
        reservation: {
            id: "6580c7a06714a80988d927eb"
        },
        client: {
            name: "Piotr Komorowski",
            email: "piotr.komorowski@wp.pl",
        },
        items: [
            {
                item: "Bilet ulgowy",
                description: "Dla osób uprawnionych do ulgi",
                quantity: 1,
                amount: 2000
            },
            {
                item: "Bilet normalny",
                description: "",
                quantity: 3,
                amount: 3000
            }
        ],
        screening: {
            movie: "Ostatnie wakacje",
            date: "2023-12-18T12:20:00.000Z",
            room: "Bałtyk 3D"
        },
        "seats": [
            {
                "seatNumber": 1,
                "typeOfSeat": "normalny"
            },
            {
                "seatNumber": 2,
                "typeOfSeat": "normalny"
            },
            {
                "seatNumber": 3,
                "typeOfSeat": "normalny"
            },
            {
                "seatNumber": 4,
                "typeOfSeat": "normalny"
            }
        ],
    };

    let pdfBuffer

    try {
        pdfBuffer = await new Promise((resolve, reject) => {
            const chunks = []
            buildPDF(
                (chunk) => chunks.push(chunk),
                () => {
                    try {
                        const buffer = Buffer.concat(chunks);
                        resolve(buffer);
                    } catch (error) {
                        reject(error)
                    }
                },
                invoice
            )
        })
    } catch (error) {
        console.error(error)
        return next(createCustomError(error, 500))
    }

    try {
        const attachments = [
            {
                filename: 'invoice.pdf',
                content: pdfBuffer,
                encoding: 'base64',
            },
        ];

        await sendEmail("msiuda9@gmail.com", "Potwierdzenie zakupu biletów", "Dziękujemy za kupienie biletów. Zajrzyj do załącznika. Pozdrawiamy.", attachments);

    } catch (error) {
        console.error("Błąd wysyłania e-maila:", error);
        return next(createCustomError(error, 500))
    }

    res.status(200).json({ status: "send" })
}

module.exports = {
    getAllScreenings,
    getScreening,
    updateScreening,
    deleteScreening,
    createScreening,
    getAllReservations,
    getReservation,
    createReservation,
    deleteReservation,
    getSeats,
    testFunction
}