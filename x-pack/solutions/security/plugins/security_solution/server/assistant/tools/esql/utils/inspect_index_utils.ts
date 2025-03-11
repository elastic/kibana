/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InspectIndexMapping =
  | { [key: string]: InspectIndexMapping | undefined | string }
  | undefined
  | string;

  /**
   * Recursively gets the entries at a given key in an index mapping
   */
export const getEntriesAtKey = (
  mapping: InspectIndexMapping,
  keys: string[]
): InspectIndexMapping => {
  if (mapping === undefined) {
    return undefined;
  }
  if (keys.length === 0) {
    return mapping;
  }

  if (typeof mapping !== 'object') {
    return mapping;
  }

  const key = keys.shift();
  if (key === undefined) {
    return mapping;
  }

  return getEntriesAtKey(mapping[key], keys);
};

/**
 * Inspects an index mapping and returns a shallow view of the mapping
 * @param mapping The mapping to inspect
 * @param maxDepth The maximum depth to recurse into the object
 * @returns A shallow view of the mapping
 */
export const shallowObjectView = (mapping: InspectIndexMapping, maxDepth = 1): string | Record<string, string> => {
  if (mapping === undefined) {
    return 'undefined';
  }

  if (typeof mapping === 'string') {
    return mapping;
  }

  if (maxDepth <= 0) {
    return 'Object';
  }

  return Object.keys(mapping).reduce((acc, key) => {
    acc[key] = shallowObjectView(mapping[key], maxDepth - 1) as string;
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Same as shallowObjectView but reduces the maxDepth if the stringified view is longer than maxCharacters
 * @param mapping The index mapping
 * @param maxCharacters The maximum number of characters to return
 * @param maxDepth The maximum depth to recurse into the object
 * @returns A shallow view of the mapping 
 */
export const shallowObjectViewTruncated = (mapping: InspectIndexMapping, maxCharacters: number, maxDepth = 4): string | Record<string, string> => {
  const view = shallowObjectView(mapping, maxDepth);
  if (JSON.stringify(view).length > maxCharacters) {
    return shallowObjectView(view, 1);
  }
  return view;
}
