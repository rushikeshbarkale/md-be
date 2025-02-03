const axios = require("axios");
const dotenv = require("dotenv");
const db = require("../config/db");
dotenv.config();

const UNSPLASH_API_URL = "https://api.unsplash.com/search/photos";
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_API_KEY;

const medicalCategories = [
  "Neonatology",
  "Cardiology Equipment",
  "Ultrasound Equipment",
  "Dental Equipment",
  "Dental Lab Equipment",
  "Emt training",
  "Endoscopy Equipment",
  "ENT Equipment",
  "Healthcare IT, Telemedicine",
  "Operating room",
  "Hospital Equipment",
  "Imaging",
  "Laboratory Equipment",
  "Medical Consumable Supplies",
  "Medical Software and Healthcare IT",
  "Mobile Clinics",
  "Neurology Equipment",
  "OB GYN Equipment",
  "Ophthalmic Equipment",
  "Pediatric equipment",
  "Physiotherapy Equipment",
  "Sterilising Equipment",
  "Surgery Equipment",
  "Urology equipment",
  "Veterinary Equipment",
  "Wellness or Fitness Devices",
];

// Function to get image URL from Unsplash
const fetchImageUrl = async (query) => {
  try {
    const response = await axios.get(UNSPLASH_API_URL, {
      params: {
        query: query,
        client_id: UNSPLASH_ACCESS_KEY,
        per_page: 1, // Only get one image for simplicity
      },
    });

    // Get the image URL if available
    if (response.data.results.length > 0) {
      return response.data.results[0].urls.regular;
    } else {
      console.log(`No image found for ${query}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching image from Unsplash:", error);
    return null;
  }
};

const populateProductImages = async () => {
  try {
    // Loop through all the medical categories
    for (let categoryName of medicalCategories) {
      // Fetch the image URL for this category
      const imageUrl = await fetchImageUrl(categoryName);

      // If an image was found, update all products in this category
      if (imageUrl) {
        const query = `
          UPDATE productsnew
          SET image_url = $1
          WHERE category_id IN (SELECT id FROM categories WHERE name = $2)
          AND image_url IS NULL;  -- Only update products without an image
        `;

        // Perform the update query for this category
        await db.query(query, [imageUrl, categoryName]);

        console.log(`Updated products for category: ${categoryName}`);
      } else {
        console.log(`No image found for category: ${categoryName}`);
      }
    }

    console.log("All product images have been updated.");
  } catch (error) {
    console.error("Error populating product images:", error);
  }
};

module.exports = populateProductImages;
