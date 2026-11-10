/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isJsonObjectString = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch (e) {
    return false;
  }
};
