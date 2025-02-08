const express = require("express");
const router = express.Router();
const Category = require("../models/zakazStoreModel/auchancategoryModel");
const axios = require("axios");
// const axiosRetry = require("axios-retry");

// // Retry on network errors and 5xx responses
// axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

// const delay = (interval) =>
//   new Promise((resolve) => setTimeout(resolve, interval));

const fetchData = async () => {
  try {
    const response = await axios.get(
      "https://stores-api.zakaz.ua/stores/48246401/categories/"
    );
    const data = response.data;
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
};

const saveDataToMongoDB = async (data, parentId = null) => {  
    try {  
    if (!Array.isArray(data)) {  
    throw new Error("Data is not an array");  
    }
    
    for (const item of data) {  
    if (!item.id) {  
    console.error("ID is required");  
    continue;  
    }
    
    if (!item.title) {  
    console.error("Title is required");  
    continue;  
    }
    
    if (!item.count) {  
    console.error("Count is required");  
    continue;  
    }
    
    if (parentId) {  
    item.parent_id = parentId;  
    }
    
    let childrenIds = [];  
    if (item.children && item.children.length > 0) {  
    const children = await saveDataToMongoDB(item.children, item.id);  
    childrenIds = children.map((child) => child.id);  
    }
    
    item.children = childrenIds;
    
    const existingCategory = await Category.findOne({ id: item.id });  
    if (existingCategory) {  
    console.warn(`Skipping existing category with ID: ${item.id}`);  
    continue;  
    }
    
    const newCategory = new Category({  
    id: item.id,  
    title: item.title,  
    count: item.count,  
    description: item.description,  
    image_url: item.image_url,  
    excisable: item.excisable,  
    is_popular: item.is_popular,  
    is_collection: item.is_collection,  
    parent_id: item.parent_id,  
    children: item.children  
    });
    
    await newCategory.save();
    
    const savedCategory = await Category.findOne({ id: item.id });  
    if (JSON.stringify(savedCategory) !== JSON.stringify(newCategory)) {  
    console.error(  
    `Saved data does not match source data for item with ID: ${item.id}`  
    );  
    }  
    }
    
    return data;  
    } catch (error) {  
    throw new Error(`Error saving data to MongoDB: ${error}`);  
    }  
    };  
// const fetchProductData = async (url) => {
//   try {
//     const response = await axios.get(url, {
//       headers: { "accept-language": "ru-RU,ru;q=0.9" },
//     });
//     const data = response.data.results;
//     return data;
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     throw error;
//   }
// };

// const saveProductDataToMongoDB = async (data) => {
//   try {
//     if (!Array.isArray(data)) {
//       throw new Error("Data is not an array");
//     }

//     for (const item of data) {
//       const existingProduct = await Products.findOne({
//         sku: item.sku,
//         ean: item.ean,
//         title: item.title,
//       });
//       if (existingProduct) {
//         let fieldsToUpdate = {};
//         if (
//           JSON.stringify(existingProduct.price) !== JSON.stringify(item.price)
//         ) {
//           fieldsToUpdate.price = item.price;
//         }
//         if (
//           JSON.stringify(existingProduct.price_wholesale) !==
//           JSON.stringify(item.price_wholesale)
//         ) {
//           fieldsToUpdate.price_wholesale = item.price_wholesale;
//         }
//         if (
//           JSON.stringify(existingProduct.discount) !==
//           JSON.stringify(item.discount)
//         ) {
//           fieldsToUpdate.discount = item.discount;
//         }
//         if (
//           JSON.stringify(existingProduct.restrictions) !==
//           JSON.stringify(item.restrictions)
//         ) {
//           fieldsToUpdate.restrictions = item.restrictions;
//         }

//         if (Object.keys(fieldsToUpdate).length > 0) {
//           await Products.updateOne(
//             { sku: item.sku, ean: item.ean, title: item.title },
//             {
//               $set: fieldsToUpdate,
//             }
//           );
//         }
//         continue;
//       }

//       const newProduct = new Products(item);
//       await newProduct.save();

//       const savedProduct = await Products.findOne({ sku: item.sku });
//       if (savedProduct.sku !== item.sku || savedProduct.ean !== item.ean) {
//         console.error(
//           `Saved data does not match source data for item with SKU: ${item.sku}`
//         );
//       }
//     }

//     return data;
//   } catch (error) {
//     throw new Error(`Error saving data to MongoDB: ${error}`);
//   }
// };
// Fetch and save data function declarations...

/**
 * @swagger
 * /api/auchan/fetch-category:
 *   get:
 *     tags:
 *     - AuchanCategory
 *     summary: Fetch categories from AuchanCategory
 *     responses:
 *       200:
 *         description: Successfully fetched categories
 *       500:
 *         description: Failed to fetch categories
 */
const auchanCategoryCtrl = async (req, res) => {
  try {
    const data = await fetchData();
    await saveDataToMongoDB(data);
    res.status(200).json({ message: "Data fetched and saved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// const fetchAndUpdateLowPriceProduct = async (req, res) => {
//   try {
//     const products = await Products.find({ category_id: "low-price-auchan" });

//     if (!products || products.length === 0) {
//       res
//         .status(404)
//         .json({ message: "No product found in low-price-auchan category" });
//       return;
//     }

//     for (let product of products) {
//       const url = `https://stores-api.zakaz.ua/stores/48246401/products/${product.ean}`;
//       const response = await axios.get(url, {
//         headers: { "accept-language": "ru-RU,ru;q=0.9" },
//       });
//       const data = response.data;

//       await Products.updateOne({ ean: product.ean }, { $set: data });
//     }

//     res.status(200).json({
//       message: "All low-price products data fetched and updated successfully",
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

// const fetchSingleProductAndUpdate = async (req, res) => {
//   try {
//     const ean = req.params.ean;
//     const url = `https://stores-api.zakaz.ua/stores/48246401/products/${ean}`;
//     const response = await axios.get(url, {
//       headers: { "accept-language": "ru-RU,ru;q=0.9" },
//     });
//     const item = response.data;

//     let fieldsToUpdate = {};
//     if (item.price) {
//       fieldsToUpdate.price = item.price;
//     }
//     if (item.price_wholesale) {
//       fieldsToUpdate.price_wholesale = item.price_wholesale;
//     }
//     if (item.discount) {
//       fieldsToUpdate.discount = item.discount;
//     }
//     if (item.restrictions) {
//       fieldsToUpdate.restrictions = item.restrictions;
//     }

//     if (Object.keys(fieldsToUpdate).length > 0) {
//       await Products.updateOne({ ean: ean }, { $set: fieldsToUpdate });
//       res.status(200).json({
//         message: `The ${item.title} product prices were updated successfully`,
//       });
//     } else {
//       res
//         .status(404)
//         .json({ message: "No product found or no update required" });
//     }
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
/**
 * @swagger
 * /api/auchan/fetch-products:
 *   get:
 *     tags:
 *     - AuchanProduct
 *     summary: Fetch products from AuchanProduct
 *     responses:
 *       200:
 *         description: Successfully fetched products
 *       500:
 *         description: Failed to fetch products
 */
// const auchanProductCtrl = async (req, res) => {
//   try {
//     const categories = await Category.find({});
//     for (const category of categories) {
//       const urlPartA = `https://stores-api.zakaz.ua/stores/48246401/categories/${category.id}/products/`;
//       const response = await axios.get(urlPartA, {
//         headers: { "accept-language": "ru-RU,ru;q=0.9" },
//       });
//       const pagesAmount = Math.ceil(response.data.count / 30);
//       const urlPartB = "?page=";
//       for (
//         let processedPages = 1;
//         processedPages <= pagesAmount;
//         processedPages++
//       ) {
//         const urlAandB = urlPartA + urlPartB + processedPages;
//         const productData = await fetchProductData(urlAandB);
//         await saveProductDataToMongoDB(productData);
//         await delay(400);
//       }
//     }
//     res
//       .status(200)
//       .json({ message: "Product data fetched and saved successfully" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

router.get("/fetch-category", auchanCategoryCtrl);
// router.get("/fetch-low-price", fetchAndUpdateLowPriceProduct);
// router.get("/fetch-single-product/:ean", fetchSingleProductAndUpdate);

module.exports = router;