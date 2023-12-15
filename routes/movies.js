/**
 * @swagger
 * components:
 *   schemas:
 *     Movie:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The automatically generated ID of the movie
 *         title:
 *           type: string
 *           description: The movie title
 *         director:
 *           type: string
 *           description: The director of the movie
 *         release:
 *           type: object
 *           properties:
 *             year:
 *               type: number
 *               description: The release year of the movie
 *             country:
 *               type: string
 *               description: The release country of the movie
 *           required:
 *             - year
 *             - country
 *         duration:
 *           type: number
 *           description: The duration of the movie in minutes
 *         ageRestriction:
 *           type: number
 *           description: The age restriction for the movie
 *         cast:
 *           type: array
 *           items:
 *             type: string
 *           description: The cast members of the movie
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *           description: The genres of the movie
 *         description:
 *           type: string
 *           description: The description of the movie
 *       required:
 *         - title
 *         - director
 *         - release
 *         - duration
 *         - description
 */

/**
 * @swagger
 * tags:
 *   name: Movies
 *   description: Endpoints for managing movies
 */

/**
 * @swagger
 * paths:
 *   /api/v1/movies:
 *     get:
 *       summary: Returns the list of all movies
 *       tags:
 *         - Movies
 *     post:
 *       summary: Create a new movie
 *       tags:
 *         - Movies
 *
 *   /api/v1/movies/{id}:
 *     get:
 *       summary: Get a specific movie by ID
 *       tags:
 *         - Movies
 *     patch:
 *       summary: Update a specific movie by ID
 *       tags:
 *         - Movies
 *     delete:
 *       summary: Delete a specific movie by ID
 *       tags:
 *         - Movies
 */

const express = require('express')
const router = express.Router()

const {
    getAllMovies,
    getMovie,
    createMovie,
    updateMovie,
    deleteMovie
} = require('../controllers/movies')

router.route("/").get(getAllMovies).post(createMovie)
router.route("/:id").get(getMovie).patch(updateMovie).delete(deleteMovie)

module.exports = router