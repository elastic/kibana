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
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { ExperimentalFeatures } from '../../../../../common';

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

  describe('and space awareness feature is enabled', () => {
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
          await REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](
            {} as SavedObjectsClientContract,
            {} as ExperimentalFeatures
          ),
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
          await REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](
            {} as SavedObjectsClientContract,
            {} as ExperimentalFeatures
          ),
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

  describe('and CPS is enabled', () => {
    let readEsClientMock: ElasticsearchClientMock;
    const request = httpServerMock.createKibanaRequest();

    beforeEach(() => {
      readEsClientMock = elasticsearchServiceMock.createElasticsearchClient();
      applyActionsEsSearchMock(readEsClientMock);

      endpointServiceMock.isCpsActive.mockResolvedValue(true);
      endpointServiceMock.getReadEsClient.mockResolvedValue(readEsClientMock);
    });

    it('should read as the request user so the search can fan out to linked projects', async () => {
      const scoped = await endpointServiceMock.asScoped(request);
      await fetchActionRequestById(endpointServiceMock, 'default', '123', {
        scoped,
      });

      expect(endpointServiceMock.getReadEsClient).toHaveBeenCalledWith(request);
      expect(readEsClientMock.search).toHaveBeenCalled();
    });

    it('should validate visibility against originSpaceId rather than through Fleet', async () => {
      const scoped = await endpointServiceMock.asScoped(request);
      await fetchActionRequestById(endpointServiceMock, 'default', '123', {
        scoped,
      });

      expect(
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).not.toHaveBeenCalled();
    });

    it('should error if the action belongs to another space', async () => {
      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'foo', '123', {
          scoped,
        })
      ).rejects.toThrow('Action [123] not found');
    });

    it('should error if the action carries no originSpaceId at all', async () => {
      applyEsClientSearchMock({
        esClientMock: readEsClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: set(
          createActionRequestsEsSearchResultsMock(),
          'hits.hits[0]._source.originSpaceId',
          undefined
        ),
      });

      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'default', '123', {
          scoped,
        })
      ).rejects.toThrow('Action [123] not found');
    });

    it('should still return an orphan action in the space defined via ref. data', async () => {
      applyEsClientSearchMock({
        esClientMock: readEsClientMock,
        index: ENDPOINT_ACTIONS_INDEX,
        response: set(createActionRequestsEsSearchResultsMock(), 'hits.hits[0]._source.tags', [
          ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted,
        ]),
      });
      (endpointServiceMock.getReferenceDataClient().get as jest.Mock).mockResolvedValue(
        set(
          await REF_DATA_KEY_INITIAL_VALUE[REF_DATA_KEYS.orphanResponseActionsSpace](
            {} as SavedObjectsClientContract,
            {} as ExperimentalFeatures
          ),
          'metadata.spaceId',
          'foo'
        )
      );

      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'foo', '123', {
          scoped,
        })
      ).resolves.toEqual(
        expect.objectContaining({
          tags: [ALLOWED_ACTION_REQUEST_TAGS.integrationPolicyDeleted],
        })
      );
    });

    it('should not validate against spaces if `bypassSpaceValidation` is true', async () => {
      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'foo', '123', {
          scoped,
          bypassSpaceValidation: true,
        })
      ).resolves.toEqual(expect.objectContaining({ originSpaceId: 'default' }));
    });

    it('should accept an action whose integration policy is visible in the active space even if its originSpaceId differs', async () => {
      (
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).mockResolvedValueOnce(undefined);

      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'other-space', '123', {
          scoped,
        })
      ).resolves.toEqual(expect.objectContaining({ originSpaceId: 'default' }));

      expect(
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).toHaveBeenCalledWith({
        integrationPolicyIds: ['integration-policy-1'],
        options: { matchAll: false },
      });
    });

    it('should accept an action whose originSpaceId matches the active space without consulting Fleet', async () => {
      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'default', '123', {
          scoped,
        })
      ).resolves.toBeDefined();

      expect(
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).not.toHaveBeenCalled();
    });

    it('should reject an action when neither originSpaceId matches nor the integration policy is visible in the active space', async () => {
      (
        endpointServiceMock.getInternalFleetServices().ensureInCurrentSpace as jest.Mock
      ).mockRejectedValueOnce(new Error('policy not in space'));

      const scoped = await endpointServiceMock.asScoped(request);
      await expect(
        fetchActionRequestById(endpointServiceMock, 'other-space', '123', {
          scoped,
        })
      ).rejects.toThrow('Action [123] not found');
    });
  });
});
