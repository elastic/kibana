/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import { fetchSpaceIdsWithMaybePendingActions, getUnExpiredActionsEsQuery } from '../..';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { applyEsClientSearchMock } from '../../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { BaseDataGenerator } from '../../../../../common/endpoint/data_generators/base_data_generator';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../../../../common/endpoint/service/response_actions/constants';

describe('fetchSpaceIdsWithMaybePendingActions()', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let spaceIdsAggregation: { buckets?: Array<{ key: string }> };

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();

    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;

    spaceIdsAggregation = { buckets: [{ key: 'foo' }, { key: 'bar' }] };

    applyEsClientSearchMock({
      esClientMock: endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock,
      index: ENDPOINT_ACTIONS_INDEX,
      response: Object.assign(BaseDataGenerator.toEsSearchResponse([]), {
        aggregations: {
          spaceIds: spaceIdsAggregation,
        },
      }),
    });
  });

  it('should return array with default space id if space awareness feature is disabled', async () => {
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

    await expect(
      fetchSpaceIdsWithMaybePendingActions(endpointServiceMock, 'endpoint')
    ).resolves.toEqual([DEFAULT_SPACE_ID]);

    expect(endpointServiceMock.getInternalEsClient().search).not.toHaveBeenCalled();
  });

  it('should return an array of space ids', async () => {
    await expect(
      fetchSpaceIdsWithMaybePendingActions(endpointServiceMock, 'endpoint')
    ).resolves.toEqual(['foo', 'bar']);
  });

  it('should return empty array of no data is found while search the index', async () => {
    spaceIdsAggregation.buckets = undefined;

    await expect(
      fetchSpaceIdsWithMaybePendingActions(endpointServiceMock, 'endpoint')
    ).resolves.toEqual([]);
  });

  it.each(RESPONSE_ACTION_AGENT_TYPE)(
    'should use agent type `%s` in ES search query',
    async (agentType) => {
      await fetchSpaceIdsWithMaybePendingActions(endpointServiceMock, agentType);

      expect(endpointServiceMock.getInternalEsClient().search).toHaveBeenCalledWith({
        _source: false,
        aggs: {
          spaceIds: {
            terms: {
              field: 'originSpaceId',
              size: 10000,
            },
          },
        },
        ignore_unavailable: true,
        index: '.logs-endpoint.actions-default',
        query: getUnExpiredActionsEsQuery(agentType),
        size: 0,
      });
    }
  );
});
