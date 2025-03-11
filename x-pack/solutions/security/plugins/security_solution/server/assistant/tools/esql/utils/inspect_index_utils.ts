/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type GetEntriesAtKeyMapping =
  | { [key: string]: GetEntriesAtKeyMapping | undefined | string }
  | undefined
  | string;

export const getEntriesAtKey = (
  mapping: GetEntriesAtKeyMapping,
  keys: string[]
): GetEntriesAtKeyMapping => {
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



export const formatEntriesAtKey = (mapping: GetEntriesAtKeyMapping, maxDepth = 1): string | Record<string, string> => {
  if (mapping === undefined) {
    return 'undefined';
  }

  if (typeof mapping === 'string') {
    return mapping;
  }

  if (maxDepth <= 0) {
    return 'Object';
  }

  const formatted: Record<string, string> = {};
  // recursivly call
  Object.keys(mapping).forEach((key) => {
    formatted[key] = formatEntriesAtKey(mapping[key], maxDepth - 1) as string;
  });

  return formatted;
};
