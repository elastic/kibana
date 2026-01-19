/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import { getAlertFieldValueAsStringOrNull } from './get_alert_field_value_as_string_or_null';

describe('getAlertFieldValueAsStringOrNull', () => {
  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'columnId';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toBe(null);
  });

  it('should handle string value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual('value1');
  });

  it('should handle a number value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 123,
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual('123');
  });

  it('should handle array of booleans', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [true, false],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual('true, false');
  });

  it('should handle array of numbers', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [1, 2],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual('1, 2');
  });

  it('should handle array of null', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [null, null],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual(', ');
  });

  it('should join array of JsonObjects', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [{ subField1: 'value1', subField2: 'value2' }],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNull(alert, field);

    expect(result).toEqual('[object Object]');
  });
});
