const axios = require("axios");
const { trainModel, getPrediction } = require("../../services/nlpService");

const trainNlpModel = async (req, res, next) => {
  try {
    const success = await trainModel();
    if (success) {
      return res
        .status(200)
        .json({ success: true, message: "Model trained successfully." });
    }
    return res
      .status(500)
      .json({ success: false, message: "Model training failed." });
  } catch (error) {
    console.error("Error in trainNlpModel:", error);
    next(error);
  }
};

// Endpoint to query the trained model (with price filter)
const queryNlpModel = async (req, res, next) => {
  const userQuery = req.body.query;
  const page = Math.max(1, parseInt(req.query.page, 10)) || 1;
  const pageSize =
    Math.min(Math.max(1, parseInt(req.query.pageSize, 10)), 100) || 10;

  if (!userQuery) {
    return res.status(400).json({
      success: false,
      message: "Query is required.",
    });
  }

  try {
    console.log("Received user query:", userQuery);

    const predictions = getPrediction(userQuery);
    // console.log("Extracted predictions:", predictions);

    if (!predictions || predictions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matches found.",
      });
    }

    // Extract tokens from user query
    const userQueryTokens = userQuery.toLowerCase().split(" ");

    // Extract price range from query
    const priceRegex =
      /\b(?:below|under|less than|between|and|over|above)\b\s?(\d+)?/g;
    const priceMatches = Array.from(userQuery.matchAll(priceRegex));
    let minPrice = 0;
    let maxPrice = Infinity;

    if (priceMatches.length) {
      priceMatches.forEach((match) => {
        const [phrase, price] = match;
        let numericPrice = parseFloat(price);

        // Handle cases where user includes "$" in the query (e.g., "under $5000")
        if (price && typeof price === "string" && price.includes("$")) {
          numericPrice = parseFloat(price.replace("$", ""));
        }

        if (
          phrase.includes("below") ||
          phrase.includes("under") ||
          phrase.includes("less than")
        ) {
          maxPrice = Math.min(maxPrice, numericPrice);
        } else if (phrase.includes("over") || phrase.includes("above")) {
          minPrice = Math.max(minPrice, numericPrice);
        } else if (
          phrase.includes("between") &&
          match.index + 1 < priceMatches.length
        ) {
          minPrice = Math.max(minPrice, numericPrice);
          const nextPrice = parseFloat(priceMatches[match.index + 1][1]);
          maxPrice = Math.min(maxPrice, nextPrice);
        }
      });
    }

    // Filter predictions based on query tokens dynamically
    const filteredData = predictions.filter((item) => {
      const conditionMatches = item.condition
        ? userQueryTokens.includes(item.condition.toLowerCase())
        : true;

      const salesAreaMatches = item.salesAreaTokens.some((areaToken) =>
        userQueryTokens.includes(areaToken.toLowerCase())
      );

      const nameMatches = item.nameTokens.some((nameToken) =>
        userQueryTokens.includes(nameToken.toLowerCase())
      );

      const priceMatches =
        item.price &&
        parseFloat(item.price) >= minPrice &&
        parseFloat(item.price) <= maxPrice;

      return (
        conditionMatches && salesAreaMatches && nameMatches && priceMatches
      );
    });

    if (filteredData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matches found.",
      });
    }

    // Apply pagination
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = filteredData.slice(
      startIndex,
      startIndex + pageSize
    );

    console.log(
      "Filtered and paginated response data (first 4):",
      paginatedResults.slice(0, 4)
    );

    return res.status(200).json({
      success: true,
      data: paginatedResults.map((item) => ({
        id: item.id,
        nameTokens: item.nameTokens,
        brand: item.brand,
        model: item.model,
        year: item.year,
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName,
        description: item.description,
        supplierId: item.supplierId,
        imageUrl: item.imageUrl,
        condition: item.condition,
        salesArea: item.salesAreaTokens.join(" "),
        price: item.price,
      })),
      totalItems,
      totalPages,
      currentPage: page,
      pageSize,
    });
  } catch (error) {
    console.error("Error in queryNlpModel:", error);
    next(error);
  }
};

