/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import { applyActionsEsSearchMock } from '../mocks';
import { fetchActionRequestById } from './fetch_action_request_by_id';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { applyEsClientSearchMock } from '../../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';

describe('fetchActionRequestById() utility', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    applyActionsEsSearchMock(endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock);
  });

  it('should search the actions index with expected query', async () => {
    await fetchActionRequestById(endpointServiceMock, 'default', '123');
  });

  it('should error if action id is not found', async () => {
    applyEsClientSearchMock({
      esClientMock: endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock,
      index: ENDPOINT_ACTIONS_INDEX,
      response: EndpointActionGenerator.toEsSearchResponse([]),
    });

    await expect(fetchActionRequestById(endpointServiceMock, 'default', '123')).rejects.toThrow(
      "Action with id '123' not found."
    );
  });

  it('should not validate space access to the action when feature is disabled', async () => {
    await fetchActionRequestById(endpointServiceMock, 'default', '123');

    expect(
      endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace
    ).not.toHaveBeenCalled();
  });

  describe('and space awareness feature is enabled', () => {
    beforeEach(() => {
      // @ts-expect-error
      endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
    });

    it('should validate that action is accessible in active space', async () => {
      (
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).mockResolvedValue(undefined);
      await fetchActionRequestById(endpointServiceMock, 'default', '123');

      expect(
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).toHaveBeenCalledWith({
        integrationPolicyIds: ['integration-policy-1'],
        options: { matchAll: false },
      });
    });

    it('should error is action id is not accessible in active space', async () => {
      await expect(fetchActionRequestById(endpointServiceMock, 'default', '123')).rejects.toThrow(
        'Action [123] not found'
      );
    });
  });
});
