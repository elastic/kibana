/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEffectiveSuppressionGroupByFields } from './effective_alert_suppression_fields';

describe('getEffectiveSuppressionGroupByFields', () => {
  it('returns legacy groupBy field names', () => {
    expect(
      getEffectiveSuppressionGroupByFields({
        groupBy: ['host.name', 'agent.id'],
      })
    ).toEqual(['host.name', 'agent.id']);
  });

  it('returns snake_case group_by field names', () => {
    expect(
      getEffectiveSuppressionGroupByFields({
        group_by: ['host.name'],
      })
    ).toEqual(['host.name']);
  });

  it('prefers groupByV2 when present', () => {
    expect(
      getEffectiveSuppressionGroupByFields({
        groupBy: ['ignored.when.v2.present'],
        groupByV2: [{ field: 'host.name' }, { field: 'user.name' }],
      })
    ).toEqual(['host.name', 'user.name']);
  });

  it('prefers group_by_v2 when present', () => {
    expect(
      getEffectiveSuppressionGroupByFields({
        group_by: ['ignored'],
        group_by_v2: [{ field: 'source.ip' }],
      })
    ).toEqual(['source.ip']);
  });

  it('returns empty list when suppression is undefined', () => {
    expect(getEffectiveSuppressionGroupByFields(undefined)).toEqual([]);
  });
});
