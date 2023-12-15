const Movie = require('../models/Movie')
const { createCustomError } = require('../errors/custom-error')

const getAllMovies = async (req, res) => {
    const movies = await Movie.find({}).sort({ title: 1 })
    res.json({ total: movies.length, movies })
}

const getMovie = async (req, res, next) => {
    const { id: movieID } = req.params
    const movie = await Movie.findOne({ _id: movieID })

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404))
    }

    res.status(200).json(movie)
}

const createMovie = async (req, res) => {
    const movie = await Movie.create(req.body)
    res.status(201).json(movie)
}

const updateMovie = async (req, res, next) => {
    const { id: movieID } = req.params
    const movie = await Movie.findOneAndUpdate({ _id: movieID }, req.body, {
        new: true,
        runValidators: true
    })

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404))
    }

    res.status(200).json(movie)
}

const deleteMovie = async (req, res, next) => {
    const { id: movieID } = req.params
    const movie = await Movie.findOneAndDelete({ _id: movieID })

    if (!movie) {
        return next(createCustomError(`No movie with ID: ${movieID}`, 404))
    }

    res.status(200).json(movie)
}

module.exports = { getAllMovies, getMovie, createMovie, updateMovie, deleteMovie }