/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_GROUP, ALERT_GROUP_FIELD, ALERT_GROUP_VALUE } from '@kbn/rule-data-utils';
import type { TopAlert } from '../../typings/alerts';
import { getSources } from './get_sources';

const alert = (fields: Record<string, unknown>): TopAlert => ({ fields } as unknown as TopAlert);

describe('getSources', () => {
  it('reads a nested alert group and does not fall back to entity fields', () => {
    expect(
      getSources(
        alert({
          [ALERT_GROUP]: [{ field: 'host.name', value: 'web-1' }],
          'service.name': 'checkout',
        })
      )
    ).toEqual([{ field: 'host.name', value: 'web-1' }]);
  });

  it('skips the entity fallback when the nested group has no valid pairs', () => {
    expect(
      getSources(
        alert({
          [ALERT_GROUP]: [{ field: 'host.name', value: true }],
          'service.name': 'checkout',
        })
      )
    ).toEqual([]);
  });

  it('reads flattened alert group fields', () => {
    expect(
      getSources(
        alert({
          [ALERT_GROUP_FIELD]: ['service.name'],
          [ALERT_GROUP_VALUE]: ['checkout'],
        })
      )
    ).toEqual([{ field: 'service.name', value: 'checkout' }]);
  });

  it('falls back to known entity fields when the alert has no groups', () => {
    expect(getSources(alert({ 'host.name': ['web-1'] }))).toEqual([
      { field: 'host.name', value: 'web-1' },
    ]);
  });
});
