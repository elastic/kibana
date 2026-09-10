/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Validates that a string is not empty by first `.trim()`'ing it and then checking the length.
 * @param value
 */
export const validateNonEmptyString = (value: string): void | string => {
  if (!value.trim().length) {
    return `Value can not be an empty string`;
  }
};

/**
 * Validates that an array does not contain duplicate values.
 * @param valueArray
 */
export const validateNoDuplicateValues = (valueArray: Array<any>): void | string => {
  const uniqueValues = new Set(valueArray);

  if (uniqueValues.size !== valueArray.length) {
    return 'Duplicate values are not allowed';
  }
};
