const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const aws = require("aws-sdk");

const apiResponse = require("../helpers/apiResponse");
const photoUploader = require("../helpers/photoUploader");
const auth = require("../middlewares/jwt");
const CarListing = require("../models/CarListingModel");

aws.config.update({
  accessKeyId: process.env.ACCESSKEY_ID,
  secretAccessKey: process.env.SECRET_ACCESSKEY,
  region: process.env.REGION, // Example: "nyc3"
});

const s3 = new aws.S3();

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
        // Check if a car listing with the same VIN already exists
        const existingCarListing = await CarListing.findOne({ vin });
        if (existingCarListing) {
          return apiResponse.ErrorResponse(
            res,
            "Duplicate VIN. Please use a different VIN."
          );
        }

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
          location,
          createdBy,
          createdBy,
        });
        const savedCarListing = await carListing.save();
        let uploadedFiles = [];

        if (req.files && req.files.length > 0) {
          uploadedFiles = await photoUploader.uploadToS3(
            req.files,
            savedCarListing._id
          );
        }
        const photos = uploadedFiles.map((file) => ({
          filename: file.filename,
          desktopUrl: file.desktopUrl,
          mobileUrl: file.mobileUrl,
          originalUrl: file.originalUrl,
        }));

        // Update the saved car listing with the parsed photos data
        await CarListing.findByIdAndUpdate(
          savedCarListing._id,
          { photos: JSON.stringify(photos) },
          { new: true }
        );

        return apiResponse.successResponseWithData(
          res,
          "Car listing added successfully.",
          { ...savedCarListing.toObject(), photos }
        );
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
        location,
        createdBy,
      } = req.body;

      if (req.auth._id.toString() !== createdBy) {
        return apiResponse.unauthorizedResponse(res, "Unauthorized access.");
      }

      if (!errors.isEmpty()) {
        return apiResponse.validationErrorWithData(
          res,
          "Validation Error.",
          errors.array()
        );
      }

      const existingCarListing = await CarListing.findById(req.params.id);

      if (!existingCarListing) {
        return apiResponse.notFoundResponse(res, "Car listing not found.");
      }

      if (vin !== existingCarListing.vin) {
        // Check if the new vin already exists in the database
        const existingListingWithNewVin = await CarListing.findOne({ vin });

        // If the new vin already exists, return a validation error
        if (existingListingWithNewVin) {
          return apiResponse.validationError(
            res,
            "Duplicate VIN. Please use a different VIN."
          );
        }
      }

      const existingPhotos = JSON.parse(existingCarListing.photos || "[]");

      // Handle addition of new photos
      const newPhotos = req.files;
      let uploadedFiles = [];
      if (newPhotos.length > 0) {
        uploadedFiles = await photoUploader.uploadToS3(
          newPhotos,
          req.params.id
        );
      }
      const updatedPhotos = [...existingPhotos, ...uploadedFiles];

      // Handle removal of photos
      const photosToRemove = JSON.parse(req.body.removePhotos);

      const updatedPhotosFiltered = updatedPhotos.filter(
        (file) => !photosToRemove.includes(file.filename)
      );

      // Delete removed photos from S3
      await Promise.all(
        photosToRemove.map(async (filename) => {
          await photoUploader.deleteFromS3(filename, req.params.id);
          console.log("Deleted:", filename);
        })
      );

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
        location,
        createdBy,
        photos: JSON.stringify(updatedPhotosFiltered),
        updatedBy: req.auth._id,
      };

      const updatedCarListing = await CarListing.findByIdAndUpdate(
        req.params.id,
        updatedData,
        { new: true }
      );
      return apiResponse.successResponseWithData(
        res,
        "Car listing updated successfully.",
        {
          ...updatedCarListing.toObject(),
          photos: JSON.parse(updatedCarListing.photos),
        }
      );
    } catch (err) {
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
      
      await photoUploader.deleteRecordFromS3(req.params.id);

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




