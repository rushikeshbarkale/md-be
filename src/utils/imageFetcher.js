const fetch = require("node-fetch");
const dotenv = require("dotenv");

dotenv.config();

// Function to get image URL from Unsplash
const getImageFromUnsplash = async (productName) => {
  try {
    const unsplashAPIKey = process.env.UNSPLASH_API_KEY;
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        productName
      )}&client_id=${unsplashAPIKey}`
    );

    const data = await response.json();

    if (data.results.length > 0) {
      return data.results[0].urls.small; // Return the first image URL (small size)
    } else {
      // If no image found, return a placeholder image
      return "https://via.placeholder.com/300"; // Placeholder image
    }
  } catch (error) {
    console.error("Error fetching image from Unsplash:", error);
    return "https://via.placeholder.com/300"; // Return a placeholder image in case of an error
  }
};

// Controller to handle the API call and return the image URL
const getProductImage = async (req, res, next) => {
  const { productName } = req.params; // Get product name from URL parameter

  if (!productName) {
    return res.status(400).json({
      success: false,
      message: "Product name is required.",
    });
  }

  try {
    const imageUrl = await getImageFromUnsplash(productName);

    return res.status(200).json({
      success: true,
      imageUrl: imageUrl, // Return the image URL
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProductImage };
