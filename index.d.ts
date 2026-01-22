// index.d.ts — TypeScript declarations for flxdb (instance-based CommonJS export)

export type FLXDBValue =
  | string
  | number
  | boolean
  | null
  | FLXDBObject
  | FLXDBValue[];

export interface FLXDBObject {
  [key: string]: FLXDBValue;
}

export interface FLXDBEntry<T = any> {
  key: string;
  value: T;
}

export type FLXDBTypeName =
  | "undefined"
  | "null"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "function"
  | "bigint"
  | "symbol";

/**
 * Options passed to set(key, value, options)
 */
export interface FLXDBSetOptions {
  /**
   * Time-To-Live in milliseconds.
   * After this duration, the key will be automatically removed.
   */
  ttl?: number;

  /**
   * Name of a schema previously registered via registerSchema().
   * The value will be validated against this schema before being stored.
   */
  schema?: string;
}

/**
 * Simple JSON-like schema definition used by flxdb.
 * This is intentionally lightweight; you can evolve it over time.
 */
export interface FLXDBSchemaProperty {
  type?: "string" | "number" | "boolean" | "object" | "array" | "null";
}

export interface FLXDBSchema {
  /**
   * Top-level type, usually "object".
   */
  type?: "string" | "number" | "boolean" | "object" | "array" | "null";

  /**
   * Required fields when type === "object".
   */
  required?: string[];

  /**
   * Per-field type definitions when type === "object".
   */
  props?: {
    [field: string]: FLXDBSchemaProperty;
  };
}

/**
 * Namespace instance returned by db.namespace("name").
 * All operations are scoped under given namespace.
 */
export interface FLXDBNamespace {
  /**
   * Set a value inside this namespace.
   * Under the hood this uses "namespace.innerKey" on the root DB.
   */
  set<T = any>(key: string, value: T, options?: FLXDBSetOptions): T;

  /**
   * Get a namespaced value.
   */
  get<T = any>(key: string, defaultValue?: T): T;

  /**
   * Alias of get()
   */
  fetch<T = any>(key: string, defaultValue?: T): T;

  /**
   * Check if a namespaced key exists.
   */
  has(key: string): boolean;

  /**
   * Ensure a namespaced key exists; if not, set it to defaultValue.
   */
  ensure<T = any>(key: string, defaultValue: T): T;

  /**
   * Delete a namespaced key.
   */
  delete(key: string): boolean;

  /**
   * Add a number to a namespaced value.
   */
  add(key: string, amount?: number): number;

  /**
   * Subtract a number from a namespaced value.
   */
  subtract(key: string, amount?: number): number;

  /**
   * Push a value to a namespaced array.
   */
  push<T = any>(key: string, value: T): T[];

  /**
   * Remove matching values from a namespaced array.
   */
  pull<T = any>(key: string, value: T): T[];

  /**
   * Returns the type of the namespaced value stored at key.
   */
  type(key: string): FLXDBTypeName;

  /**
   * Return this namespace as a nested object.
   */
  all(): any;

  /**
   * Return all leaf entries in this namespace as [{ key, value }, ...],
   * where key is the inner key (without the namespace prefix).
   */
  allArray(): Array<FLXDBEntry<any>>;

  /**
   * List inner keys under this namespace, optionally filtered by prefix.
   */
  keys(prefix?: string): string[];
}

export interface FLXDB {
  /**
   * Set a value by key (dot-notation supported).
   * Supports optional TTL & schema validation.
   * @example db.set("user.name", "Alex", { ttl: 60_000, schema: "userProfile" });
   */
  set<T = any>(key: string, value: T, options?: FLXDBSetOptions): T;

  /**
   * Merge an object into the database (deep merge).
   * @example db.set({ app: { version: "1.0.0" } });
   */
  set(obj: FLXDBObject): FLXDBObject;

  /**
   * Get a value by key. Returns defaultValue (or null) if not found or expired (TTL).
   * @example db.get("user.name", "Guest");
   */
  get<T = any>(key: string, defaultValue?: T): T;

  /**
   * Alias of get()
   */
  fetch<T = any>(key: string, defaultValue?: T): T;

  /**
   * Check if a key exists (returns false if TTL already expired).
   */
  has(key: string): boolean;

  /**
   * Ensure a key exists; if not, set it to defaultValue.
   */
  ensure<T = any>(key: string, defaultValue: T): T;

  /**
   * Delete a key.
   */
  delete(key: string): boolean;

  /**
   * Add a number to a value (starts from 0 if missing).
   */
  add(key: string, amount?: number): number;

  /**
   * Subtract a number from a value.
   */
  subtract(key: string, amount?: number): number;

  /**
   * Push a value to an array.
   * If current value is not an array, it will be converted into one.
   */
  push<T = any>(key: string, value: T): T[];

  /**
   * Remove matching values from an array (primitive equality).
   */
  pull<T = any>(key: string, value: T): T[];

  /**
   * Return the entire database as a deep-cloned object.
   */
  all(): any;

  /**
   * Return all leaf entries as [{ key, value }, ...]
   */
  allArray(): Array<FLXDBEntry<any>>;

  /**
   * List all keys, optionally filtered by prefix.
   */
  keys(prefix?: string): string[];

  /**
   * Return [{ key, value }, ...] entries whose keys start with prefix.
   */
  startsWith(prefix: string): Array<FLXDBEntry<any>>;

  /**
   * Returns the type of the value stored at key.
   */
  type(key: string): FLXDBTypeName;

  /**
   * Clear all data.
   */
  clear(): void;

  /**
   * Alias of clear()
   */
  deleteAll(): void;

  /**
   * Register a JSON-like schema used for validation in set(..., { schema }).
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
  registerSchema(name: string, schema: FLXDBSchema): void;

  /**
   * Create a namespace, scoping all operations under "name.*".
   * @example
   * const guilds = db.namespace("guilds");
   * guilds.set("123.premium", true);
   */
  namespace(name: string): FLXDBNamespace;
}

/**
 * Default export is a single flxdb instance.
 * @example
 *   const db = require("flxdb");
 *   db.set("app.version", "1.0.0");
 */
declare const flxdb: FLXDB;

export = flxdb;