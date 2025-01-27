/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const flattenObject = (obj: Record<string, any>, prefix = ''): Record<string, any> => {
  return Object.keys(obj).reduce((acc, key) => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, newKey));
    } else {
      acc[newKey] = value;
    }

    return acc;
  }, {} as Record<string, any>);
};
