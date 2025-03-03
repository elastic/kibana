/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the hex representation of a random color (e.g `#F1B7E2`)
 */
export const getRandomColor = (): string => {
  return `#${String(Math.floor(Math.random() * 16777215).toString(16)).padStart(6, '0')}`;
};
