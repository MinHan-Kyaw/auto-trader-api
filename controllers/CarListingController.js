const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const apiResponse = require("../helpers/apiResponse");
const auth = require("../middlewares/jwt");
const CarListing = require("../models/CarListingModel");

/**
 * Add CarListing.
 *
 * @param {string}      sellerEmail
 * @param {string}      sellerPhone
 * @param {string}      make
 * @param {string}      model
 * @param {number}      year
 * @param {number}      mileage
 * @param {string}      vin
 * @param {string}      engineSize
 * @param {string}      transmission
 * @param {string}      fuelType
 * @param {number}      price
 * @param {string}      description
 * @param {array}       photos
 * @param {string}      location
 * @param {string}      createdBy   // User ID of the creator
 * @param {string}      updatedBy   // User ID of the updater
 *
 * @returns {Object}
 */
exports.addCarListing = [
  auth,
  body("sellerEmail", "Seller email must not be empty.")
    .isEmail()
    .normalizeEmail()
    .escape(), // Add .escape() for sellerEmail
  body("sellerPhone", "Seller phone must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for sellerPhone
  body("make", "Make must not be empty.").isLength({ min: 1 }).trim().escape(), // Add .escape() for make
  body("model", "Model must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for model
  body("year", "Year must not be empty.").isNumeric().escape(), // Add .escape() for year
  body("mileage", "Mileage must not be empty.").isNumeric().escape(), // Add .escape() for mileage
  body("vin", "VIN must not be empty.").isLength({ min: 1 }).trim().escape(), // Add .escape() for vin
  body("engineSize", "Engine size must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for engineSize
  body("transmission", "Transmission must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for transmission
  body("fuelType", "Fuel type must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for fuelType
  body("price", "Price must not be empty.").isNumeric().escape(), // Add .escape() for price
  body("description", "Description must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for description
  body("location", "Location must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for location
  (req, res) => {
    try {
      const errors = validationResult(req);
      const {
        sellerEmail,
        sellerPhone,
        make,
        model,
        year,
        mileage,
        vin,
        engineSize,
        transmission,
        fuelType,
        price,
        description,
        photos,
        location,
        createdBy,
      } = req.body;

      // Check if the authenticated user ID matches the createdBy field

      if (req.auth._id.toString() !== createdBy) {
        return apiResponse.unauthorizedResponse(res, "Unauthorized access.");
      }
      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          "Validation Error.",
          errors.array()
        );
      } else {
        // Save car listing.
        const carListing = new CarListing({
          sellerEmail,
          sellerPhone,
          make,
          model,
          year,
          mileage,
          vin,
          engine_size: engineSize,
          transmission,
          fuel_type: fuelType,
          price,
          description,
          photos,
          location,
          createdBy, // Assuming req.user contains the authenticated user object
          createdBy,
        });

        carListing
          .save()
          .then((savedCarListing) => {
            return apiResponse.successResponseWithData(
              res,
              "Car listing added successfully.",
              savedCarListing
            );
          })
          .catch((err) => {
            return apiResponse.ErrorResponse(res, err);
          });
      }
    } catch (err) {
      // Throw error in JSON response with status 500.
      return apiResponse.ErrorResponse(res, err);
    }
  },
];

/**
 * CarListing List.
 *
 * @returns {Object}
 */
exports.carlistingList = [
  auth,
  function (req, res) {
    try {
      // Initialize an empty object to hold filter criteria
      let filter = {};

      // Check if make filter is provided
      if (req.query.make) {
        // Convert make filter to lowercase
        const make = req.query.make.toLowerCase();
        // Add case-insensitive search for make
        filter.make = { $regex: make, $options: "i" };
      }

      if (req.query.model) {
        // Convert model filter to lowercase
        const model = req.query.model.toLowerCase();
        // Add case-insensitive search for model
        filter.model = { $regex: model, $options: "i" };
      }

      // Check if year filter is provided
      if (req.query.year) {
        // Add year filter to the filter object
        filter.year = req.query.year;
      }

      // Check if transmission filter is provided
      if (req.query.transmission) {
        // Convert make filter to lowercase
        const transmission = req.query.transmission.toLowerCase();
        // Add case-insensitive search for make
        filter.transmission = { $regex: transmission, $options: "i" };
      }

      // Check if fuelType filter is provided
      if (req.query.fuelType) {
        // Convert make filter to lowercase
        const fuelType = req.query.fuelType.toLowerCase();
        // Add case-insensitive search for make
        filter.fuelType = { $regex: fuelType, $options: "i" };
      }

      // Execute the find query with the filter object
      CarListing.find(filter)
        .select("-createdAt -updatedAt -__v")
        .then((carListings) => {
          // Check if any car listings are found
          if (carListings.length > 0) {
            return apiResponse.successResponseWithData(
              res,
              "Operation success",
              carListings
            );
          } else {
            return apiResponse.successResponseWithData(
              res,
              "No car listings found",
              []
            );
          }
        })
        .catch((err) => {
          // Handle errors
          return apiResponse.ErrorResponse(res, err);
        });
    } catch (err) {
      // Handle errors
      return apiResponse.ErrorResponse(res, err);
    }
  },
];

/**
 * CarListing Detail.
 *
 * @param {string}      id
 *
 * @returns {Object}
 */
exports.carListingDetail = [
  auth,
  async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return apiResponse.successResponseWithData(res, "Operation success", {});
    }
    try {
      // Find the car listing by ID
      const carListing = await CarListing.findOne({
        _id: req.params.id,
      }).select("-createdAt -updatedAt -__v");
      // Return the car listing data
      return apiResponse.successResponseWithData(
        res,
        "Operation success",
        carListing
      );
    } catch (err) {
      // Throw error in JSON response with status 500.
      return apiResponse.ErrorResponse(res, err);
    }
  },
];

/**
 * Update CarListing.
 *
 * @param {string}      sellerEmail
 * @param {string}      sellerPhone
 * @param {string}      make
 * @param {string}      model
 * @param {number}      year
 * @param {number}      mileage
 * @param {string}      vin
 * @param {string}      engineSize
 * @param {string}      transmission
 * @param {string}      fuelType
 * @param {number}      price
 * @param {string}      description
 * @param {array}       photos
 * @param {string}      location
 * @param {string}      createdBy
 *
 * @returns {Object}
 */
exports.updateCarListing = [
  auth,
  body("sellerEmail", "Seller email must not be empty.")
    .isEmail()
    .normalizeEmail()
    .escape(), // Add .escape() for sellerEmail
  body("sellerPhone", "Seller phone must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for sellerPhone
  body("make", "Make must not be empty.").isLength({ min: 1 }).trim().escape(), // Add .escape() for make
  body("model", "Model must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for model
  body("year", "Year must not be empty.").isNumeric().escape(), // Add .escape() for year
  body("mileage", "Mileage must not be empty.").isNumeric().escape(), // Add .escape() for mileage
  body("vin", "VIN must not be empty.").isLength({ min: 1 }).trim().escape(), // Add .escape() for vin
  body("engineSize", "Engine size must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for engineSize
  body("transmission", "Transmission must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for transmission
  body("fuelType", "Fuel type must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for fuelType
  body("price", "Price must not be empty.").isNumeric().escape(), // Add .escape() for price
  body("description", "Description must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for description
  body("location", "Location must not be empty.")
    .isLength({ min: 1 })
    .trim()
    .escape(), // Add .escape() for location
  async (req, res) => {
    try {
      const errors = validationResult(req);
      const {
        sellerEmail,
        sellerPhone,
        make,
        model,
        year,
        mileage,
        vin,
        engineSize,
        transmission,
        fuelType,
        price,
        description,
        photos,
        location,
        createdBy,
      } = req.body;

      // Check if the authenticated user ID matches the createdBy field
      if (req.auth._id.toString() !== createdBy) {
        return apiResponse.unauthorizedResponse(res, "Unauthorized access.");
      }

      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          "Validation Error.",
          errors.array()
        );
      } else {
        // Update car listing.
        const updatedData = {
          sellerEmail,
          sellerPhone,
          make,
          model,
          year,
          mileage,
          vin,
          engine_size: engineSize,
          transmission,
          fuel_type: fuelType,
          price,
          description,
          photos,
          location,
          updatedBy: req.auth._id, // Add the updatedBy field
        };

        const updatedCarListing = await CarListing.findByIdAndUpdate(
          req.params.id,
          updatedData,
          { new: true }
        );

        if (!updatedCarListing) {
          return apiResponse.notFoundResponse(res, "Car listing not found.");
        }

        return apiResponse.successResponseWithData(
          res,
          "Car listing updated successfully.",
          updatedCarListing
        );
      }
    } catch (err) {
      // Throw error in JSON response with status 500.
      return apiResponse.ErrorResponse(res, err);
    }
  },
];

/**
 * CarListing Delete.
 *
 * @param {string}      id
 *
 * @returns {Object}
 */
exports.deleteCarListing = [
  auth,
  async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Error.",
        "Invalid ID"
      );
    }
    try {
      // Find the car listing by ID
      const carListing = await CarListing.findById(req.params.id);

      // Check if the car listing exists
      if (!carListing) {
        return apiResponse.notFoundResponse(res, "Car listing not found.");
      }

      // Check if the authenticated user ID matches the createdBy field
      if (req.auth._id.toString() !== carListing.createdBy.toString()) {
        return apiResponse.unauthorizedResponse(res, "Unauthorized access.");
      }

      // Delete the car listing
      await CarListing.findByIdAndDelete(req.params.id);

      // Return success response
      return apiResponse.successResponse(
        res,
        "Car listing deleted successfully."
      );
    } catch (err) {
      // Throw error in JSON response with status 500.
      return apiResponse.ErrorResponse(res, err);
    }
  },
];
