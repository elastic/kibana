/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ActionRequestOptions } from '../../../../../../common/search_strategy/endpoint/response_actions';
import { buildResponseActionsQuery } from './query.all_actions.dsl';

describe('buildResponseActionsQuery', () => {
  const options = {
    alertIds: ['alert-1'],
    sort: { field: '@timestamp', order: 'desc' },
  } as ActionRequestOptions;

  const getFilter = (query: estypes.SearchRequest): estypes.QueryDslQueryContainer[] =>
    (query.query?.bool?.filter as estypes.QueryDslQueryContainer[]) ?? [];

  it('reads the Defend and Osquery action indices', () => {
    const query = buildResponseActionsQuery(options);

    expect(query.index).toEqual([
      '.logs-endpoint.actions-default',
      '.logs-osquery_manager.actions-*',
    ]);
  });

  it('adds the remote patterns alongside the local ones when cross-cluster search is enabled', () => {
    const query = buildResponseActionsQuery({ ...options, ccsEnabled: true });

    expect(query.index).toEqual([
      '.logs-endpoint.actions-default',
      '.logs-osquery_manager.actions-*',
      '*:.logs-endpoint.actions-default',
      '*:.logs-osquery_manager.actions-*',
    ]);
  });

  it('applies no space filter without a spaceId, which is how the flag-off path builds it', () => {
    expect(getFilter(buildResponseActionsQuery(options))).toEqual([]);
  });

  it('bounds Defend documents by originSpaceId and Osquery documents by space_id', () => {
    const [spaceFilter] = getFilter(buildResponseActionsQuery({ ...options, spaceId: 'foo' }));

    expect(spaceFilter).toEqual({
      bool: {
        should: [{ term: { originSpaceId: 'foo' } }, { term: { space_id: 'foo' } }],
        minimum_should_match: 1,
      },
    });
  });

  it('admits field-less Osquery documents in the default space, but never field-less Defend ones', () => {
    const [spaceFilter] = getFilter(buildResponseActionsQuery({ ...options, spaceId: 'default' }));

    expect(spaceFilter).toEqual({
      bool: {
        should: [
          { term: { originSpaceId: 'default' } },
          { term: { space_id: 'default' } },
          {
            bool: {
              must_not: [
                { exists: { field: 'space_id' } },
                { exists: { field: 'EndpointActions.action_id' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
  });

  it('limits the fields returned to a caller without actions log management', () => {
    const query = buildResponseActionsQuery(options, undefined);

    expect(query.fields).toEqual(expect.arrayContaining(['@timestamp', 'action_id', 'input_type']));
  });
});
