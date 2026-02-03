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

const normalize = (v: string | string[] | null): string | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
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
): { key: string; value: string | null } => {
  const rawValue = unwrapValue(data, field as RawIndicatorFieldId);
  const value = normalize(rawValue);

  let key = field;
  if (field === RawIndicatorFieldId.Name) {
    const nameOrigin = normalize(unwrapValue(data, RawIndicatorFieldId.NameOrigin));
    if (nameOrigin) {
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
export const fieldAndValueValid = (field: string | null, value: string | null): boolean =>
  !!value && value !== EMPTY_VALUE && !!field;
