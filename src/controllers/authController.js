const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

//sign up
const signUp = async (req, res) => {
  const {
    name,
    email,
    password,
    company_name,
    contact_info,
    company_address,
    sales_area,
    role,
  } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required." });
  }

  if (role && !["admin", "supplier", "user"].includes(role)) {
    return res.status(400).json({ message: "Invalid role provided." });
  }

  const userRole = role || "supplier"; // default to 'supplier' if no role provided

  // Supplier-specific validation
  if (userRole === "supplier") {
    if (
      !company_name ||
      !contact_info ||
      !contact_info.phone ||
      !company_address ||
      !sales_area
    ) {
      return res.status(400).json({
        message: "All Supplier fields are required.",
      });
    }
  }

  try {
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // insert the user into the users table
    const result = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, hashedPassword, userRole]
    );

    const userId = result.rows[0].id;

    // if user is supplier, insert into the suppliers table
    if (userRole === "supplier") {
      const email = req.body.email;
      const contactInfo = JSON.stringify({
        phone: contact_info?.phone || "",
        email: email,
      });
      await db.query(
        "INSERT INTO suppliers (user_id, company_name, contact_info, company_address, sales_area) VALUES ($1, $2, $3, $4, $5)",
        [userId, company_name, contactInfo, company_address, sales_area]
      );
    }

    // generate JWT token
    const token = jwt.sign(
      { id: userId, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res
      .status(201)
      .json({ message: "User registered successfully.", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// log in
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = result.rows[0];

    // verify the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // generate JWT token with role information
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // response with token
    return res
      .status(200)
      .json({ message: "Login successful.", token, role: user.role });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getUserData = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; //extract token from Authorization header

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    //verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, role } = decoded;

    // Query the user data from the users table using the ID from the token
    const result = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];

    if (role === "supplier") {
      const supplierResult = await db.query(
        "SELECT id, company_name, contact_info, company_address, sales_area FROM suppliers WHERE user_id = $1",
        [id]
      );
      if (supplierResult.rows.length > 0) {
        user.supplier_details = supplierResult.rows[0];
      }
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = { signUp, login, getUserData };
