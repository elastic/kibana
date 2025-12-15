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

export const toSingleValue = (v: NormalizedValue): string | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
  return v;
};

export const normalizeIndicatorValue = (v: string | string[] | null): NormalizedValue => {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const cleaned = v.filter(Boolean);
    if (cleaned.length === 0) return null;
    if (cleaned.length === 1) return cleaned[0];
    return cleaned;
  }
  return v;
};

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
  const value = normalizeIndicatorValue(rawValue); // (see helper below)

  let key = field;
  if (field === RawIndicatorFieldId.Name) {
    const nameOrigin = normalizeIndicatorValue(unwrapValue(data, RawIndicatorFieldId.NameOrigin));
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

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false; // reject '' or whitespace
    return trimmed !== EMPTY_VALUE;
  }

  if (Array.isArray(value)) {
    return value.some((v) => typeof v === 'string' && v.trim() && v !== EMPTY_VALUE);
  }

  return false;
};
