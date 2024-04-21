var express = require("express");
var router = express.Router();
const multer = require("multer");
const bodyParser = require("body-parser");
const CarListingController = require("../controllers/CarListingController");

const upload = multer({
  storage: multer.memoryStorage(),
});

// Configure body-parser middleware to parse text data
router.use(bodyParser.urlencoded({ extended: true }));

router.post("/", upload.array("photos"), CarListingController.addCarListing);
router.get("/", CarListingController.carlistingList);
router.get("/:id", CarListingController.carListingDetail);
router.put("/:id", upload.array("photos"), CarListingController.updateCarListing);
router.delete("/:id", CarListingController.deleteCarListing);

module.exports = router;
