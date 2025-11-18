/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryGenerationByIdQuery } from '.';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';

describe('getAttackDiscoveryGenerationByIdQuery', () => {
  const defaultProps = {
    authenticatedUser: mockAuthenticatedUser,
    eventLogIndex: 'test-event-log-index',
    executionUuid: 'test-execution-uuid',
    spaceId: 'test-space-id',
  };

  let query: ReturnType<typeof getAttackDiscoveryGenerationByIdQuery>;

  beforeEach(() => {
    query = getAttackDiscoveryGenerationByIdQuery(defaultProps);
  });

  it('returns a query with the correct index', () => {
    expect(query.index).toEqual(['test-event-log-index']);
  });

  it('returns a query with allow_no_indices true', () => {
    expect(query.allow_no_indices).toBe(true);
  });

  it('returns a query with ignore_unavailable true', () => {
    expect(query.ignore_unavailable).toBe(true);
  });

  it('returns a query with _source false', () => {
    expect(query._source).toBe(false);
  });

  it('returns a query with size 0', () => {
    expect(query.size).toBe(0);
  });

  it('returns a query with the expected aggs', () => {
    expect(query.aggs).toEqual({
      generations: {
        terms: {
          field: 'kibana.alert.rule.execution.uuid',
          size: 1,
          order: {
            generation_start_time: 'desc',
          },
        },
        aggs: {
          alerts_context_count: {
            max: {
              field: 'kibana.alert.rule.execution.metrics.alert_counts.active',
            },
          },
          connector_id: {
            terms: {
              field: 'event.dataset',
            },
          },
          discoveries: {
            max: {
              field: 'kibana.alert.rule.execution.metrics.alert_counts.new',
            },
          },
          loading_message: {
            terms: {
              field: 'kibana.alert.rule.execution.status',
            },
          },
          event_actions: {
            terms: {
              field: 'event.action',
            },
          },
          event_reason: {
            terms: {
              field: 'event.reason',
            },
          },
          generation_end_time: {
            max: {
              field: 'event.end',
              format: 'strict_date_optional_time',
            },
          },
          generation_start_time: {
            min: {
              field: 'event.start',
              format: 'strict_date_optional_time',
            },
          },
        },
      },
    });
  });

  it("returns the expected query for the user's generations", () => {
    expect(query.query).toEqual({
      bool: {
        must: [
          {
            term: {
              'event.provider': 'securitySolution.attackDiscovery',
            },
          },
          {
            term: {
              'user.name': 'test_user',
            },
          },
          {
            term: {
              'kibana.space_ids': 'test-space-id',
            },
          },
          {
            term: {
              'kibana.alert.rule.execution.uuid': 'test-execution-uuid',
            },
          },
          {
            exists: {
              field: 'event.dataset',
            },
          },
          {
            exists: {
              field: 'event.action',
            },
          },
        ],
      },
    });
  });
});
