/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAttackDiscoveryGenerationsQuery, DEFAULT_START, DEFAULT_END } from '.';
import { ATTACK_DISCOVERY_EVENT_PROVIDER } from '../../../../../common/constants';
import { mockAuthenticatedUser } from '../../../../__mocks__/mock_authenticated_user';

describe('getAttackDiscoveryGenerationsQuery', () => {
  const defaultProps = {
    authenticatedUser: mockAuthenticatedUser,
    end: DEFAULT_END,
    eventLogIndex: 'mock-index',
    size: 10,
    start: DEFAULT_START,
    spaceId: 'default',
  };

  it('returns the expected index', () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);

    expect(query.index).toEqual(['mock-index']);
  });

  it('returns a query with a size of zero', () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);

    expect(query.size).toBe(0);
  });

  it('does not include source documents', () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);

    expect(query._source).toBe(false);
  });

  it("ensures the query does not error if the indices don't exist", () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);

    expect(query.allow_no_indices).toBe(true);
  });

  it('ignores unavailable indicies', () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);

    expect(query.ignore_unavailable).toBe(true);
  });

  it('returns the expected query', () => {
    const query = getAttackDiscoveryGenerationsQuery(defaultProps);
    const expectedQuery = {
      bool: {
        must: [
          { term: { 'event.provider': ATTACK_DISCOVERY_EVENT_PROVIDER } },
          { term: { 'user.name': defaultProps.authenticatedUser.username } },
          { term: { 'kibana.space_ids': defaultProps.spaceId } },
          {
            range: {
              '@timestamp': {
                gte: DEFAULT_START,
                lte: DEFAULT_END,
                format: 'strict_date_optional_time',
              },
            },
          },
          { exists: { field: 'kibana.alert.rule.execution.uuid' } },
          { exists: { field: 'event.dataset' } },
          { exists: { field: 'event.action' } },
        ],
      },
    };
    expect(query.query).toEqual(expectedQuery);
  });
});
