/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFinite } from 'lodash';
import type { Maybe } from '@kbn/apm-plugin/typings/common';

// _.isNumber() returns true for NaN, _.isFinite() does not refine
export function isFiniteNumber(value: any): value is number {
  return isFinite(value);
}

export function roundNumber(num: Maybe<number>) {
  return isFiniteNumber(num) ? Number(num.toPrecision(4)) : null;
}
