/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { clamp } from 'lodash';

export function getInterpolationValue(
  foreground: number,
  background: number | undefined,
  denominator: number = foreground
) {
  if (background === undefined) {
    return 1;
  }

  return clamp((foreground - background) / denominator, -1, 1);
}
