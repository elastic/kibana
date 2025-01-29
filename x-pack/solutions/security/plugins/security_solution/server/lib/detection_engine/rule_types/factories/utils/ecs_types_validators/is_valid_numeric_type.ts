/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';

/**
 * validates ES numeric types
 */
export const isValidNumericType = (value: SearchTypes): boolean => {
  if (typeof value === 'number') {
    return true;
  }

  if (typeof value === 'string') {
    return !Number.isNaN(Number(value));
  }

  return false;
};
