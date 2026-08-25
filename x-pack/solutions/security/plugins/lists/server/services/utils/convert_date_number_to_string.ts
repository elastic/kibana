/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * if date field is number, converts it to ISO string
 */
export const convertDateNumberToString = (
  dateValue: string | number | undefined
): string | undefined => {
  if (typeof dateValue === 'number') {
    return new Date(dateValue).toISOString();
  }
  return dateValue;
};
