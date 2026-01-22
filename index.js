// index.js — flxdb core (instance-based export with set(object) support
// + Namespaces + TTL (Time-To-Live) + JSON Schema Validation

const fs = require("fs");
const path = require("path");

/**
 * Namespace wrapper (db.namespace("x") → x.something)
 */
class FlxDBNamespace {
  constructor(core, namespace) {
    this.core = core;
    this.namespace = String(namespace).trim();
    if (!this.namespace) {
      throw new TypeError("[flxdb] Namespace name must be a non-empty string");
    }
  }

  _k(key) {
    if (typeof key !== "string" || !key.length) {
      throw new TypeError("[flxdb] Namespace key must be a non-empty string");
    }
    return `${this.namespace}.${key}`;
  }

  set(key, value, options) {
    return this.core.set(this._k(key), value, options);
  }

  get(key, defaultValue = null) {
    return this.core.get(this._k(key), defaultValue);
  }

  fetch(key, defaultValue = null) {
    return this.get(key, defaultValue);
  }

  has(key) {
    return this.core.has(this._k(key));
  }

  ensure(key, defaultValue) {
    return this.core.ensure(this._k(key), defaultValue);
  }

  delete(key) {
    return this.core.delete(this._k(key));
  }

  add(key, amount = 1) {
    return this.core.add(this._k(key), amount);
  }

  subtract(key, amount = 1) {
    return this.core.subtract(this._k(key), amount);
  }

  push(key, value) {
    return this.core.push(this._k(key), value);
  }

  pull(key, value) {
    return this.core.pull(this._k(key), value);
  }

  type(key) {
    return this.core.type(this._k(key));
  }

  /**
   * Bu namespace altındaki tüm kayıtlar:
   * returns: [{ key: "inner.key", value }, ...]
   */
  allArray() {
    const prefix = `${this.namespace}.`;
    return this.core
      .startsWith(prefix)
      .map((e) => ({
        key: e.key.slice(prefix.length),
        value: e.value,
      }));
  }

  /**
   * Bu namespace altındaki kayıtları nested object olarak döndürür.
   */
  all() {
    const result = {};
    for (const { key, value } of this.allArray()) {
      const parts = key.split(".").filter(Boolean);
      let obj = result;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!obj[p] || typeof obj[p] !== "object" || Array.isArray(obj[p])) {
          obj[p] = {};
        }
        obj = obj[p];
      }
      obj[parts[parts.length - 1]] = value;
    }
    return result;
  }

  /**
   * Bu namespace altındaki tüm key'ler (inner key formatında: "x.y").
   */
  keys(prefix) {
    const basePrefix = `${this.namespace}.`;
    const fullPrefix =
      typeof prefix === "string" && prefix.length > 0
        ? basePrefix + prefix
        : basePrefix;

    return this.core
      .keys(fullPrefix)
      .map((k) => k.slice(basePrefix.length));
  }
}

