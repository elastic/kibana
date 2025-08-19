/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import { applyActionsEsSearchMock, createActionRequestsEsSearchResultsMock } from '../mocks';
import { fetchActionRequestById } from './fetch_action_request_by_id';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { applyEsClientSearchMock } from '../../../mocks/utils.mock';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../common/endpoint/constants';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { set } from '@kbn/safer-lodash-set';
import { ALLOWED_ACTION_REQUEST_TAGS } from '../constants';
import { REF_DATA_KEY_INITIAL_VALUE, REF_DATA_KEYS } from '../../../lib/reference_data';

describe('fetchActionRequestById() utility', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();
    applyActionsEsSearchMock(endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock);
  });

  it('should search the actions index with expected query', async () => {
    (
      endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);

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
    // @ts-expect-error
    endpointServiceMock.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;

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

    it('should error if action id is not accessible in active space', async () => {
      await expect(fetchActionRequestById(endpointServiceMock, 'default', '123')).rejects.toThrow(
        'Action [123] not found'
      );
    });

    it('should return orphan action if in the space defined via ref. data', async () => {
      applyEsClientSearchMock({
        esClientMock: endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: set(createActionRequestsEsSearchResultsMock(), 'hits.hits[0]._source.tags', [
          ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted,
        ]),
      });
      (endpointServiceMock.getReferenceDataClient().get as jest.Mock).mockResolvedValue(
        set(
          REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](),
          'metadata.spaceId',
          'foo'
        )
      );

      await expect(fetchActionRequestById(endpointServiceMock, 'foo', '123')).resolves.toEqual(
        expect.objectContaining({
          tags: [ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted],
        })
      );
    });

    it('should not return orphan actions if space defined via ref. data does not match active space', async () => {
      applyEsClientSearchMock({
        esClientMock: endpointServiceMock.getInternalEsClient() as ElasticsearchClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: set(createActionRequestsEsSearchResultsMock(), 'hits.hits[0]._source.tags', [
          ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted,
        ]),
      });
      (endpointServiceMock.getReferenceDataClient().get as jest.Mock).mockResolvedValue(
        set(
          REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](),
          'metadata.spaceId',
          'bar'
        )
      );

      await expect(fetchActionRequestById(endpointServiceMock, 'foo', '123')).rejects.toThrow(
        'Action [123] not found'
      );
    });

    it('should not validate action against spaces if `bypassSpaceValidation` is true', async () => {
      (
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).mockResolvedValue(undefined);
      await fetchActionRequestById(endpointServiceMock, 'default', '123', {
        bypassSpaceValidation: true,
      });

      expect(
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).not.toHaveBeenCalled();
    });
  });
});
