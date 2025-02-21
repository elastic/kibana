/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum GapRangeValue {
  LAST_24_H = 'last_24_h',
  LAST_3_D = 'last_3_d',
  LAST_7_D = 'last_7_d',
}

export const defaultRangeValue = GapRangeValue.LAST_24_H;
