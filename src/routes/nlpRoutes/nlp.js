const express = require("express");
const {
  trainNlpModel,
  queryNlpModel,
  processQuery,
  testPython,
  testDocker,
} = require("../../controllers/products/nlpSearch");

const router = express.Router();

// Route to train the model
router.post("/train", trainNlpModel);

// Route to query the model
router.post("/query", queryNlpModel);

//python nlp service
router.post("/processquery", processQuery);

router.get("/python", testPython);
router.get("/docker", testDocker);

module.exports = router;
