/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * When `esTypes` types array contains more than one value, and one of those
 * (multiple) values is `keyword`, the `keyword` entry is returned. The
 * `keyword` entry is preferred over other values when it exists in the array.
 *
 * The `keyword` value is also returned when the `esTypes` array is empty.
 */
export const getPreferredEsType = (esTypes: string[]): string => {
  if (esTypes.length === 1 || (esTypes.length > 1 && !esTypes.includes('keyword'))) {
    return esTypes[0]; // no preference
  } else {
    return 'keyword'; // esTypes includes `keyword`, or it's empty
  }
};
