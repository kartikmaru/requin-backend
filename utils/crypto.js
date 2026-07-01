const Cryptr = require("cryptr");

const cryptr = new Cryptr(process.env.CRYPTR_SECRET || "fallback_dev_key_change_in_prod");

const encrypt = (plainText) => {
  if (!plainText) return plainText;
  return cryptr.encrypt(String(plainText));
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  try {
    return cryptr.decrypt(encryptedText);
  } catch (err) {
    console.error("Decryption failed:", err.message);
    return null;
  }
};

module.exports = { encrypt, decrypt };
