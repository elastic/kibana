/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { FindExceptionListItemOptions } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client_types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { EndpointAppContextService } from '../endpoint_app_context_services';
import { ScopedEndpointArtifactListClient } from './scoped_endpoint_artifact_list_client';

jest.mock('../../lists_integration/endpoint/utils/build_space_data_filter', () => ({
  buildSpaceDataFilter: jest.fn().mockResolvedValue({ filter: 'space-filter-kql' }),
}));

const mockValidatePreSingleListFind = jest.fn().mockResolvedValue(undefined);

jest.mock('../../lists_integration/endpoint/validators/trusted_app_validator', () => ({
  TrustedAppValidator: Object.assign(
    jest.fn().mockImplementation(() => ({
      validatePreSingleListFind: mockValidatePreSingleListFind,
    })),
    {
      isTrustedApp: jest.fn(({ listId }: { listId: string }) => listId === 'endpoint_trusted_apps'),
    }
  ),
}));

jest.mock('../../lists_integration/endpoint/validators/trusted_device_validator', () => ({
  TrustedDeviceValidator: Object.assign(
    jest.fn().mockImplementation(() => ({
      validatePreSingleListFind: jest.fn().mockResolvedValue(undefined),
    })),
    {
      isTrustedDevice: jest.fn(
        ({ listId }: { listId: string }) => listId === 'endpoint_trusted_devices'
      ),
    }
  ),
}));

jest.mock(
  '../../lists_integration/endpoint/validators/host_isolation_exceptions_validator',
  () => ({
    HostIsolationExceptionsValidator: Object.assign(
      jest.fn().mockImplementation(() => ({
        validatePreSingleListFind: jest.fn().mockResolvedValue(undefined),
      })),
      {
        isHostIsolationException: jest.fn(
          ({ listId }: { listId: string }) => listId === 'endpoint_host_isolation_exceptions'
        ),
      }
    ),
  })
);

jest.mock('../../lists_integration/endpoint/validators/event_filter_validator', () => ({
  EventFilterValidator: Object.assign(
    jest.fn().mockImplementation(() => ({
      validatePreSingleListFind: jest.fn().mockResolvedValue(undefined),
    })),
    {
      isEventFilter: jest.fn(
        ({ listId }: { listId: string }) => listId === 'endpoint_event_filters'
      ),
    }
  ),
}));

jest.mock('../../lists_integration/endpoint/validators/blocklist_validator', () => ({
  BlocklistValidator: Object.assign(
    jest.fn().mockImplementation(() => ({
      validatePreSingleListFind: jest.fn().mockResolvedValue(undefined),
    })),
    {
      isBlocklist: jest.fn(({ listId }: { listId: string }) => listId === 'endpoint_blocklists'),
    }
  ),
}));

jest.mock('../../lists_integration/endpoint/validators/endpoint_exceptions_validator', () => ({
  EndpointExceptionsValidator: Object.assign(
    jest.fn().mockImplementation(() => ({
      validatePreSingleListFind: jest.fn().mockResolvedValue(undefined),
    })),
    {
      isEndpointException: jest.fn(({ listId }: { listId: string }) => listId === 'endpoint_list'),
    }
  ),
}));

const { buildSpaceDataFilter } = jest.requireMock(
  '../../lists_integration/endpoint/utils/build_space_data_filter'
) as { buildSpaceDataFilter: jest.Mock };

const { TrustedAppValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/trusted_app_validator'
) as { TrustedAppValidator: jest.Mock & { isTrustedApp: jest.Mock } };

const { BlocklistValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/blocklist_validator'
) as { BlocklistValidator: jest.Mock & { isBlocklist: jest.Mock } };

const { TrustedDeviceValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/trusted_device_validator'
) as { TrustedDeviceValidator: jest.Mock & { isTrustedDevice: jest.Mock } };

const { HostIsolationExceptionsValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/host_isolation_exceptions_validator'
) as {
  HostIsolationExceptionsValidator: jest.Mock & { isHostIsolationException: jest.Mock };
};

const { EventFilterValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/event_filter_validator'
) as { EventFilterValidator: jest.Mock & { isEventFilter: jest.Mock } };

const { EndpointExceptionsValidator } = jest.requireMock(
  '../../lists_integration/endpoint/validators/endpoint_exceptions_validator'
) as { EndpointExceptionsValidator: jest.Mock & { isEndpointException: jest.Mock } };

