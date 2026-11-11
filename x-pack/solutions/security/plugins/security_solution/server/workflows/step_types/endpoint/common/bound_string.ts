/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELLIPSIS } from '../../../../../common/workflows/step_types/common/budget';

export const boundText = (value: string, maximum: number): string => {
  const codePoints = Array.from(value);
  if (codePoints.length <= maximum) {
    return value;
  }
  const omission = Array.from(ELLIPSIS).slice(0, maximum);
  return codePoints.slice(0, maximum - omission.length).join('') + omission.join('');
};

export const boundId = (value: string, maximum: number): string => value.slice(0, maximum);
