const db = require("../../config/db");

const fetchAllCategories = async (req, res, next) => {
  try {
    const categoriesQuery = `
      SELECT c1.id AS category_id, c1.name AS category_name, 
             c2.id AS subcategory_id, c2.name AS subcategory_name
      FROM categories c1
      LEFT JOIN categories c2 ON c1.id = c2.parent_id
      WHERE c1.parent_id IS NULL
      ORDER BY c1.id, c2.id;
    `;
    const categoriesResult = await db.query(categoriesQuery);

    const categoriesMap = {};

    categoriesResult.rows.forEach((row) => {
      // if category doesn't exist in the map, create it
      if (!categoriesMap[row.category_id]) {
        categoriesMap[row.category_id] = {
          id: row.category_id,
          name: row.category_name,
          subcategories: [],
        };
      }

      // add the subcategory if it exists
      if (row.subcategory_id) {
        categoriesMap[row.category_id].subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
        });
      }
    });

    // convert the map to an array
    const result = Object.values(categoriesMap);

    return res.status(200).json(result);
  } catch (error) {
    next(error); // Pass the error to the middleware
  }
};

const fetchSingleCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const categoryQuery = `
      SELECT c1.id AS category_id, c1.name AS category_name, 
             c2.id AS subcategory_id, c2.name AS subcategory_name
      FROM categories c1
      LEFT JOIN categories c2 ON c1.id = c2.parent_id
      WHERE c1.id = $1
      ORDER BY c1.id, c2.id;
    `;

    const categoryResult = await db.query(categoryQuery, [categoryId]);

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    const categoryMap = {
      id: categoryResult.rows[0].category_id,
      name: categoryResult.rows[0].category_name,
      subcategories: [],
    };

    // Loop through the result rows and add subcategories if they exist
    categoryResult.rows.forEach((row) => {
      if (row.subcategory_id) {
        categoryMap.subcategories.push({
          id: row.subcategory_id,
          name: row.subcategory_name,
        });
      }
    });

    return res.status(200).json(categoryMap);
  } catch (error) {
    next(error); // Pass the error to the middleware
  }
};

module.exports = { fetchAllCategories, fetchSingleCategory };
