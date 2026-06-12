/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSuppressedAlertInstanceId } from './wrap_suppressed_alerts';

describe('createSuppressedAlertInstanceId', () => {
  test('should generate unique instance IDs', () => {
    expect(
      createSuppressedAlertInstanceId({
        terms: [
          { field: 'host.name', value: 'host-1' },
          { field: 'user.id', value: 2 },
        ],
        ruleId: 'abc',
        spaceId: 'default',
      })
    ).toEqual('89a50ea19a73a06ceb2f1882de27be64ef6bb4c0');

    expect(
      createSuppressedAlertInstanceId({
        terms: [
          { field: 'host.name', value: 'host-1' },
          { field: 'user.id', value: 3 },
        ],
        ruleId: 'abc',
        spaceId: 'default',
      })
    ).toEqual('b40340d217f64a6b97aaa1d3d3120d3b6a1a6955');

    expect(
      createSuppressedAlertInstanceId({
        terms: [
          { field: 'host.name', value: 'host-1' },
          { field: 'user.id', value: 2 },
        ],
        ruleId: 'abc',
        spaceId: 'other-space',
      })
    ).toEqual('8dace33aaeea3e38cbe608b8ac21439b3a9fac05');

    expect(
      createSuppressedAlertInstanceId({
        terms: [
          { field: 'host.name', value: 'host-1' },
          { field: 'user.id', value: 2 },
        ],
        ruleId: 'other-id',
        spaceId: 'default',
      })
    ).toEqual('2c7b540ae3a3310271f7cbc44a3ba49fd840636b');

    expect(
      createSuppressedAlertInstanceId({
        terms: [
          { field: 'host.name', value: 'host-2' },
          { field: 'user.id', value: 2 },
        ],
        ruleId: 'abc',
        spaceId: 'default',
      })
    ).toEqual('d8505a6fe8fd4c9b74367b89a7fd19a72ed1077b');

    expect(
      createSuppressedAlertInstanceId({
        terms: [{ field: 'host.name', value: 'host-1' }],
        ruleId: 'abc',
        spaceId: 'default',
      })
    ).toEqual('657c4202086c305bb4406217099cd586e27417f7');

    expect(
      createSuppressedAlertInstanceId({
        terms: [{ field: 'host.name', value: null }],
        ruleId: 'abc',
        spaceId: 'default',
      })
    ).toEqual('879f4db2774775831acd1b1477109a3757540b8c');
  });
});
