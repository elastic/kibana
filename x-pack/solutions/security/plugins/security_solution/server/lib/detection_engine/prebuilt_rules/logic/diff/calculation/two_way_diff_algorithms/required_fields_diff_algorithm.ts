/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredField } from '../../../../../../../../common/api/detection_engine';
import { areRequiredFieldsEqual } from '../required_fields_utils';

export const requiredFieldsDiffAlgorithm = <TValue extends Pick<RequiredField, 'name' | 'type'>>(
  a: TValue[] | undefined,
  b: TValue[] | undefined
): boolean => {
  // Order, duplicates and `ecs` don't matter since `ecs` is derived from `name` and `type`
  return areRequiredFieldsEqual({ left: a, right: b });
};
