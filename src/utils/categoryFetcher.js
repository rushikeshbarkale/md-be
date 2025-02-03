async function fetchCategories() {
  try {
    const response = await axios.get(
      "https://apis.bimedis.com/filters/products?limit=15"
    );
    const categories = response.data.data.categories;

    for (let i = 0; i < categories.length; i++) {
      const mainCategoryName = categories[i].name;
      const mainCategoryId = i + 1; // Start from 1 as you already have 26 categories

      // Insert or update the main category
      await db.query(
        "INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
        [mainCategoryId, mainCategoryName]
      );

      // Handle subcategories (children)
      for (let j = 0; j < categories[i].children.length; j++) {
        const subCategoryName = categories[i].children[j].name;
        const subCategoryId = categories[i].children[j].id;

        // Insert or update the subcategory
        await db.query(
          "INSERT INTO categories (id, name, parent_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
          [subCategoryId, subCategoryName, mainCategoryId]
        );
      }
    }
    console.log(
      "Categories and subcategories have been successfully populated."
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

//* call this function when the app starts
// fetchCategories();
