# 📁 flxdb  
<p align="left">
  <a href="https://www.npmjs.com/package/flxdb">
    <img src="https://img.shields.io/npm/v/flxdb?color=%2300c853&style=for-the-badge" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/flxdb">
    <img src="https://img.shields.io/npm/dm/flxdb?color=%230098ee&style=for-the-badge" alt="npm downloads" />
  </a>
  <a href="https://github.com/lewiradev/flxdb">
    <img src="https://img.shields.io/github/stars/lewiradev/flxdb?color=%23ffca28&style=for-the-badge" alt="stars" />
  </a>
  <a href="https://github.com/lewiradev/flxdb/issues">
    <img src="https://img.shields.io/github/issues/lewiradev/flxdb?color=%23e57373&style=for-the-badge" alt="issues" />
  </a>
  <a href="https://github.com/lewiradev/flxdb/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/flxdb?color=%23796eff&style=for-the-badge" alt="license" />
  </a>
</p>

**flxdb** is a lightweight, fast, file‑based **key‑value (KV) database** designed for modern Node.js applications.

✔ Zero‑configuration  
✔ Persistent JSON storage  
✔ Dot‑notation key paths  
✔ Extremely lightweight  
✔ Synchronous & stable  
✔ Single ready‑to‑use instance  

---

## 🆕 Update (v1.1.0)

> This version is fully backward‑compatible. Your existing `set/get` API continues to work, while powerful new features have been added.

### ✨ New Features

- **Namespaces** — Create isolated data areas using `db.namespace("guilds")`.
- **TTL (Time‑To‑Live) & Auto‑Expire** — Add expiring keys with `db.set("cache.token", "abc", { ttl: 5000 })`.
- **JSON Schema Validation** — Use safe typed data with `db.registerSchema(...)` + `db.set("user.1", data, { schema: "userProfile" })`.

### 🔄 Unchanged

- Existing `db.set("key", value)` and `db.set({ ... })` behavior remains the same.
- Storage format is still JSON, file‑based, synchronous.
- All helper methods (`add`, `push`, `all`, `startsWith`, etc.) work exactly the same.

---

## 📦 Installation

```bash
npm install flxdb
```

---

## 🚀 Quick Example

```js
const db = require("flxdb");

db.set("user.name", "Lewira");
db.add("system.uptime", 1);

console.log(db.get("user.name"));  // "Lewira"
console.log(db.all());             // full database object
```

---

## 🔧 Features

- Intuitive key‑value API  
- Automatic persistent JSON storage  
- Dot‑notation deep operations  
- Array & number helpers  
- Object merge with `set(object)`  
- Flattened key listing, prefix scanning  
- Fully synchronous for reliability  
- **Namespaces** for isolated data areas (`db.namespace("guilds")`)  
- **TTL & auto‑expire** support (`{ ttl: ms }`)  
- **JSON Schema Validation** (`registerSchema` + `set(..., { schema })`)  

---

## 🧩 API Reference

### ⭐ Core Methods

#### `set(key, value, options?)`

```js
// Basic usage (unchanged)
db.set("app.theme", "dark");
db.set("user.profile.age", 24);

// With TTL (ms)
db.set("cache.token", "abc123", { ttl: 5_000 }); // 5 seconds

// With Schema validation
db.registerSchema("userProfile", {
  type: "object",
  required: ["id", "xp"],
  props: {
    id: { type: "string" },
    xp: { type: "number" },
    premium: { type: "boolean" },
  },
});

db.set("users.1", { id: "1", xp: 100, premium: false }, { schema: "userProfile" });
```

#### `set(object)`

```js
db.set({
  app: { version: "1.0.0" },
  cache: { enabled: true }
});
```

#### `get(key, defaultValue?)`

```js
const version = db.get("app.version", "0.0.0");
```

> Note: If a key expired due to TTL, `get` returns the default value.

