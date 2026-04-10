/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NOT_AVAILABLE_LABEL } from '../../../common';

export function asNumber(value: number): string {
  if (isNaN(value) || !Number.isFinite(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  if (value === 0) {
    return '0';
  }

  value = Math.round(value * 100) / 100;
  if (Math.abs(value) < 0.01) {
    return '~0.00';
  }
  if (Math.abs(value) < 1e3) {
    return value.toString();
  }

  if (Math.abs(value) < 1e6) {
    return `${asNumber(value / 1e3)}k`;
  }

  if (Math.abs(value) < 1e9) {
    return `${asNumber(value / 1e6)}m`;
  }

  return `${asNumber(value / 1e9)}b`;
}
