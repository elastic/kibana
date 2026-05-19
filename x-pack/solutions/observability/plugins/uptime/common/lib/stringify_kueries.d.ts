/**
 * Extract a map's keys to an array, then map those keys to a string per key.
 * The strings contain all of the values chosen for the given field (which is also the key value).
 * Reduce the list of query strings to a singular string, with AND operators between.
 */
export declare const stringifyKueries: (kueries: Map<string, Array<number | string>>, logicalANDForTag?: boolean) => string;
