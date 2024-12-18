/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Return a font-size based on a scale, minimum size, and a coefficient.
 */
export function fontSize(scale: number, minimum: number, slope: number): number {
  return minimum + (scale > 1 ? slope * (scale - 1) : 0);
}
