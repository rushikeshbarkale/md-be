const parsePriceRange = (priceRange) => {
  if (!priceRange) return null;

  const [minPrice, maxPrice] = priceRange.split("-").map(Number);

  if (isNaN(minPrice) || isNaN(maxPrice) || minPrice > maxPrice) {
    throw new Error("Invalid price range. It should be in the format min-max.");
  }

  return { minPrice, maxPrice };
};

const validateProduct = (product) => {
  const {
    name,
    brand,
    model,
    category_id,
    subcategory_id,
    condition,
    year,
    price,
    sales_area,
    // supplier_id, //will now be extracted from the req.user.id (decoded from the token).
  } = product;

  const requiredFields = [
    "name",
    "brand",
    "model",
    "category_id",
    "subcategory_id",
    "condition",
    "year",
    "price",
    "sales_area",
    // "supplier_id",
  ];
  for (const field of requiredFields) {
    if (!product[field]) {
      return { valid: false, message: `${field} is required.` };
    }
  }

  if (typeof name !== "string" || name.trim() === "") {
    return { valid: false, message: "Name must be a non-empty string." };
  }
  if (typeof brand !== "string" || brand.trim() === "") {
    return { valid: false, message: "Brand must be a non-empty string." };
  }
  if (typeof model !== "string" || model.trim() === "") {
    return { valid: false, message: "Model must be a non-empty string." };
  }
  if (typeof sales_area !== "string" || sales_area.trim() === "") {
    return { valid: false, message: "Sales area must be a non-empty string." };
  }
  if (!Number.isInteger(category_id) || category_id <= 0) {
    return { valid: false, message: "Category ID must be a positive integer." };
  }
  if (!Number.isInteger(subcategory_id) || subcategory_id <= 0) {
    return {
      valid: false,
      message: "Sub-Category ID must be a positive integer.",
    };
  }
  // if (!Number.isInteger(supplier_id) || supplier_id <= 0) {
  //   return { valid: false, message: "Supplier ID must be a positive integer." };
  // }
  if (!["new", "used"].includes(condition)) {
    return {
      valid: false,
      message: "Condition must be either 'new' or 'used'.",
    };
  }
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    return {
      valid: false,
      message: `Year must be between 1900 and ${currentYear}.`,
    };
  }
  if (typeof price !== "number" || price <= 0) {
    return { valid: false, message: "Price must be a positive number." };
  }

  // if (price && !/^\d+-\d+$/.test(price)) {
  //   return {
  //     valid: false,
  //     message: "Invalid price range format. Use 'min-max'.",
  //   };
  // }

  // if (req.query.sort && !["price-asc", "price-desc"].includes(req.query.sort)) {
  //   return {
  //     valid: false,
  //     message: "Invalid sort option.",
  //   };
  // }

  // If everything is valid, return success
  return { valid: true };
};

module.exports = { parsePriceRange, validateProduct };
