// index.js — flxdb core (instance-based export with set(object) support + Discord bot helper methods)

const fs = require("fs");
const path = require("path");

class FlxDBCore {
  /**
   * @param {Object} options
   * @param {string} [options.filePath] JSON dosya yolu (default: ./flxdb/flxdb.json)
   * @param {boolean} [options.autosave] Her değişimde otomatik kaydet (default: true)
   * @param {number|null} [options.indent] JSON pretty print boşluk sayısı (default: 2, null = minify)
   */
  constructor(options = {}) {
    // 🔹 Default: ./flxdb/flxdb.json
    this.filePath =
      options.filePath ||
      path.resolve(process.cwd(), "flxdb", "flxdb.json");

    this.autosave = options.autosave !== false;
    this.indent = options.indent === undefined ? 2 : options.indent;

    this.data = {};

    this._ensureDirExists();
    this._load();
  }

  // ----------------------
  // Internal helpers
  // ----------------------

  _ensureDirExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        if (raw.trim().length > 0) {
          this.data = JSON.parse(raw);
        } else {
          this.data = {};
        }
      } else {
        this.data = {};
        this._save(); // ilk dosyayı oluştur
      }
    } catch (err) {
      console.error("[flxdb] Failed to load database:", err);
      this.data = {};
    }
  }

  _save() {
    if (!this.autosave) return;

    try {
      const json =
        this.indent === null
          ? JSON.stringify(this.data)
          : JSON.stringify(this.data, null, this.indent);

      fs.writeFileSync(this.filePath, json, "utf8");
    } catch (err) {
      console.error("[flxdb] Failed to save database:", err);
    }
  }

  _splitKey(key) {
    if (typeof key !== "string") {
      throw new TypeError("[flxdb] Key must be a string");
    }
    return key.split(".").filter(Boolean);
  }

  _getRef(key, createMissing = false) {
    const parts = this._splitKey(key);
    let obj = this.data;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (obj[p] === undefined) {
        if (!createMissing) return { parent: null, last: null };
        obj[p] = {};
      }
      if (typeof obj[p] !== "object" || obj[p] === null || Array.isArray(obj[p])) {
        if (!createMissing) return { parent: null, last: null };
        obj[p] = {};
      }
      obj = obj[p];
    }

    const last = parts[parts.length - 1];
    return { parent: obj, last };
  }

  // Derin merge helper (db.set({ ... }) için)
  _deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;

    for (const key of Object.keys(source)) {
      const value = source[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) {
          target[key] = {};
        }
        this._deepMerge(target[key], value);
      } else {
        target[key] = value;
      }
    }

    return target;
  }

  // Flat key helper: { a: { b: 1 }, c: 2 } -> [{ key: "a.b", value: 1 }, { key: "c", value: 2 }]
  _flatten(obj, prefix = "", out = []) {
    if (!obj || typeof obj !== "object") return out;

    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        this._flatten(v, fullKey, out);
      } else {
        out.push({ key: fullKey, value: v });
      }
    }
    return out;
  }

  // ----------------------
  // Public API
  // ----------------------

  /**
   * Set a value.
   *
   * 1) String key modu:
   *    db.set("user.name", "Aris");
   *
   * 2) Object merge modu:
   *    db.set({ user: { name: "Aris" }, config: { prefix: "!" } });
   */
  set(key, value) {
    // ✅ Object modu: db.set({ ... })
    if (typeof key === "object" && key !== null) {
      this._deepMerge(this.data, key);
      this._save();
      return key;
    }

    // ✅ String key modu: db.set("user.name", "Aris")
    const { parent, last } = this._getRef(key, true);
    parent[last] = value;
    this._save();
    return value;
  }

  /**
   * Get value at the given key, or defaultValue if not exists.
   * @example db.get("user.name", "Unknown");
   */
  get(key, defaultValue = null) {
    const parts = this._splitKey(key);
    let obj = this.data;

    for (const p of parts) {
      if (obj == null || typeof obj !== "object") {
        return defaultValue;
      }
      if (!(p in obj)) return defaultValue;
      obj = obj[p];
    }

    return obj === undefined ? defaultValue : obj;
  }

  /**
   * Alias of get()
   * @example db.fetch("user.name");
   */
  fetch(key, defaultValue = null) {
    return this.get(key, defaultValue);
  }

  /**
   * Check if a key exists.
   * @example db.has("user.name");
   */
  has(key) {
    const parts = this._splitKey(key);
    let obj = this.data;

    for (const p of parts) {
      if (obj == null || typeof obj !== "object") return false;
      if (!(p in obj)) return false;
      obj = obj[p];
    }

    return true;
  }

  /**
   * Ensure a key has a value. If not exists, set default.
   * @example db.ensure("config.prefix", "!");
   */
  ensure(key, defaultValue) {
    if (!this.has(key)) {
      this.set(key, defaultValue);
      return defaultValue;
    }
    return this.get(key);
  }

  /**
   * Delete a key.
   * @example db.delete("user.name");
   */
  delete(key) {
    const { parent, last } = this._getRef(key, false);
    if (!parent || !(last in parent)) return false;
    delete parent[last];
    this._save();
    return true;
  }

  /**
   * Alias of clear()
   */
  deleteAll() {
    return this.clear();
  }

  /**
   * Add a number to current value (or start from 0 if not exists).
   * @example db.add("stats.messages", 1);
   */
  add(key, amount = 1) {
    const current = this.get(key, 0);
    const n = Number(current) || 0;
    const a = Number(amount) || 0;
    const result = n + a;
    this.set(key, result);
    return result;
  }

  /**
   * Subtract a number from current value.
   * @example db.subtract("stats.messages", 1);
   */
  subtract(key, amount = 1) {
    const a = Number(amount) || 0;
    return this.add(key, -a);
  }

  /**
   * Push a value to an array at key. If not array, it will be turned into one.
   * @example db.push("logs", { action: "login" });
   */
  push(key, value) {
    const current = this.get(key);
    let arr;

    if (Array.isArray(current)) {
      arr = current;
    } else if (current === undefined || current === null) {
      arr = [];
    } else {
      // mevcut değer array değilse, onu array'e çevirip içine at
      arr = [current];
    }

    arr.push(value);
    this.set(key, arr);
    return arr;
  }

  /**
   * Pull/remove values from an array at key.
   * @example db.pull("users", "123"); // value eşleşmesine göre
   */
  pull(key, value) {
    const current = this.get(key);
    if (!Array.isArray(current)) return [];

    const filtered = current.filter((v) => v !== value);
    this.set(key, filtered);
    return filtered;
  }

  /**
   * Get a deep clone of all data as plain object.
   * @example const all = db.all();
   */
  all() {
    // Deep clone, direkt kod içinde kullanılabilir
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Get all entries as [{ key, value }, ...]
   * @example const list = db.allArray();
   */
  allArray() {
    return this._flatten(this.data, "", []);
  }

  /**
   * Get keys. If prefix is provided, returns keys starting with prefix.
   * @example db.keys(); // ["user.name", "config.prefix", ...]
   * @example db.keys("user."); // ["user.name", "user.id", ...]
   */
  keys(prefix) {
    const entries = this._flatten(this.data, "", []);
    if (typeof prefix === "string" && prefix.length > 0) {
      return entries
        .filter((e) => e.key.startsWith(prefix))
        .map((e) => e.key);
    }
    return entries.map((e) => e.key);
  }

  /**
   * Quick.db style startsWith helper.
   * Returns [{ key, value }, ...] where key starts with prefix.
   * @example db.startsWith("user.");
   */
  startsWith(prefix) {
    const entries = this._flatten(this.data, "", []);
    return entries.filter((e) => e.key.startsWith(String(prefix)));
  }

  /**
   * Get the type of stored value at key.
   * @example db.type("user.profile"); // "object", "array", "number", ...
   */
  type(key) {
    const val = this.get(key, undefined);
    if (val === undefined) return "undefined";
    if (val === null) return "null";
    if (Array.isArray(val)) return "array";
    return typeof val; // "string", "number", "boolean", "object", "function", ...
  }

  /**
   * Clear all data.
   */
  clear() {
    this.data = {};
    this._save();
  }
}

// 🚀 Export → Direct instance
module.exports = new FlxDBCore();
