/**
 * @swagger
 * components:
 *   schemas:
 *     Seat:
 *       type: object
 *       properties:
 *         seatNumber:
 *           type: number
 *           description: The seat number
 *         typeofSeat:
 *           type: string
 *           enum:
 *             - ulgowy
 *             - normalny
 *           description: The type of seat (ulgowy or normalny)
 *       required:
 *       - seatNumber
 *       - typeofSeat
 *
 *     Client:
 *       type: object
 *       properties:
 *         lastName:
 *           type: string
 *           description: The last name of the client
 *         firstName:
 *           type: string
 *           description: The first name of the client
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the client
 *       required:
 *       - lastName
 *       - firstName
 *       - email
 *
 *     Reservation:
 *       type: object
 *       properties:
 *         _id:
 *          type: string
 *          description: The automatically generated ID of the Reservation
 *         seats:
 *           type: array
 *           description: <b>Array of Seat Object.</b> The seats reserved
 *         client:
 *           type: object
 *           description: <b>Client Object.</b> The client making the reservation
 *       required:
 *       - seats
 *       - client
 *
 *     Screening:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The automatically generated ID of the Screening
 *         date:
 *           type: string
 *           format: date-time
 *           description: The date of the screening
 */

/**
 * @swagger
 * tags:
 *   name: Screenings
 *   description: Endpoints for managing Screenings
 */

/**
 * @swagger
 * paths:
 *   /api/v1/screenings:
 *     get:
 *       summary: Returns the list of all screenings
 *       tags:
 *         - Screenings
 */

const express = require('express')
const router = express.Router()

const {
    getAllScreenings,
    createScreening,
} = require('../controllers/screenings')

router.route("/").get(getAllScreenings).post(createScreening)

module.exports = router

