/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy, uniqBy } from 'lodash';
import type {
  RequiredField,
  RequiredFieldInput,
} from '../../../../api/detection_engine/model/rule_schema';
import { addEcsToRequiredFields } from '../../../rule_management/utils';

/**
 * Brings required fields to a canonical form so order, duplicates and stored `ecs` values don't affect comparisons.
 */
export const normalizeRequiredFields = (requiredFields?: RequiredFieldInput[]): RequiredField[] =>
  sortBy(
    uniqBy(addEcsToRequiredFields(requiredFields), ({ name, type }) => `${name}\u0000${type}`),
    ['name', 'type']
  );
