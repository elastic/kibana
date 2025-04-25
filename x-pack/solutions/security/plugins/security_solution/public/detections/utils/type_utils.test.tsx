/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import {
  getAlertFieldValueAsStringOrNull,
  getAlertFieldValueAsStringOrNumberOrNull,
  isJsonObjectValue,
} from './type_utils';
import type { JsonValue } from '@kbn/utility-types';

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

describe('getAlertFieldValueAsStringOrNumberOrNull', () => {
  it('should handle missing field', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'columnId';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toBe(null);
  });

  it('should handle string value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 'value1',
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual('value1');
  });

  it('should handle a number value', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: 123,
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual(123);
  });

  it('should handle array of booleans', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [true, false],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual('true');
  });

  it('should handle array of numbers', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [1, 2],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual(1);
  });

  it('should handle array of null', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [null, null],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual(null);
  });

  it('should join array of JsonObjects', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: [{ subField1: 'value1', subField2: 'value2' }],
    };
    const field = 'field1';

    const result = getAlertFieldValueAsStringOrNumberOrNull(alert, field);

    expect(result).toEqual('[object Object]');
  });
});

describe('isJsonObjectValue', () => {
  it('should return true for JsonObject', () => {
    const value: JsonValue = { test: 'value' };

    const result = isJsonObjectValue(value);

    expect(result).toBe(true);
  });

  it('should return false for null', () => {
    const value: JsonValue = null;

    const result = isJsonObjectValue(value);

    expect(result).toBe(false);
  });

  it('should return false for string', () => {
    const value: JsonValue = 'test';

    const result = isJsonObjectValue(value);

    expect(result).toBe(false);
  });

  it('should return false for number', () => {
    const value: JsonValue = 123;

    const result = isJsonObjectValue(value);

    expect(result).toBe(false);
  });

  it('should return false for boolean', () => {
    const value: JsonValue = true;

    const result = isJsonObjectValue(value);

    expect(result).toBe(false);
  });

  it('should return false for array', () => {
    const value: JsonValue = ['test', 123, true];

    const result = isJsonObjectValue(value);

    expect(result).toBe(false);
  });
});
