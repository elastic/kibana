/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../endpoint_app_context_services';
import type { KibanaResponseFactory, SavedObjectsClientContract } from '@kbn/core/server';

import {
  createMockEndpointAppContext,
  createMockEndpointAppContextServiceSetupContract,
  createMockEndpointAppContextServiceStartContract,
  createRouteHandlerContext,
} from '../../mocks';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '@kbn/fleet-plugin/common';
import { getProtectionUpdatesNoteHandler, postProtectionUpdatesNoteHandler } from './handlers';
import { requestContextMock } from '../../../lib/detection_engine/routes/__mocks__';
import type { EndpointAppContext } from '../../types';
import type { EndpointInternalFleetServicesInterfaceMocked } from '../../services/fleet/endpoint_fleet_services_factory.mocks';

const mockedSOSuccessfulFindResponse = {
  total: 1,
  saved_objects: [
    {
      id: 'id',
      type: 'type',
      namespaces: [DEFAULT_SPACE_ID],
      references: [
        {
          id: 'id_package_policy',
          name: 'package_policy',
          type: 'ingest-package-policies',
        },
      ],
      attributes: { note: 'note' },
      score: 1,
    },
  ],
  page: 1,
  per_page: 10,
};

/** Simulates a note created by 8.19, which lives in the space that was active at creation time */
const mockedSOLegacyFindResponse = {
  ...mockedSOSuccessfulFindResponse,
  saved_objects: [
    {
      ...mockedSOSuccessfulFindResponse.saved_objects[0],
      namespaces: ['legacy-space'],
    },
  ],
};

const mockedSOSuccessfulFindResponseWithDuplicate = {
  ...mockedSOSuccessfulFindResponse,
  total: 2,
  saved_objects: [
    {
      ...mockedSOSuccessfulFindResponse.saved_objects[0],
      namespaces: ['legacy-space'],
      attributes: { note: 'legacy note' },
    },
    {
      ...mockedSOSuccessfulFindResponse.saved_objects[0],
      id: 'default-space-note-id',
      namespaces: [DEFAULT_SPACE_ID],
      attributes: { note: 'default space note' },
    },
  ],
};

const mockedSOSuccessfulFindResponseEmpty = {
  total: 0,
  saved_objects: [],
  page: 1,
  per_page: 10,
};

const createMockedSOSuccessfulCreateResponse = (note: string) => ({
  id: 'id',
  type: 'type',
  references: [],
  attributes: { note },
});

const mockedSOSuccessfulUpdateResponse = [
  'policy-settings-protection-updates-note',
  'id',
  { note: 'note2' },
  {
    references: [
      {
        id: 'id_package_policy',
        name: 'package_policy',
        type: 'ingest-package-policies',
      },
    ],
    refresh: 'wait_for',
  },
];

