/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

export const deepEqualityDiffAlgorithm = <TValue>(a: TValue, b: TValue): boolean => {
  return isEqual(a, b);
};
