const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const db = require("./config/db");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/productRoutes/categories");
const productRoutes = require("./routes/productRoutes/products");
const nlpRoutes = require("./routes/nlpRoutes/nlp");
const errorHandler = require("./middleware/errorHandler");

//helper functions
// const populateProductsTable = require("./utils/productsFetcher");
// const {
//   updateSuppliersWithAddress,
//   populateUsersAndSuppliers,
// } = require("./utils/populateUsers");
// const populateProductImages = require("./utils/populateProductImage");

dotenv.config();

const app = express();

// Middlewares
// const corsOptions = {
//   origin: "http://localhost:5173", // Frontend origin
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true, // Include this to allow cookies if needed
// };

// app.use(cors(corsOptions));

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

//routes
app.use("/api/test", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/nlp", nlpRoutes);

const PORT = process.env.PORT || 8080;

(async () => {
  try {
    const res = await db.query("SELECT NOW()");
    console.log("Database connected successfully", res.rows[0].now);
  } catch (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }
})();

// populateUsersAndSuppliers();
// updateSuppliersWithAddress();
// populateProductsTable();
// populateProductImages();

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