class FlxDBCore {
  /**
   * @param {Object} options
   * @param {string} [options.filePath] JSON dosya yolu (default: ./flxdb/flxdb.json)
   * @param {boolean} [options.autosave] Her değişimde otomatik kaydet (default: true)
   * @param {number|null} [options.indent] JSON pretty print boşluk sayısı (default: 2, null = minify)
   * @param {number} [options.ttlIntervalMs] TTL temizleme intervali (default: 60_000 ms)
   */
  constructor(options = {}) {
    // 🔹 Default: ./flxdb/flxdb.json
    this.filePath =
      options.filePath ||
      path.resolve(process.cwd(), "flxdb", "flxdb.json");

    this.autosave = options.autosave !== false;
    this.indent = options.indent === undefined ? 2 : options.indent;

    /** Ana veri objesi */
    this.data = {};

    /**
     * TTL & Schema meta bilgisi:
     * { [fullKey: string]: { expiresAt: number|null, schema: string|null } }
     * Not: disk'e yazılmıyor, runtime meta
     */
    this.meta = {};

    /**
     * Kayıtlı JSON schema definisyonları:
     * { [name: string]: any }
     */
    this.schemas = {};

    this.ttlIntervalMs =
      typeof options.ttlIntervalMs === "number" && options.ttlIntervalMs > 0
        ? options.ttlIntervalMs
        : 60_000;

    this._ensureDirExists();
    this._load();
    this._startTTLWatcher();
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
      if (
        typeof obj[p] !== "object" ||
        obj[p] === null ||
        Array.isArray(obj[p])
      ) {
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
        if (
          !target[key] ||
          typeof target[key] !== "object" ||
          Array.isArray(target[key])
        ) {
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
  // TTL & Schema helpers
  // ----------------------

  _cleanupExpired() {
    const now = Date.now();
    let changed = false;

    for (const [key, meta] of Object.entries(this.meta)) {
      if (meta.expiresAt && meta.expiresAt <= now) {
        const { parent, last } = this._getRef(key, false);
        if (parent && last in parent) {
          delete parent[last];
          changed = true;
        }
        delete this.meta[key];
      }
    }

    if (changed) {
      this._save();
    }
  }

  _startTTLWatcher() {
    if (!this.ttlIntervalMs) return;
    const timer = setInterval(() => {
      try {
        this._cleanupExpired();
      } catch (err) {
        console.error("[flxdb] TTL cleanup error:", err);
      }
    }, this.ttlIntervalMs);

    // Node'da process'in kapanmasını engellemesin
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this._ttlTimer = timer;
  }

  _checkExpiredSingle(key) {
    const meta = this.meta[key];
    if (!meta || !meta.expiresAt) return false;
    if (meta.expiresAt > Date.now()) return false;

    // Süresi dolmuş
    const { parent, last } = this._getRef(key, false);
    if (parent && last in parent) {
      delete parent[last];
      this._save();
    }
    delete this.meta[key];
    return true;
  }

  _validateWithSchema(schemaName, value) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      throw new Error(`[flxdb] Schema "${schemaName}" not found.`);
    }

    // Basit, lightweight validator (istersen ajv vs ile upgrade edersin)
    if (schema.type && typeof value !== schema.type) {
      throw new Error(
        `[flxdb] Schema "${schemaName}": expected type "${schema.type}", got "${typeof value}".`
      );
    }

    if (schema.type === "object") {
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (
            !Object.prototype.hasOwnProperty.call(value, field) ||
            typeof value[field] === "undefined"
          ) {
            throw new Error(
              `[flxdb] Schema "${schemaName}": "${field}" is required.`
            );
          }
        }
      }

      if (schema.props && typeof schema.props === "object") {
        for (const [field, rules] of Object.entries(schema.props)) {
          if (typeof value[field] === "undefined") continue;
          if (rules.type && typeof value[field] !== rules.type) {
            throw new Error(
              `[flxdb] Schema "${schemaName}": "${field}" must be "${rules.type}", got "${typeof value[field]}".`
            );
          }
        }
      }
    }
  }

  // ----------------------
  // Public API
  // ----------------------

  /**
   * Namespace oluşturur.
   * @example const guilds = db.namespace("guilds");
   * guilds.set("123.premium", true);
   */
  namespace(name) {
    return new FlxDBNamespace(this, name);
  }

  /**
   * JSON Schema kaydet.
   * @example
   * db.registerSchema("userProfile", {
   *   type: "object",
   *   required: ["id", "xp"],
   *   props: {
   *     id: { type: "string" },
   *     xp: { type: "number" }
   *   }
   * });
   */
  registerSchema(name, schema) {
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError("[flxdb] Schema name must be a non-empty string");
    }
    if (!schema || typeof schema !== "object") {
      throw new TypeError("[flxdb] Schema must be an object");
    }
    this.schemas[name] = schema;
  }

  /**
   * Set a value.
   *
   * 1) Object merge modu:
   *    db.set({ user: { name: "Aris" }, config: { prefix: "!" } });
   *
   * 2) String key modu:
   *    db.set("user.name", "Aris");
   *
   *    Opsiyonel options:
   *    - ttl: ms cinsinden süre
   *    - schema: registerSchema ile kaydedilen schema adı
   *
   *    db.set("user.1", { id: "1", xp: 100 }, { ttl: 60_000, schema: "userProfile" });
   */
  set(key, value, options) {
    // ✅ Object modu: db.set({ ... })
    if (typeof key === "object" && key !== null && value === undefined) {
      this._deepMerge(this.data, key);
      this._save();
      return key;
    }

    // ✅ String key modu: db.set("user.name", "Aris", { ttl, schema })
    const opts = options || {};
    const ttl =
      typeof opts.ttl === "number" && Number.isFinite(opts.ttl) && opts.ttl > 0
        ? opts.ttl
        : null;
    const schemaName =
      typeof opts.schema === "string" && opts.schema.trim().length
        ? opts.schema.trim()
        : null;

    if (schemaName) {
      this._validateWithSchema(schemaName, value);
    }

    const { parent, last } = this._getRef(String(key), true);
    parent[last] = value;

    // Meta güncelle
    if (ttl || schemaName) {
      this.meta[String(key)] = {
        expiresAt: ttl ? Date.now() + ttl : null,
        schema: schemaName,
      };
    } else if (this.meta[String(key)]) {
      // ttl & schema verilmediyse eski meta'yı temizle
      delete this.meta[String(key)];
    }

    this._save();
    return value;
  }

  /**
   * Get value at the given key, or defaultValue if not exists.
   * TTL süresi dolmuşsa önce key silinir, sonra defaultValue döner.
   * @example db.get("user.name", "Unknown");
   */
  get(key, defaultValue = null) {
    const k = String(key);
    if (this._checkExpiredSingle(k)) {
      return defaultValue;
    }

    const parts = this._splitKey(k);
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
   * Check if a key exists (TTL dolduysa false).
   * @example db.has("user.name");
   */
  has(key) {
    const k = String(key);
    if (this._checkExpiredSingle(k)) return false;

    const parts = this._splitKey(k);
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
    const k = String(key);
    const { parent, last } = this._getRef(k, false);
    if (!parent || !(last in parent)) return false;

    delete parent[last];
    if (this.meta[k]) {
      delete this.meta[k];
    }

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
    this._cleanupExpired();
    // Deep clone, direkt kod içinde kullanılabilir
    return JSON.parse(JSON.stringify(this.data));
  }

  /**
   * Get all entries as [{ key, value }, ...]
   * @example const list = db.allArray();
   */
  allArray() {
    this._cleanupExpired();
    return this._flatten(this.data, "", []);
  }

  /**
   * Get keys. If prefix is provided, returns keys starting with prefix.
   * @example db.keys(); // ["user.name", "config.prefix", ...]
   * @example db.keys("user."); // ["user.name", "user.id", ...]
   */
  keys(prefix) {
    this._cleanupExpired();
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
    this._cleanupExpired();
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
    this.meta = {};
    this._save();
  }
}

// 🚀 Export → Direct instance (backwards compatible)
module.exports = new FlxDBCore();