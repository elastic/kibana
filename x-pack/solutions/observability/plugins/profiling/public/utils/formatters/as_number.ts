/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOT_AVAILABLE_LABEL } from '../../../common';
const units = ['', 'k', 'm', 'b', 't', 'q'];

export function asNumber(value: number): string {
  if (isNaN(value) || !Number.isFinite(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  if (value === 0) {
    return '0';
  }

  // Round the value once to get the base precision
  value = Math.round(value * 100) / 100;
  if (Math.abs(value) < 0.01) {
    return '~0.00';
  }

  let unitIndex = 0;

  while (unitIndex < units.length - 1 && Math.abs(value) >= 1e3) {
    value = value / 1e3;
    unitIndex += 1;
  }

  if (unitIndex === units.length - 1 && Math.abs(value) >= 1e3) {
    return NOT_AVAILABLE_LABEL;
  }

  // Round after scaling to match the original recursive behavior
  value = Math.round(value * 100) / 100;

  return `${value.toString()}${units[unitIndex]}`;
}
