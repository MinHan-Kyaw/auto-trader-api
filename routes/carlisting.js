var express = require("express");
const CarListingController = require("../controllers/CarListingController");

var router = express.Router();

router.post("/", CarListingController.addCarListing);
router.get("/", CarListingController.carlistingList);
router.get("/:id", CarListingController.carListingDetail);
router.put("/:id", CarListingController.updateCarListing);
router.delete("/:id", CarListingController.deleteCarListing);

module.exports = router;
