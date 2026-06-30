/**
 * cryptoUsageExample.js — Ye file sirf samjhane ke liye hai, run nahi karni
 *
 * Real scenario: Agar Order model mein ek "shippingAddress" field add karni ho
 * jo sensitive hai (ghar ka address), toh hum use encrypt karke MongoDB mein save karenge
 * aur read karte time decrypt karenge.
 *
 * STEP 1 — Controller mein save karte waqt encrypt karo:
 *
 *   const { encrypt } = require("../utils/crypto");
 *
 *   const order = await Order.create({
 *     user: req.user._id,
 *     product,
 *     category,
 *     amount,
 *     shippingAddress: encrypt(shippingAddress),  // ← encrypted store hoga
 *   });
 *
 * STEP 2 — Controller mein read karte waqt decrypt karo:
 *
 *   const { decrypt } = require("../utils/crypto");
 *
 *   const orders = await Order.find({ user: req.user._id });
 *   const ordersWithAddress = orders.map((o) => ({
 *     ...o.toObject(),
 *     shippingAddress: decrypt(o.shippingAddress),  // ← plain text milega
 *   }));
 *
 * MONGODB MEIN KAISA DIKHEGA:
 *   { shippingAddress: "2709e7ccf87038797d7ca406..." }  ← hacker ko kuch nahi milega
 *
 * APP MEIN KAISA MILEGA:
 *   { shippingAddress: "123 Main St, Delhi - 110001" }  ← user ko sahi address milega
 */