#### `fetch(key)`
Alias of `get()`.

#### `has(key)`

```js
db.has("cache.enabled");
```

#### `ensure(key, defaultValue)`

```js
const port = db.ensure("server.port", 8080);
```

#### `delete(key)`

```js
db.delete("user.session");
```

#### `deleteAll()`
Clears the entire database.

---

### 🔢 Numeric Operations

#### `add(key, amount)`
```js
db.add("metrics.requests", 1);
```

#### `subtract(key, amount)`
```js
db.subtract("metrics.tasks", 2);
```

---

### 🧺 Array Operations

#### `push(key, value)`
```js
db.push("logs", { type: "start", at: Date.now() });
```

#### `pull(key, value)`
```js
db.pull("tags", "deprecated");
```

---

### 📚 Data & Key Listing

#### `all()`
```js
const snapshot = db.all();
```

#### `allArray()`
```js
const entries = db.allArray();
```

#### `keys(prefix?)`
```js
db.keys();
db.keys("user.");
```

#### `startsWith(prefix)`
```js
db.startsWith("cache.");
```

---

### 🧪 Type Checking

#### `type(key)`
```js
db.type("user.profile");
```

---

## 🧱 Namespaces

Namespaces allow you to organize data into **logical sections** inside the same database file.

```js
const db = require("flxdb");

const guilds = db.namespace("guilds");
const users  = db.namespace("users");

guilds.set("123.premium", true);
guilds.set("123.settings.prefix", "!");
users.set("456.profile", { xp: 100, level: 3 });

console.log(guilds.get("123.premium"));        // true
console.log(users.get("456.profile.level"));   // 3

console.log(guilds.all());
console.log(guilds.keys());
console.log(guilds.allArray());
```

> Internally, `guilds.set("123.premium", true)` becomes `db.set("guilds.123.premium", true)`.

---

## ⏱ TTL (Time‑To‑Live) & Auto‑Expire

TTL allows you to create **automatically expiring keys**.

```js
db.set("cache.token", "abc123", { ttl: 5_000 });

setTimeout(() => {
  console.log(db.get("cache.token", null)); // null after 5s
}, 6000);
```

Behavior:

- After expiration:
  - `get(key)` → default value  
  - `has(key)` → false  
- Key is automatically removed  
- TTL metadata is kept only **in memory**, never written to JSON

---

## 📏 JSON Schema Validation

A lightweight but effective validation system.

```js
db.registerSchema("userProfile", {
  type: "object",
  required: ["id", "xp"],
  props: {
    id: { type: "string" },
    xp: { type: "number" },
    premium: { type: "boolean" },
  },
});

// Valid
db.set("users.1", { id: "1", xp: 100, premium: false }, {
  schema: "userProfile",
});

// Invalid → throws error
db.set("users.2", { id: "2", xp: "abc" }, {
  schema: "userProfile",
});
```

Perfect for:

- Bot data (profiles, guild settings)
- Configuration structures
- Metrics requiring strong types

---

## 🗄 Storage Behavior

- All data stored in `flxdb/flxdb.json`  
- Writes are fully persistent  
- Dot‑notation deeply nested structure  
- Deep object merge on `set(object)`  
- TTL metadata stored in memory only  
- Namespaces work via key prefixes  

---

## 🛠 Suitable For

- App configuration  
- CLI tool persistence  
- Local JSON storage  
- Lightweight caching  
- Metrics & counters  
- Discord bot data (guild/user/settings)  
- Small & medium Node.js apps needing a simple KV DB  

---

## 🧪 Example: Structured Config

```js
db.set({
  server: { port: 3000, secure: false },
  app: { mode: "production", version: "1.2.0" }
});

const port = db.get("server.port");
const mode = db.get("app.mode");
```

---

## ⭐ Support

If you like the project, feel free to leave a ⭐!  
Contributions and suggestions are always welcome.

---

## 📄 License

MIT License
