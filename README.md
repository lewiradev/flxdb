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

**flxdb**, modern Node.js projeleri için tasarlanmış  
hafif, hızlı ve dosya tabanlı bir **key-value (KV) veritabanıdır**.

✔ Zero‑configuration  
✔ Persistent JSON storage  
✔ Dot‑notation key paths  
✔ Extremely lightweight  
✔ Synchronous & stable  
✔ Single ready‑to‑use instance  

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
- Dot-notation deep operations  
- Array & number helpers  
- Object merge with `set(object)`  
- Flattened key listing, prefix scanning  
- Fully synchronous for reliability  

---

## 🧩 API Reference

### ⭐ Core Methods

#### `set(key, value)`
```js
db.set("app.theme", "dark");
db.set("user.profile.age", 24);
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

#### `fetch(key)`
Alias of `get()`.

#### `has(key)`
```js
db.has("cache.enabled"); // true / false
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
Returns full database.

#### `allArray()`
```js
const entries = db.allArray();
```

#### `keys(prefix?)`
```js
db.keys();        // all keys
db.keys("user."); // starts with "user."
```

#### `startsWith(prefix)`
```js
db.startsWith("cache.");
```

---

### 🧪 Type Checking

#### `type(key)`
```js
db.type("user.profile"); // object, string, number, etc.
```

---

## 🗄 Storage Behavior

- All data saved to `flxdb/flxdb.json`  
- Writes are fully persisted  
- Supports nested dot‑notation  
- Deep merge support  
- Synchronous & stable for small/medium Node.js apps  

---

## 🛠 Suitable For

- App configuration  
- CLI tool storage  
- Local persistence  
- JSON-based caching  
- Metrics & counters  
- Lightweight data utilities  

---

## 🧪 Example: Structured Config

```js
db.set({
  server: { port: 3000, secure: false },
  app: { mode: "production", version: "1.2.0" }
});

const port = db.get("server.port");
```

---

## ⭐ Support

Projeyi beğendiysen bir ⭐ bırakabilirsin!  
Her türlü katkı ve öneri kabul edilir.

---

## 📄 License

MIT License
