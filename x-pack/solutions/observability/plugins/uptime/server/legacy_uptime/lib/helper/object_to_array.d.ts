/**
 * Converts the top-level fields of an object from an object to an array.
 * @param record the obect to map
 * @type T the type of the objects/arrays that will be mapped
 */
export declare const objectValuesToArrays: <T>(record: Record<string, T | T[]>) => Record<string, T[]>;
