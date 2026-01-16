# flxdb
<p align="left">
  <a href="https://www.npmjs.com/package/flxdb">
    <img src="https://img.shields.io/npm/v/flxdb?color=%2300c853&style=for-the-badge" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/flxdb">
    <img src="https://img.shields.io/npm/dm/flxdb?color=%230098ee&style=for-the-badge" alt="npm downloads" />
  </a>
  <a href="https://github.com/lewirawashere/flxdb">
    <img src="https://img.shields.io/github/stars/lewirawashere/flxdb?color=%23ffca28&style=for-the-badge" alt="stars" />
  </a>
  <a href="https://github.com/lewirawashere/flxdb/issues">
    <img src="https://img.shields.io/github/issues/lewirawashere/flxdb?color=%23e57373&style=for-the-badge" alt="issues" />
  </a>
  <a href="https://github.com/lewirawashere/flxdb/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/flxdb?color=%23796eff&style=for-the-badge" alt="license" />
  </a>
</p>

**flxdb**, modern Node.js projeleri için tasarlanmış  
**hafif, hızlı ve dosya tabanlı** bir **key-value (KV) veritabanıdır**.

- Zero-configuration  
- Persistent JSON storage  
- Dot-notation key paths (`settings.app.theme`)  
- Lightweight and minimal  
- Ready-to-use single instance (`require("flxdb")`)  
- Extended utility methods for common data operations  

---

## 📦 Installation

```bash
npm install flxdb
```
📁 Automatic Storage Structure
flxdb automatically creates the following directory on first use:


🚀 Quick Usage Example
```js
const db = require("flxdb");

db.set("user.name", "Lewira");
db.add("system.uptime", 1);

console.log(db.get("user.name"));  // "Lewira"
console.log(db.all());             // full data object
```
🔧 Features
Simple and intuitive key-value API
Automatic JSON-based persistence
Deep merging via set(object)
Dot-notation support
Utility helpers for arrays, numbers, type checking, and more
Flattened key listing, prefix scanning, and value extraction
Fully synchronous for simplicity and reliability

🧩 API Reference
Core Methods
set(key, value)
Stores a value at the specified key.

```js
db.set("app.theme", "dark");
db.set("user.profile.age", 24);
set(object)

Merges an entire object into the database.
```

```js
db.set({
  app: { version: "1.0.0" },
  cache: { enabled: true }
});
get(key, defaultValue?)

Retrieves a stored value.
```
```js
const version = db.get("app.version", "0.0.0");
fetch(key)
Alias of get().

has(key)

Checks whether a key exists.
```

```js
db.has("cache.enabled"); // true / false
ensure(key, defaultValue)

Ensures the key exists; otherwise sets and returns the default value.
```
```js
const port = db.ensure("server.port", 8080);
delete(key)

Removes a key from the database.
```
```js
db.delete("user.session");
deleteAll()

Clears the entire database.

Numeric Operations
add(key, amount)
Increments a numeric value.
```
```js
db.add("metrics.requests", 1);
subtract(key, amount)
Decrements a numeric value.
```
```js
db.subtract("metrics.tasks", 2);
Array Operations
push(key, value)
Adds a value to an array.
If the key is not an array, it will be converted into one.
```
```js
db.push("logs", { type: "start", at: Date.now() });
pull(key, value)
Removes matching items from an array.
```
```js
db.pull("tags", "deprecated");
Data & Key Listing
all()
Returns the entire database as a deep-cloned object.

allArray()
Returns all entries as an array of { key, value }.
```
```js
const entries = db.allArray();
keys(prefix?)
Returns all stored keys.
Optionally filters for keys starting with a prefix.
```
```js
db.keys();          // all keys
db.keys("user.");   // keys starting with user.
startsWith(prefix)
Returns an array of { key, value } where the key starts with the prefix.
```
```js
db.startsWith("cache.");
Type Checking
type(key)
Returns the type of the stored value.
```
```js
db.type("user.profile"); // "object", "string", "number", "array", etc.
Storage Behavior
All values are saved to flxdb/flxdb.json
Writes are automatically persisted
Keys may be nested via dot-notation
Deep merge supported for object writes
Fully synchronous for safe usage in small-to-medium projects
```
🛠 Suitable For
Small configuration storage
Local persistence in CLI tools
Lightweight state management
JSON-based caching
Counters, logs, metrics
Local project data files
Simple key-value data utilities


🧪 Example: Structured Configuration
```js
db.set({
  server: { port: 3000, secure: false },
  app: { mode: "production", version: "1.2.0" }
});

const config = db.get("server.port");
```