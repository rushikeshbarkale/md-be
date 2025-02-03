const db = require("../../config/db");

const { parsePriceRange, validateProduct } = require("../../utils/helper");

const getAllProducts = async (req, res, next) => {
  //basic
  // const page = parseInt(req.query.page) || 1; //current page number
  // const pageSize = parseInt(req.query.pageSize) || 10; // items per page, by default its 10

  //v1
  const page = Math.max(1, parseInt(req.query.page)) || 1; // ensures +ve number, either default as 1
  const pageSize =
    Math.min(Math.max(1, parseInt(req.query.pageSize)), 100) || 10; // ensures +ve number, max is 100
  const offset = (page - 1) * pageSize;
  /* number that specifies where to start fetching the records from. 
  For example, if you want the second page with 10 items per page, 
  the offset would be 10 (start from the 11th item). */

  try {
    /* Limit determines how many records to fetch.
    Offset determines how many records to skip before starting to return results */
    const allProductsQuery = `
        SELECT * FROM productsnew
        ORDER BY id ASC
        LIMIT $1 OFFSET $2;
    `;

    const productList = await db.query(allProductsQuery, [pageSize, offset]);

    // If no products found
    if (productList.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for the given page.",
      });
    }

    const countQuery = `SELECT COUNT(*) FROM productsnew`;
    const totalRowsResult = await db.query(countQuery);
    const totalRows = totalRowsResult.rows[0].count;
    const totalPages = Math.ceil(totalRows / pageSize);

    return res.status(200).json({
      success: true,
      data: productList.rows,
      currentPage: page,
      totalPages,
      totalRows,
    });
  } catch (error) {
    next(error); // Pass the error to the middleware
  }
};

const getProductById = async (req, res, next) => {
  const product_id = parseInt(req.params.id, 10);
  if (isNaN(product_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. It must be a number.",
    });
  }

  try {
    // const productByIdQuery = `
    //   SELECT * FROM productsnew
    //   WHERE id = $1;
    // `;

    const productByIdQuery = `
    SELECT
      p.id, p.name, p.brand, p.model, p.condition, p.price, p.year,
      c1.name AS category_name, c2.name AS subcategory_name,
      p.sales_area, p.supplier_id, p.description, p.created_at, p.image_url
    FROM
      productsnew p
    LEFT JOIN
      categories c1 ON p.category_id = c1.id
    LEFT JOIN
      categories c2 ON p.subcategory_id = c2.id
    WHERE
      p.id = $1;
  `;

    const productDetailsById = await db.query(productByIdQuery, [product_id]);

    if (!productDetailsById.rows[0]) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    return res
      .status(200)
      .json({ success: true, data: productDetailsById.rows[0] });
  } catch (error) {
    next(error);
  }
};

