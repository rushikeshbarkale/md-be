const natural = require("natural");
const db = require("../config/db");
const tokenizer = new natural.WordTokenizer();

let trainedData = [];

//* (most accurate without all data from db)v1 Train the NLP Model
// const trainModel = async () => {
//   console.log("Starting model training...");

//   try {
//     // Fetch data from the productsnew table
//     const productQuery = `
//       SELECT name, condition, sales_area, price
//       FROM productsnew;
//     `;
//     const { rows } = await db.query(productQuery);

//     if (!rows.length) {
//       console.log("No data found in productsnew table.");
//       return false;
//     }

//     // Preprocess and prepare training data
//     trainedData = rows.map((row) => ({
//       nameTokens: tokenizer.tokenize(row.name.toLowerCase()),
//       condition: row.condition,
//       salesAreaTokens: tokenizer.tokenize(row.sales_area.toLowerCase()),
//       price: row.price,
//     }));

//     // console.log("Training data prepared:", trainedData);
//     console.log("Model training complete.");
//     return true;
//   } catch (error) {
//     console.error("Error during model training:", error);
//     return false;
//   }
// };

//* (most accurate without all data from db) Get predictions based on user query
// const getPrediction = (queryText) => {
//   if (!trainedData.length) {
//     console.error("Model has not been trained yet.");
//     return null;
//   }

//   // console.log("Processing query:", queryText);
//   const tokens = tokenizer.tokenize(queryText.toLowerCase());
//   // console.log("Tokenized query:", tokens);

//   // Match user query tokens with trained data
//   const matches = trainedData.filter((data) => {
//     const nameMatch = tokens.some((token) => data.nameTokens.includes(token));
//     const locationMatch = tokens.some((token) =>
//       data.salesAreaTokens.includes(token)
//     );
//     return nameMatch || locationMatch;
//   });

//   // console.log("Matches found:", matches);
//   return matches;
// };

const trainModel = async () => {
  console.log("Starting model training...");

  try {
    // Fetch data from the productsnew table, including all necessary fields
    // const productQuery = `
    //   SELECT id, name, brand, model, year, category_id, subcategory_id, condition, sales_area, price
    //   FROM productsnew;
    // `;
    const productQuery = `
      SELECT
        p.id, p.name, p.brand, p.model, p.condition, p.price,
        c1.name AS category_name, c2.name AS subcategory_name,
        p.sales_area, p.year, p.supplier_id, p.description, p.created_at, p.image_url
      FROM
        productsnew p
      LEFT JOIN
        categories c1 ON p.category_id = c1.id
      LEFT JOIN
        categories c2 ON p.subcategory_id = c2.id
    `;
    const { rows } = await db.query(productQuery);

    if (!rows.length) {
      console.log("No data found in productsnew table.");
      return false;
    }

    // Preprocess and prepare training data
    trainedData = rows.map((row) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      year: row.year,
      categoryName: row.category_name,
      subcategoryName: row.subcategory_name,
      description: row.description,
      supplierId: row.supplier_id,
      imageUrl: row.image_url,
      nameTokens: tokenizer.tokenize(row.name.toLowerCase()),
      condition: row.condition,
      salesAreaTokens: tokenizer.tokenize(row.sales_area.toLowerCase()),
      price: row.price,
    }));

    console.log("trained data", trainedData.slice(0, 4));

    console.log("Model training complete.");
    return true;
  } catch (error) {
    console.error("Error during model training:", error);
    return false;
  }
};

// Get predictions based on user query
const getPrediction = (queryText) => {
  if (!trainedData.length) {
    console.error("Model has not been trained yet.");
    return null;
  }

  const tokens = tokenizer.tokenize(queryText.toLowerCase());

  // Match user query tokens with trained data
  const matches = trainedData.filter((data) => {
    const nameMatch = tokens.some((token) => data.nameTokens.includes(token));
    const locationMatch = tokens.some((token) =>
      data.salesAreaTokens.includes(token)
    );
    return nameMatch || locationMatch;
  });

  // Return matched data (including additional details)
  return matches.map((match) => ({
    id: match.id,
    brand: match.brand,
    model: match.model,
    year: match.year,
    categoryName: match.categoryName,
    subcategoryName: match.subcategoryName,
    description: match.description,
    supplierId: match.supplierId,
    imageUrl: match.imageUrl,
    nameTokens: match.nameTokens,
    condition: match.condition,
    salesAreaTokens: match.salesAreaTokens,
    price: match.price,
  }));
};

module.exports = {
  trainModel,
  getPrediction,
};
