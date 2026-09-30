/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { getSyntheticsFieldSuggestionsRoute } from './field_suggestions_route';

describe('getSyntheticsFieldSuggestionsRoute', () => {
  afterEach(() => jest.clearAllMocks());

  const runHandler = (body: unknown, spaceId = 'default') => {
    const search = jest.fn().mockResolvedValue({ body });
    const route = getSyntheticsFieldSuggestionsRoute();
    return {
      search,
      // @ts-expect-error partial implementation for testing
      result: route.handler({ syntheticsEsClient: { search }, spaceId }),
    };
  };

  it('returns service names from the aggregation and unique sorted label keys from hits', async () => {
    const { search, result } = runHandler({
      aggregations: {
        serviceNames: { buckets: [{ key: 'checkout' }, { key: 'cart' }] },
      },
      hits: {
        hits: [
          { _source: { labels: { env: 'prod', team: 'a' } } },
          { _source: { labels: { env: 'dev', region: 'us' } } },
          { _source: {} },
          { _source: { labels: null } },
        ],
      },
    });

    await expect(result).resolves.toEqual({
      serviceNames: ['cart', 'checkout'],
      labelKeys: ['env', 'region', 'team'],
    });
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('scopes the ping query to the active space', async () => {
    const { search, result } = runHandler({ hits: { hits: [] } }, 'team-a');

    await expect(result).resolves.toEqual({ serviceNames: [], labelKeys: [] });
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: {
          bool: {
            filter: expect.arrayContaining([
              { terms: { 'meta.space_id': ['team-a', ALL_SPACES_ID] } },
            ]),
          },
        },
      })
    );
  });

  it('returns empty arrays when there are no aggregations or hits', async () => {
    const { result } = runHandler({ hits: { hits: [] } });

    await expect(result).resolves.toEqual({ serviceNames: [], labelKeys: [] });
  });
});