const filterProducts = async (req, res, next) => {
  const {
    category_id,
    subcategory_id,
    brand,
    model,
    condition,
    price,
    sales_area,
    year,
    page,
    pageSize,
  } = req.query;

  try {
    if (!category_id || !subcategory_id) {
      return res.status(400).json({
        success: false,
        message: "Both category_id and subcategory_id are required.",
      });
    }

    let filteredProductQuery = `
      SELECT 
        p.id, p.name, p.brand, p.model, p.condition, p.price, 
        p.category_id, p.subcategory_id, p.sales_area, p.year, 
        p.description, p.created_at, p.image_url,
        s.id AS supplier_id, s.company_name, s.contact_info, 
        s.sales_area AS supplier_sales_area,
        u.email AS supplier_user_email
      FROM productsnew p
      JOIN suppliers s ON p.supplier_id = s.id
      JOIN users u ON s.user_id = u.id
    `;

    let conditions = [];
    let values = [];

    // Apply basic filters
    conditions.push("p.category_id = $" + (values.length + 1));
    values.push(category_id);
    conditions.push("p.subcategory_id = $" + (values.length + 1));
    values.push(subcategory_id);

    // Apply additional filters if provided
    if (brand) {
      const brandArray = brand.split(",").map((b) => b.trim());
      conditions.push("p.brand = ANY($" + (values.length + 1) + ")");
      values.push(brandArray);
    }

    if (model) {
      const modelArray = model.split(",").map((m) => m.trim());
      conditions.push("p.model = ANY($" + (values.length + 1) + ")");
      values.push(modelArray);
    }

    if (condition) {
      conditions.push("p.condition = $" + (values.length + 1));
      values.push(condition);
    }

    if (sales_area) {
      conditions.push("p.sales_area ILIKE $" + (values.length + 1));
      values.push(sales_area);
    }

    if (year) {
      conditions.push("p.year = $" + (values.length + 1));
      values.push(year);
    }

    if (price) {
      const { minPrice, maxPrice } = parsePriceRange(price);
      conditions.push(
        "p.price BETWEEN $" +
          (values.length + 1) +
          " AND $" +
          (values.length + 2)
      );
      values.push(minPrice, maxPrice);
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      filteredProductQuery += " WHERE " + conditions.join(" AND ");
    }

    const currentPage = Math.max(1, parseInt(page)) || 1;
    const limit = Math.min(Math.max(1, parseInt(pageSize)), 100) || 12;
    const offset = (currentPage - 1) * limit;

    // Query to fetch total rows count
    const countQuery = `SELECT COUNT(*) FROM productsnew p 
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE ${conditions.join(" AND ")}`;
    const totalRowsResult = await db.query(countQuery, values);
    const totalRows = parseInt(totalRowsResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRows / limit);

    // Query to fetch filtered products with pagination
    filteredProductQuery +=
      " LIMIT $" + (values.length + 1) + " OFFSET $" + (values.length + 2);
    values.push(limit, offset);

    const filteredProductResult = await db.query(filteredProductQuery, values);

    if (filteredProductResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No data found." });
    }

    return res.status(200).json({
      success: true,
      data: filteredProductResult.rows,
      totalRows,
      totalPages,
      currentPage,
    });
  } catch (error) {
    next(error);
  }
};

