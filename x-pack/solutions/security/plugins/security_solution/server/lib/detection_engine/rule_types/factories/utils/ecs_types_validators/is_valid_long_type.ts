/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';
import { isValidNumericType } from './is_valid_numeric_type';

/**
 * validates ES long type
 */
export const isValidLongType = (value: SearchTypes): boolean => {
  // long type can't have any spaces if string
  if (typeof value === 'string' && value.includes(' ')) {
    return false;
  }

  return isValidNumericType(value);
};
