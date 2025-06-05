/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { Alert } from '@kbn/alerting-types';

/**
 * Takes an Alert object and a field string as input and returns the value for the field as a string.
 * If the value is already a string, return it.
 * If the value is an array, join the values.
 * If null the value is null.
 * Return the string of the value otherwise.
 */
export const getAlertFieldValueAsStringOrNull = (alert: Alert, field: string): string | null => {
  const cellValues: string | number | JsonValue[] = alert[field];

  if (typeof cellValues === 'string') {
    return cellValues;
  } else if (typeof cellValues === 'number') {
    return cellValues.toString();
  } else if (Array.isArray(cellValues)) {
    if (cellValues.length > 1) {
      return cellValues.join(', ');
    } else {
      const value: JsonValue = cellValues[0];
      if (typeof value === 'string') {
        return value;
      } else if (value == null) {
        return null;
      } else {
        return value.toString();
      }
    }
  } else {
    return null;
  }
};