describe('test protection updates note handler', () => {
  let mockEndpointContext: EndpointAppContext;
  let endpointAppContextService: EndpointAppContextService;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
  let mockResponse: jest.Mocked<KibanaResponseFactory>;
  let mockScopedClient: ScopedClusterClientMock;
  let internalFleetServicesMock: EndpointInternalFleetServicesInterfaceMocked;

  const setActiveSpaceId = (
    handlerContext: ReturnType<typeof createRouteHandlerContext>,
    spaceId: string
  ): void => {
    (handlerContext.securitySolution.getSpaceId as jest.Mock).mockReturnValue(spaceId);
  };

  describe('test protection updates note handler', () => {
    beforeEach(() => {
      mockEndpointContext = createMockEndpointAppContext();
      mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockResponse = httpServerMock.createResponseFactory();
      endpointAppContextService = new EndpointAppContextService();
      endpointAppContextService.setup(createMockEndpointAppContextServiceSetupContract());
      endpointAppContextService.start(createMockEndpointAppContextServiceStartContract());

      internalFleetServicesMock =
        mockEndpointContext.service.getInternalFleetServices() as EndpointInternalFleetServicesInterfaceMocked;

      internalFleetServicesMock.ensureInCurrentSpace.mockResolvedValue(undefined);
      internalFleetServicesMock.getSoClient.mockReturnValue(mockSavedObjectClient);
      (
        mockEndpointContext.service.savedObjects.createInternalScopedSoClient as jest.Mock
      ).mockReturnValue(mockSavedObjectClient);
    });

    afterEach(() => endpointAppContextService.stop());

    it('should search for notes across all spaces and package policy reference types', async () => {
      const protectionUpdatesNoteHandler = getProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponse);

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockSavedObjectClient.find).toBeCalledWith(
        expect.objectContaining({
          namespaces: ['*'],
          hasReference: [
            { type: PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: 'id' },
            { type: LEGACY_PACKAGE_POLICY_SAVED_OBJECT_TYPE, id: 'id' },
          ],
          hasReferenceOperator: 'OR',
        })
      );
    });

    it('should create a new note in the default space if one does not exist', async () => {
      const protectionUpdatesNoteHandler = postProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
        body: { note: 'note' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponseEmpty);

      mockSavedObjectClient.create.mockResolvedValueOnce(
        createMockedSOSuccessfulCreateResponse('note')
      );

      const handlerContext = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);
      setActiveSpaceId(handlerContext, 'legacy-space');

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(handlerContext),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      expect(mockEndpointContext.service.savedObjects.createInternalScopedSoClient).toBeCalledWith({
        spaceId: DEFAULT_SPACE_ID,
        readonly: false,
      });
      expect(mockSavedObjectClient.create).toBeCalledWith(
        'policy-settings-protection-updates-note',
        { note: 'note' },
        {
          references: [
            { id: 'id', name: 'package_policy', type: PACKAGE_POLICY_SAVED_OBJECT_TYPE },
          ],
          refresh: 'wait_for',
        }
      );
    });

    it('should update an existing note on post if one exists', async () => {
      const protectionUpdatesNoteHandler = postProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
        body: { note: 'note2' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponse);

      mockSavedObjectClient.update.mockResolvedValueOnce(
        createMockedSOSuccessfulCreateResponse('note2')
      );

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      expect(mockSavedObjectClient.update).toBeCalledWith(...mockedSOSuccessfulUpdateResponse);
    });

    it('should update a legacy note using a writable client scoped to the note namespace', async () => {
      const protectionUpdatesNoteHandler = postProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
        body: { note: 'note2' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOLegacyFindResponse);

      mockSavedObjectClient.update.mockResolvedValueOnce(
        createMockedSOSuccessfulCreateResponse('note2')
      );

      const handlerContext = createRouteHandlerContext(mockScopedClient, mockSavedObjectClient);
      setActiveSpaceId(handlerContext, 'request-space');

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(handlerContext),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      expect(mockEndpointContext.service.getInternalFleetServices).toBeCalledWith('request-space');
      expect(mockEndpointContext.service.savedObjects.createInternalScopedSoClient).toBeCalledWith({
        spaceId: 'legacy-space',
        readonly: false,
      });
      expect(mockSavedObjectClient.update).toBeCalledWith(...mockedSOSuccessfulUpdateResponse);
    });

    it('should return the note if one exists', async () => {
      const protectionUpdatesNoteHandler = getProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponse);

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as { note: string };
      expect(result.note).toEqual('note');
    });

    it('should return a legacy note that lives outside of the default space', async () => {
      const protectionUpdatesNoteHandler = getProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOLegacyFindResponse);

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalled();
      const result = mockResponse.ok.mock.calls[0][0]?.body as { note: string };
      expect(result.note).toEqual('note');
    });

    it('should prefer the default-space note when duplicate notes exist', async () => {
      const protectionUpdatesNoteHandler = getProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponseWithDuplicate);

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.ok).toBeCalledWith({ body: { note: 'default space note' } });
    });

    it('should return notFound if no note exists', async () => {
      const protectionUpdatesNoteHandler = getProtectionUpdatesNoteHandler(mockEndpointContext);
      const mockRequest = httpServerMock.createKibanaRequest({
        params: { package_policy_id: 'id' },
      });

      mockSavedObjectClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponseEmpty);

      await protectionUpdatesNoteHandler(
        requestContextMock.convertContext(
          createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
        ),
        mockRequest,
        mockResponse
      );

      expect(mockResponse.notFound).toBeCalled();
    });

    describe('with space awareness enabled', () => {
      it('should call ensureInCurrentSpace with integration policy id', async () => {
        const mockEnsureInCurrentSpace = mockEndpointContext.service.getInternalFleetServices()
          .ensureInCurrentSpace as jest.Mock;
        const protectionUpdatesNoteHandler = postProtectionUpdatesNoteHandler(mockEndpointContext);
        const mockRequest = httpServerMock.createKibanaRequest({
          params: { package_policy_id: 'integration-policy-id' },
          body: { note: 'this is a very important note' },
        });

        const mockSOClient = mockEndpointContext.service
          .getInternalFleetServices()
          .getSoClient() as jest.Mocked<SavedObjectsClientContract>;
        mockSOClient.find.mockResolvedValueOnce(mockedSOSuccessfulFindResponseEmpty);
        mockSOClient.create.mockResolvedValueOnce(createMockedSOSuccessfulCreateResponse('note'));
        await protectionUpdatesNoteHandler(
          requestContextMock.convertContext(
            createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
          ),
          mockRequest,
          mockResponse
        );
        expect(mockEnsureInCurrentSpace).toBeCalledWith({
          integrationPolicyIds: ['integration-policy-id'],
        });
      });

      it('should not access note data when ensureInCurrentSpace fails', async () => {
        internalFleetServicesMock.ensureInCurrentSpace.mockRejectedValueOnce(
          new Error('policy not accessible in current space')
        );
        const protectionUpdatesNoteHandler = postProtectionUpdatesNoteHandler(mockEndpointContext);
        const mockRequest = httpServerMock.createKibanaRequest({
          params: { package_policy_id: 'integration-policy-id' },
          body: { note: 'this is a very important note' },
        });

        await protectionUpdatesNoteHandler(
          requestContextMock.convertContext(
            createRouteHandlerContext(mockScopedClient, mockSavedObjectClient)
          ),
          mockRequest,
          mockResponse
        );

        expect(mockSavedObjectClient.find).not.toBeCalled();
        expect(mockSavedObjectClient.create).not.toBeCalled();
        expect(mockSavedObjectClient.update).not.toBeCalled();
        expect(mockResponse.ok).not.toBeCalled();
        expect(mockResponse.customError).toBeCalledWith(
          expect.objectContaining({ statusCode: 500 })
        );
      });
    });
  });
});
