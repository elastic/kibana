/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryGenerationsAggs } from '.';

describe('getAttackDiscoveryGenerationsAggs', () => {
  const size = 5;
  let result: ReturnType<typeof getAttackDiscoveryGenerationsAggs>;

  beforeEach(() => {
    result = getAttackDiscoveryGenerationsAggs(size);
  });

  it('returns an aggregation query with the correct size', () => {
    expect(result.aggs?.generations?.terms?.size).toBe(size);
  });

  it('returns the expected static aggregation structure', () => {
    expect(result.aggs?.generations).toMatchObject({
      terms: {
        field: 'kibana.alert.rule.execution.uuid',
        order: { generation_start_time: 'desc' },
      },
      aggs: {
        alerts_context_count: {
          max: { field: 'kibana.alert.rule.execution.metrics.alert_counts.active' },
        },
        connector_id: {
          terms: { field: 'event.dataset' },
        },
        discoveries: {
          max: { field: 'kibana.alert.rule.execution.metrics.alert_counts.new' },
        },
        loading_message: {
          terms: { field: 'kibana.alert.rule.execution.status' },
        },
        event_actions: {
          terms: { field: 'event.action' },
        },
        event_reason: {
          terms: { field: 'event.reason' },
        },
        generation_end_time: {
          max: { field: 'event.end', format: 'strict_date_optional_time' },
        },
        generation_start_time: {
          min: { field: 'event.start', format: 'strict_date_optional_time' },
        },
      },
    });
  });
});
