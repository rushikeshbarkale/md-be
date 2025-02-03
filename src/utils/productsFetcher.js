const db = require("../config/db");
const { faker } = require("@faker-js/faker");

const medicalEquipmentNames = [
  "Anesthesia Machine",
  "Ultrasound Scanner",
  "MRI Machine",
  "CT Scanner",
  "ECG Monitor",
  "Defibrillator",
  "Ventilator",
  "Surgical Lamp",
  "X-Ray Machine",
  "Patient Monitor",
  "Infusion Pump",
  "Autoclave",
  "Dialysis Machine",
  "Syringe Pump",
  "Endoscope",
  "Surgical Table",
  "C-Arm Imaging System",
  "Oxygen Concentrator",
  "Pulse Oximeter",
  "Blood Pressure Monitor",
];

const generateRandomProductData = (subcategoryId, categoryId, supplierId) => {
  return {
    name: faker.helpers.arrayElement(medicalEquipmentNames),
    brand: faker.company.name(),
    model: faker.helpers.replaceSymbols("???-###"), //random model (e.g., ABC-123)
    categoryId: categoryId,
    subCategoryId: subcategoryId,
    description: faker.lorem.sentence(),
    condition: faker.helpers.arrayElement(["new", "used"]),
    year: faker.date.past(10).getFullYear(),
    price: faker.commerce.price({ min: 100, max: 5000, dec: 2 }),
    salesArea: faker.location.country(),
    supplierId: supplierId,
  };
};

const populateProductsTable = async () => {
  try {
    // Fetch data from the database
    const categories = await db.query(
      "SELECT * FROM categories WHERE parent_id IS NULL"
    );
    const subcategories = await db.query(
      "SELECT * FROM categories WHERE parent_id IS NOT NULL"
    );
    const suppliers = await db.query("SELECT id FROM suppliers");

    const supplierIds = suppliers.rows.map((row) => row.id);

    // Group subcategories by category
    const subcategoriesByCategory = {};
    subcategories.rows.forEach((subcategory) => {
      const { parent_id: categoryId } = subcategory;
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(subcategory);
    });

    for (const category of categories.rows) {
      if (!subcategoriesByCategory[category.id]) continue;

      const subcategoriesForCategory = subcategoriesByCategory[category.id];

      for (const subcategory of subcategoriesForCategory) {
        const { id: subCategoryId } = subcategory;

        // Ensure a minimum of 5 products for each subcategory
        const numberOfProducts = Math.max(
          faker.number.int({ min: 5, max: 15 }),
          5
        );

        for (let i = 0; i < numberOfProducts; i++) {
          const randomSupplierId = faker.helpers.arrayElement(supplierIds);
          const product = generateRandomProductData(
            subCategoryId,
            category.id,
            randomSupplierId
          );

          // Insert product into the database
          const query = `
            INSERT INTO productsnew (name, brand, model, category_id, subcategory_id, description, condition, year, price, sales_area, supplier_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `;

          const values = [
            product.name,
            product.brand,
            product.model,
            product.categoryId,
            product.subCategoryId,
            product.description,
            product.condition,
            product.year,
            product.price,
            product.salesArea,
            product.supplierId,
          ];

          await db.query(query, values);
        }
      }
    }

    console.log("Products table successfully populated with random data.");
  } catch (error) {
    console.error("Error populating products table:", error);
  }
};

module.exports = populateProductsTable;
