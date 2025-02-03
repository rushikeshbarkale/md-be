const db = require("../config/db");
const bcrypt = require("bcrypt");
const { faker } = require("@faker-js/faker");

const saltRounds = 10; // Number of salt rounds for bcrypt

const populateUsersAndSuppliers = async () => {
  try {
    // Generate 19 random users
    const users = [];
    for (let i = 1; i <= 19; i++) {
      const name = faker.person.fullName();
      const email = `supplier${i}@example.com`;
      const hashedPassword = await bcrypt.hash("password", saltRounds);
      users.push({ name, email, hashedPassword });
    }

    // Insert users into the users table
    const userInsertQuery = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, 'supplier')
      RETURNING id
    `;

    const userIds = [];
    for (const user of users) {
      const result = await db.query(userInsertQuery, [
        user.name,
        user.email,
        user.hashedPassword,
      ]);
      userIds.push(result.rows[0].id);
    }

    console.log("Users table populated with 19 suppliers.");

    // Generate 19 suppliers linked to the newly created users
    const supplierInsertQuery = `
      INSERT INTO suppliers (user_id, company_name, contact_info)
      VALUES ($1, $2, $3)
    `;

    for (let i = 0; i < 19; i++) {
      const userId = userIds[i];
      const companyName = `${faker.company.name()} Supplies`;
      const contactInfo = JSON.stringify({
        phone: faker.phone.number("+91##########"),
        email: `contact@supplier${i + 1}.com`,
      });

      await db.query(supplierInsertQuery, [userId, companyName, contactInfo]);
    }

    console.log("Suppliers table populated and linked to users.");
  } catch (error) {
    console.error("Error populating users and suppliers tables:", error);
  }
};

const updateSuppliersWithAddress = async () => {
  try {
    const selectQuery = `SELECT id FROM suppliers`;
    const result = await db.query(selectQuery);

    const suppliers = result.rows;

    const updateQuery = `
      UPDATE suppliers
      SET company_address = $1
      WHERE id = $2
    `;

    for (const supplier of suppliers) {
      const randomAddress = `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()}`;
      await db.query(updateQuery, [randomAddress, supplier.id]);

      console.log("All suppliers updated with random company addresses.");
    }
  } catch (error) {
    console.error("Error updating suppliers with addresses:", error);
  }
};

module.exports = { populateUsersAndSuppliers, updateSuppliersWithAddress };