// Endpoint to query the nlp service
const processQuery = async (req, res) => {
  const { query, page = 1, items_per_page = 12 } = req.body;

  console.log("Received request in Node backend:", {
    query,
    page,
    items_per_page,
  });

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "Query is required",
    });
  }

  try {
    console.log("Attempting to call Python service...");

    const isLocal = process.env.ENV_TYPE === "local";
    const pythonServiceUrl = isLocal
      ? "http://127.0.0.1:5000/process_query" // Local URL
      : // : "http://python_service:5000/process_query"; // Docker URL
        "https://md-be-python.onrender.com/process_query"; // Render URL

    console.log("current url", pythonServiceUrl);

    // const response = await axios.post(
    //   //for docker use below url
    //   // "http://python_service:5000/process_query",
    //   //for local use below url
    //   "http://127.0.0.1:5000/process_query",
    //   {
    //     query,
    //     page,
    //     items_per_page,
    //   }
    // );

    const response = await axios.post(pythonServiceUrl, {
      query,
      page,
      items_per_page,
    });

    console.log("Received response from Python service:", response.data);

    if (response.data.success) {
      const {
        products,
        total_results,
        total_pages,
        current_page,
        items_per_page: responseItemsPerPage,
      } = response.data;

      return res.status(200).json({
        success: true,
        entities: response.data.entities,
        products,
        total_results,
        total_pages,
        current_page,
        items_per_page: responseItemsPerPage,
        userQuery: response.data.query,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unexpected response format from NLP service",
    });
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    if (error.response) {
      const errorResponse = {
        success: false,
        message:
          error.response.data.error ||
          "An error occurred while processing the query",
      };

      if (error.response.data.entities) {
        errorResponse.entities = error.response.data.entities;
      }

      return res.status(error.response.status).json(errorResponse);
    } else if (error.request) {
      return res.status(503).json({
        success: false,
        message: "NLP service is unavailable",
      });
    } else {
      console.error("Error in processQuery:", error.message);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while processing the request",
      });
    }
  }
};

const testPython = async (req, res) => {
  try {
    const isLocal = process.env.ENV_TYPE === "local";
    const pythonServiceUrl = isLocal
      ? "http://127.0.0.1:5000/python" // Local URL
      : // : "http://python_service:5000/python"; // Docker URL
        "https://md-be-python.onrender.com/python"; // Render URL

    console.log("current url", pythonServiceUrl);

    const response = await axios.get(pythonServiceUrl);

    return res.status(200).json({
      success: true,
      message: response.data.message,
    });
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    if (error.response) {
      const errorResponse = {
        success: false,
        message:
          error.response.data.error ||
          "An error occurred while processing the query",
      };

      if (error.response.data.entities) {
        errorResponse.entities = error.response.data.entities;
      }

      return res.status(error.response.status).json(errorResponse);
    } else if (error.request) {
      return res.status(503).json({
        success: false,
        message: "NLP service is unavailable",
      });
    } else {
      console.error("Error in processQuery:", error.message);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while processing the request",
      });
    }
  }
};

const testDocker = async (req, res) => {
  try {
    const isLocal = process.env.ENV_TYPE === "local";
    const pythonServiceUrl = isLocal
      ? "http://127.0.0.1:5000/docker" // Local URL
      : // : "http://python_service:5000/docker"; // Docker URL
        "https://md-be-python.onrender.com/docker"; // Render URL

    console.log("current url", pythonServiceUrl);

    const response = await axios.get(pythonServiceUrl);

    return res.status(200).json({
      success: true,
      message: response.data.message,
    });
  } catch (error) {
    console.error("Detailed error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    if (error.response) {
      const errorResponse = {
        success: false,
        message:
          error.response.data.error ||
          "An error occurred while processing the query",
      };

      if (error.response.data.entities) {
        errorResponse.entities = error.response.data.entities;
      }

      return res.status(error.response.status).json(errorResponse);
    } else if (error.request) {
      return res.status(503).json({
        success: false,
        message: "NLP service is unavailable",
      });
    } else {
      console.error("Error in processQuery:", error.message);
      return res.status(500).json({
        success: false,
        message: "An unexpected error occurred while processing the request",
      });
    }
  }
};

module.exports = {
  trainNlpModel,
  queryNlpModel,
  processQuery,
  testPython,
  testDocker,
};