describe('ScopedEndpointArtifactListClient', () => {
  let mockExceptionListClient: jest.Mocked<ExceptionListClient>;
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockRequest: KibanaRequest;
  let client: ScopedEndpointArtifactListClient;

  const baseOptions: FindExceptionListItemOptions = {
    listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
    namespaceType: 'agnostic',
    filter: undefined,
    perPage: 20,
    page: 1,
    sortField: undefined,
    sortOrder: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePreSingleListFind.mockResolvedValue(undefined);

    mockExceptionListClient = {
      findExceptionListItem: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      }),
    } as unknown as jest.Mocked<ExceptionListClient>;

    mockEndpointAppContextService = {} as EndpointAppContextService;
    mockRequest = httpServerMock.createKibanaRequest();

    client = new ScopedEndpointArtifactListClient(
      mockExceptionListClient,
      mockEndpointAppContextService,
      mockRequest
    );
  });

  describe('findEndpointArtifactListItems', () => {
    it('rejects unknown list IDs', async () => {
      await expect(
        client.findEndpointArtifactListItems({
          ...baseOptions,
          listId: 'unknown-list-id',
        })
      ).rejects.toThrow('Unknown endpoint artifact list ID: unknown-list-id');
    });

    it.each([
      ['trustedApps', TrustedAppValidator],
      ['trustedDevices', TrustedDeviceValidator],
      ['hostIsolationExceptions', HostIsolationExceptionsValidator],
      ['eventFilters', EventFilterValidator],
      ['blocklists', BlocklistValidator],
      ['endpointExceptions', EndpointExceptionsValidator],
    ] as const)('validates access before querying for %s', async (artifactKey, ValidatorMock) => {
      await client.findEndpointArtifactListItems({
        ...baseOptions,
        listId: ENDPOINT_ARTIFACT_LISTS[artifactKey].id,
      });

      expect(ValidatorMock).toHaveBeenCalledWith(mockEndpointAppContextService, mockRequest);
      expect(mockExceptionListClient.findExceptionListItem).toHaveBeenCalled();
    });

    it('applies space filter to queries', async () => {
      await client.findEndpointArtifactListItems(baseOptions);

      const callArgs = mockExceptionListClient.findExceptionListItem.mock.calls[0][0];
      expect(callArgs.filter).toBe('space-filter-kql');
    });

    it('combines space filter with user-provided filter', async () => {
      await client.findEndpointArtifactListItems({
        ...baseOptions,
        filter: 'user-filter',
      });

      const callArgs = mockExceptionListClient.findExceptionListItem.mock.calls[0][0];
      expect(callArgs.filter).toBe('space-filter-kql AND (user-filter)');
    });

    it('applies space filter to blocklists', async () => {
      await client.findEndpointArtifactListItems({
        ...baseOptions,
        listId: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      });

      const callArgs = mockExceptionListClient.findExceptionListItem.mock.calls[0][0];
      expect(callArgs.filter).toBe('space-filter-kql');
    });

    it('enforces agnostic namespace regardless of caller input', async () => {
      await client.findEndpointArtifactListItems({
        ...baseOptions,
        namespaceType: 'single' as FindExceptionListItemOptions['namespaceType'],
      });

      const callArgs = mockExceptionListClient.findExceptionListItem.mock.calls[0][0];
      expect(callArgs.namespaceType).toBe('agnostic');
    });

    it('does not mutate the caller options object', async () => {
      const originalOptions = { ...baseOptions, filter: 'original-filter' };
      const optionsCopy = { ...originalOptions };

      await client.findEndpointArtifactListItems(originalOptions);

      expect(originalOptions).toEqual(optionsCopy);
    });

    it('caches space filter across multiple calls', async () => {
      const allListIds = [
        ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
        ENDPOINT_ARTIFACT_LISTS.trustedDevices.id,
        ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
        ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id,
        ENDPOINT_ARTIFACT_LISTS.blocklists.id,
      ];

      for (const listId of allListIds) {
        await client.findEndpointArtifactListItems({ ...baseOptions, listId });
      }

      expect(buildSpaceDataFilter).toHaveBeenCalledTimes(1);
      expect(mockExceptionListClient.findExceptionListItem).toHaveBeenCalledTimes(6);
    });

    it('propagates validator errors without crashing', async () => {
      const error = new Error('Forbidden');
      (error as Error & { statusCode: number }).statusCode = 403;
      mockValidatePreSingleListFind.mockRejectedValueOnce(error);

      await expect(client.findEndpointArtifactListItems(baseOptions)).rejects.toThrow('Forbidden');
    });

    it('delegates to findExceptionListItem with correct arguments', async () => {
      const options: FindExceptionListItemOptions = {
        ...baseOptions,
        search: 'test search',
        perPage: 10,
        page: 2,
      };

      await client.findEndpointArtifactListItems(options);

      const callArgs = mockExceptionListClient.findExceptionListItem.mock.calls[0][0];
      expect(callArgs.listId).toBe(ENDPOINT_ARTIFACT_LISTS.trustedApps.id);
      expect(callArgs.search).toBe('test search');
      expect(callArgs.perPage).toBe(10);
      expect(callArgs.page).toBe(2);
      expect(callArgs.namespaceType).toBe('agnostic');
    });

    it('fails closed when no validator matches a known list ID', async () => {
      TrustedAppValidator.isTrustedApp.mockReturnValueOnce(false);
      TrustedDeviceValidator.isTrustedDevice.mockReturnValueOnce(false);
      HostIsolationExceptionsValidator.isHostIsolationException.mockReturnValueOnce(false);
      EventFilterValidator.isEventFilter.mockReturnValueOnce(false);
      BlocklistValidator.isBlocklist.mockReturnValueOnce(false);
      EndpointExceptionsValidator.isEndpointException.mockReturnValueOnce(false);

      await expect(
        client.findEndpointArtifactListItems({
          ...baseOptions,
          listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
        })
      ).rejects.toThrow('No validator found for endpoint artifact list ID');

      expect(mockExceptionListClient.findExceptionListItem).not.toHaveBeenCalled();
    });
  });
});
