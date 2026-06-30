/**
 * utils/crypto.js — Symmetric Encryption Helper
 *
 * USE THIS FOR: Non-password sensitive data that you need to READ BACK later.
 * Examples: shipping addresses, third-party API keys, user preferences, config values.
 *
 * DO NOT USE THIS FOR: Passwords. Passwords must be hashed (bcrypt), not encrypted.
 *
 * WHY THE DIFFERENCE?
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  bcrypt (Hashing)        │  cryptr (Encryption)                    │
 * │  ───────────────────     │  ──────────────────                     │
 * │  One-way — irreversible  │  Two-way — can decrypt back             │
 * │  Like a paper shredder   │  Like a lock and key                    │
 * │  For: passwords          │  For: data you need to USE later        │
 * │  If DB leaked: safe ✅   │  If KEY leaked: data exposed ⚠️         │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * INTERVIEW ANSWER:
 * "For passwords I used bcrypt — one-way hash, industry standard, irreversible.
 *  For other sensitive fields like shipping address, I used cryptr — symmetric
 *  encryption so the app can decrypt and use the value when needed."
 */

const Cryptr = require("cryptr");

// The encryption key comes from .env — never hardcode it
// Add CRYPTR_SECRET to your .env file
const cryptr = new Cryptr(process.env.CRYPTR_SECRET || "fallback_dev_key_change_in_prod");

/**
 * encrypt — converts a plain string to an encrypted string for DB storage
 * @param {string} plainText — the sensitive value to protect
 * @returns {string} — encrypted string safe to store in MongoDB
 *
 * Example:
 *   encrypt("123 Main St, Delhi")  →  "3a8f2c1d9e..."
 */
const encrypt = (plainText) => {
  if (!plainText) return plainText;
  return cryptr.encrypt(String(plainText));
};

/**
 * decrypt — converts an encrypted DB value back to readable plain text
 * @param {string} encryptedText — the encrypted value from MongoDB
 * @returns {string} — original plain text value
 *
 * Example:
 *   decrypt("3a8f2c1d9e...")  →  "123 Main St, Delhi"
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  try {
    return cryptr.decrypt(encryptedText);
  } catch (err) {
    // If decryption fails (wrong key or corrupted data), return null safely
    console.error("Decryption failed:", err.message);
    return null;
  }
};

module.exports = { encrypt, decrypt };
