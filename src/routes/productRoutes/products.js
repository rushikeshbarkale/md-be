const express = require("express");
const {
  getAllProducts,
  getProductById,
  getAllFilters,
  addProducts,
  filterProductsWithCategory,
  updateProductById,
  deleteProductById,
  filterProducts,
} = require("../../controllers/products/products");
const verifyToken = require("../../middleware/verifyToken");
const checkRole = require("../../middleware/checkRole");
const { getProductImage } = require("../../utils/imageFetcher");

const router = express.Router();

router.get("/all", getAllProducts);
router.get("/productById/:id", getProductById);
router.get("/filterProducts", filterProducts);
router.get("/allFilters", getAllFilters);

//supplier routes
router.get("/filterWithCategory", filterProductsWithCategory);
router.post("/addNew", verifyToken, checkRole, addProducts);
router.patch("/updateById/:id", verifyToken, checkRole, updateProductById);
router.delete("/deleteById/:id", verifyToken, deleteProductById);

router.get("/image/:productName", getProductImage);

module.exports = router;
