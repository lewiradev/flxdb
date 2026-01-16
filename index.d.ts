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

export interface FLXDB {
  /**
   * Set a value by key (dot-notation supported).
   * @example db.set("user.name", "Alex");
   */
  set<T = any>(key: string, value: T): T;

  /**
   * Merge an object into the database (deep merge).
   * @example db.set({ app: { version: "1.0.0" } });
   */
  set(obj: FLXDBObject): FLXDBObject;

  /**
   * Get a value by key. Returns defaultValue (or null) if not found.
   * @example db.get("user.name", "Guest");
   */
  get<T = any>(key: string, defaultValue?: T): T;

  /**
   * Alias of get()
   */
  fetch<T = any>(key: string, defaultValue?: T): T;

  /**
   * Check if a key exists.
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
}

/**
 * Default export is a single flxdb instance.
 * @example
 *   const db = require("flxdb");
 *   db.set("app.version", "1.0.0");
 */
declare const flxdb: FLXDB;

export = flxdb;