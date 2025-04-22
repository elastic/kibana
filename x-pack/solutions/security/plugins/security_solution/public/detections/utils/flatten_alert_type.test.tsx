/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Alert } from '@kbn/alerting-types';
import { flattenAlertType } from './flatten_alert_type';

describe('flattenAlertType', () => {
  it('should handle basic fields', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      field1: ['value1'],
      field2: [1],
    };

    const result = flattenAlertType(alert);

    expect(result).toEqual({
      _id: ['_id'],
      _index: ['_index'],
      field1: ['value1'],
      field2: ['1'],
    });
  });

  it('should handle nested fields', () => {
    const alert: Alert = {
      _id: '_id',
      _index: '_index',
      'kibana.alert.rule.parameters': [
        {
          field1: 'value1',
          field2: 1,
          field3: ['value3', 'value3bis', 'value3ter'],
          field4: false,
          field5: {
            field6: 'value6',
          },
        },
      ],
    };

    const result = flattenAlertType(alert);

    expect(result).toEqual({
      _id: ['_id'],
      _index: ['_index'],
      'kibana.alert.rule.parameters.field1': ['value1'],
      'kibana.alert.rule.parameters.field2': ['1'],
      'kibana.alert.rule.parameters.field3': ['value3', 'value3bis', 'value3ter'],
      'kibana.alert.rule.parameters.field4': ['false'],
      'kibana.alert.rule.parameters.field5.field6': ['value6'],
    });
  });
});
