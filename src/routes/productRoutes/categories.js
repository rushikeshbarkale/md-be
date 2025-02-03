const express = require("express");
const {
  fetchAllCategories,
  fetchSingleCategory,
} = require("../../controllers/products/categories");

const router = express.Router();

router.get("/all", fetchAllCategories);
router.get("/categoryById/:categoryId", fetchSingleCategory);

module.exports = router;
