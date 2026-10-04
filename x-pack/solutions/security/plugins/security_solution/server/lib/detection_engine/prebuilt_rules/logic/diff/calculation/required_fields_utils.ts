/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual, uniqBy } from 'lodash';
import type { RequiredField } from '../../../../../../../common/api/detection_engine';

type RequiredFieldIdentity = Pick<RequiredField, 'name' | 'type'>;

/**
 * Identifies a required field by its `name` and `type`. `ecs` is derived from them and is ignored.
 */
export const getRequiredFieldKey = ({ name, type }: RequiredFieldIdentity): string =>
  `${name}\u0000${type}`;

/**
 * Deduplicates required fields by `name` and `type`, keeping the first occurrence intact.
 */
export const dedupeRequiredFields = <T extends RequiredFieldIdentity>(fields: T[]): T[] =>
  uniqBy(fields, getRequiredFieldKey);

/**
 * Converts required fields to a set of `name` and `type` pairs ignoring order, duplicates and `ecs`.
 */
export const toRequiredFieldKeySet = (fields: RequiredFieldIdentity[] | undefined): Set<string> =>
  new Set((fields ?? []).map(getRequiredFieldKey));

/**
 * Compares required fields as sets of `name` and `type` pairs ignoring order, duplicates and `ecs`.
 */
export const areRequiredFieldsEqual = ({
  left,
  right,
}: {
  left: RequiredFieldIdentity[] | undefined;
  right: RequiredFieldIdentity[] | undefined;
}): boolean => isEqual(toRequiredFieldKeySet(left), toRequiredFieldKeySet(right));
