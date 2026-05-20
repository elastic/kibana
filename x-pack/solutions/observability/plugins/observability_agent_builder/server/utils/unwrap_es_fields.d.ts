/**
 * Elasticsearch `fields` response returns all values as arrays.
 * This utility unwraps single-element arrays to their first value,
 * while preserving multi-element arrays.
 */
export declare function unwrapEsFields<T = Record<string, unknown>>(fields: Record<string, unknown[] | undefined> | undefined): T;
/**
 * Get a single field value from ES fields response, unwrapping single-element arrays.
 * Multi-element arrays are preserved.
 */
export declare function getEsField<T = unknown>(fields: Record<string, unknown[] | undefined> | undefined, key: string): T | undefined;
