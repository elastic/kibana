/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMPTY_VALUE } from '../../../constants/common';
import { unwrapValue } from './unwrap_value';
import {
  type Indicator,
  RawIndicatorFieldId,
} from '../../../../../common/threat_intelligence/types/indicator';

export type NormalizedValue = string | string[] | null;

export const normalizeAll = (v: string | string[] | null): NormalizedValue => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.filter(Boolean);
  return v;
};

export const asArray = (v: NormalizedValue): string[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

/**
 * Retrieves a field/value pair from an Indicator
 * @param data the {@link Indicator} to extract the value for the field
 * @param field the Indicator's field
 * @returns the key/value pair (indicator's field/value)
 */
export const getIndicatorFieldAndValue = (
  data: Indicator,
  field: string
): { key: string; value: NormalizedValue } => {
  const rawValue = unwrapValue(data, field as RawIndicatorFieldId);
  const value = normalizeAll(rawValue);

  let key = field;
  if (field === RawIndicatorFieldId.Name) {
    const nameOrigin = normalizeAll(unwrapValue(data, RawIndicatorFieldId.NameOrigin));
    if (typeof nameOrigin === 'string' && nameOrigin) {
      key = nameOrigin;
    }
  }

  return { key, value };
};

/**
 * Checks if field and value are correct
 * @param field Indicator string field
 * @param value Indicator string|null value for the field
 * @returns true if correct, false if not
 */
export const fieldAndValueValid = (field: string | null, value: NormalizedValue): boolean => {
  if (!field) return false;
  if (value == null) return false;

  if (Array.isArray(value)) {
    return value.some((v) => v && v !== EMPTY_VALUE);
  }

  return value !== EMPTY_VALUE;
};