const getAllFilters = async (req, res, next) => {
  const { category_id, subcategory_id } = req.query;

  try {
    if (!category_id || !subcategory_id) {
      return res.status(400).json({
        success: false,
        message: "Both category_id and subcategory_id are required.",
      });
    }

    let filterConditions = "";
    if (category_id) {
      filterConditions += ` AND p.category_id = ${category_id}`;
    }
    if (subcategory_id) {
      filterConditions += ` AND p.subcategory_id = ${subcategory_id}`;
    }

    //fetch distinct filters
    const filtersQuery = `
    SELECT
      -- fetch unique brands and their counts
      p.brand AS brand,
      COUNT(p.brand) AS brand_count,
      -- same for models
      p.model AS model,
      COUNT(p.model) AS model_count,
      -- same for conditions
      p.condition AS condition,
      COUNT(p.condition) AS condition_count,
      -- same for years
      p.year AS year,
      COUNT(p.year) AS year_count,
      -- same for sales areas
      p.sales_area AS sales_area,
      COUNT(p.sales_area) AS sales_area_count
    FROM productsnew p
    WHERE 1=1
    ${filterConditions}
    GROUP BY p.brand, p.model, p.condition, p.year, p.sales_area
    ORDER BY p.brand, p.model, p.condition, p.year, p.sales_area;
  `;

    const filtersResult = await db.query(filtersQuery);

    const filters = {
      brands: [],
      models: [],
      conditions: { new: 0, used: 0 },
      years: {},
      salesAreas: {},
    };

    filtersResult.rows.forEach((row) => {
      if (row.brand) {
        filters.brands.push({ name: row.brand, count: row.brand_count });
      }
      if (row.model) {
        filters.models.push({ name: row.model, count: row.model_count });
      }
      if (row.condition) {
        if (row.condition === "new") {
          filters.conditions.new += parseInt(row.condition_count, 10);
        } else if (row.condition === "used") {
          filters.conditions.used += parseInt(row.condition_count, 10);
        }
      }
      if (row.year) {
        if (!filters.years[row.year]) {
          filters.years[row.year] = 0;
        }
        filters.years[row.year] += parseInt(row.year_count, 10);
      }
      if (row.sales_area) {
        // Aggregate sales area count
        if (!filters.salesAreas[row.sales_area]) {
          filters.salesAreas[row.sales_area] = 0;
        }
        filters.salesAreas[row.sales_area] += parseInt(
          row.sales_area_count,
          10
        );
      }
    });

    const salesAreasArray = Object.entries(filters.salesAreas).map(
      ([name, count]) => ({
        name,
        count,
      })
    );

    // Convert years object to an array
    const yearsArray = Object.entries(filters.years).map(([year, count]) => ({
      year: parseInt(year, 10),
      count,
    }));

    // Final response
    const response = {
      brands: filters.brands,
      models: filters.models,
      conditions: filters.conditions,
      years: yearsArray,
      salesAreas: salesAreasArray,
    };

    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

//supplier endpoint
const filterProductsWithCategory = async (req, res, next) => {
  const {
    brand,
    condition,
    price,
    sales_area,
    supplier_id,
    category,
    subcategory,
  } = req.query;

  try {
    let filteredProductQuery = `
      SELECT
        p.id, p.name, p.brand, p.model, p.condition, p.price,
        c1.name AS category_name, c2.name AS subcategory_name,
        p.sales_area, p.supplier_id, p.description, p.created_at, p.image_url
      FROM
        productsnew p
      LEFT JOIN
        categories c1 ON p.category_id = c1.id
      LEFT JOIN
        categories c2 ON p.subcategory_id = c2.id
    `;

    let conditions = [];
    let values = [];

    // Apply filters
    if (brand) {
      conditions.push("p.brand = $" + (values.length + 1));
      values.push(brand);
    }

    if (condition) {
      conditions.push("p.condition = $" + (values.length + 1));
      values.push(condition);
    }

    if (sales_area) {
      conditions.push("p.sales_area ILIKE $" + (values.length + 1));
      values.push(sales_area);
    }

    if (supplier_id) {
      conditions.push("p.supplier_id = $" + (values.length + 1));
      values.push(supplier_id);
    }

    if (price) {
      const { minPrice, maxPrice } = parsePriceRange(price);
      conditions.push(
        "p.price BETWEEN $" +
          (values.length + 1) +
          " AND $" +
          (values.length + 2)
      );
      values.push(minPrice, maxPrice);
    }

    // Apply category and subcategory filters
    if (category) {
      conditions.push("p.category_id = $" + (values.length + 1));
      values.push(category);
    }

    if (subcategory) {
      conditions.push("p.subcategory_id = $" + (values.length + 1));
      values.push(subcategory);
    }

    if (req.query.search) {
      const search = `%${req.query.search}%`; //wildcards for partial matching
      conditions.push(
        "(p.name ILIKE $" +
          (values.length + 1) +
          " OR p.brand ILIKE $" +
          (values.length + 1) +
          ")"
      );
      values.push(search);
    }

    // Add conditions to the query
    if (conditions.length > 0) {
      filteredProductQuery += " WHERE " + conditions.join(" AND ");
    }

    // Sorting
    if (req.query.sort === "price-asc") {
      filteredProductQuery += " ORDER BY p.price ASC";
    } else if (req.query.sort === "price-desc") {
      filteredProductQuery += " ORDER BY p.price DESC";
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const pageSize =
      Math.min(Math.max(1, parseInt(req.query.pageSize)), 100) || 10;
    const offset = (page - 1) * pageSize;

    let countQuery = `
      SELECT COUNT(*) 
      FROM productsnew p
      LEFT JOIN categories c1 ON p.category_id = c1.id
      LEFT JOIN categories c2 ON p.subcategory_id = c2.id
    `;
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }

    const totalRowsResult = await db.query(countQuery, values);
    const totalRows = parseInt(totalRowsResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRows / pageSize);

    filteredProductQuery +=
      " LIMIT $" + (values.length + 1) + " OFFSET $" + (values.length + 2);
    values.push(pageSize, offset);

    const filteredProductResult = await db.query(filteredProductQuery, values);

    if (filteredProductResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "No data found" });
    }

    return res.status(200).json({
      success: true,
      data: filteredProductResult.rows,
      totalRows,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
};

//supplier endpoint
const addProducts = async (req, res, next) => {
  const product = req.body;

  const { valid, message } = validateProduct(product);
  if (!valid) {
    return res.status(400).json({ message });
  }

  try {
    const addProductQuery = `
      INSERT INTO productsnew
      (name, brand, model, category_id, description, condition, year, price, sales_area, image_url, supplier_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      product.name,
      product.brand,
      product.model,
      product.category_id,
      product.description || null,
      product.condition,
      product.year,
      product.price,
      product.sales_area,
      product.image_url,
      // product.supplier_id,
      req.user.id,
    ];

    const newProductDetails = await db.query(addProductQuery, values);

    return res
      .status(201)
      .json({ success: true, data: newProductDetails.rows[0] });
  } catch (error) {
    next(error);
  }
};

//supplier endpoint
const updateProductById = async (req, res, next) => {
  const product_id = parseInt(req.params.id, 10); // Extract product ID from URL
  const supplier_id = parseInt(req.query.supplier_id, 10); // Extract supplier ID from query parameters
  const updatedFields = req.body; // Fields to update sent in the request body

  // Validate product ID
  if (isNaN(product_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. It must be a number.",
    });
  }

  // Validate supplier ID
  if (isNaN(supplier_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid supplier ID. It must be a number.",
    });
  }

  // Validate if there are fields to update
  if (!updatedFields || Object.keys(updatedFields).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No fields provided to update.",
    });
  }

  try {
    // Check if the product exists and belongs to the supplier
    const productQuery = `SELECT * FROM productsnew WHERE id = $1 AND supplier_id = $2;`;
    const productResult = await db.query(productQuery, [
      product_id,
      supplier_id,
    ]);

    if (productResult.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this product or it does not exist.",
      });
    }

    // Dynamically build the UPDATE query
    const setClauses = [];
    const values = [];
    Object.keys(updatedFields).forEach((key, index) => {
      setClauses.push(`${key} = $${index + 1}`);
      values.push(updatedFields[key]);
    });

    // Add updated_at timestamp to the query
    setClauses.push(`updated_at = $${values.length + 1}`);
    values.push(new Date());

    // Complete the query
    const updateQuery = `
      UPDATE productsnew 
      SET ${setClauses.join(", ")} 
      WHERE id = $${values.length + 1} AND supplier_id = $${values.length + 2} 
      RETURNING *;
    `;
    values.push(product_id, supplier_id);

    // Execute the update query
    const updateResult = await db.query(updateQuery, values);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or could not be updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      updatedProduct: updateResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

//supplier endpoint
const deleteProductById = async (req, res, next) => {
  const product_id = parseInt(req.params.id, 10);
  const supplier_id = parseInt(req.query.supplier_id, 10);

  if (isNaN(product_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID. It must be a number.",
    });
  }

  if (isNaN(supplier_id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid supplier ID. It must be a number.",
    });
  }

  try {
    const productQuery = `SELECT * FROM productsnew WHERE id = $1 AND supplier_id = $2;`;
    const productResult = await db.query(productQuery, [
      product_id,
      supplier_id,
    ]);

    if (productResult.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to delete this product or it does not exist.",
      });
    }

    const deleteQuery = `DELETE FROM productsnew WHERE id = $1 AND supplier_id = $2 RETURNING *;`;
    const deleteResult = await db.query(deleteQuery, [product_id, supplier_id]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found or could not be deleted.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully.",
      deletedProduct: deleteResult.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  filterProducts,
  filterProductsWithCategory,
  getAllFilters,
  addProducts,
  updateProductById,
  deleteProductById,
};
