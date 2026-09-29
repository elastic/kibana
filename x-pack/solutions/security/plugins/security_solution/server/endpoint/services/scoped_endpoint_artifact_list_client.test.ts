/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { FindExceptionListItemOptions } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client_types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { EndpointAppContextService } from '../endpoint_app_context_services';
import { ScopedEndpointArtifactListClient } from './scoped_endpoint_artifact_list_client';

vi.mock('../../lists_integration/endpoint/utils/build_space_data_filter', () => {
      const mocked = {
      buildSpaceDataFilter: vi.fn().mockResolvedValue({ filter: 'space-filter-kql' }),
    };
      return { ...mocked, default: mocked };
    });

const mockValidatePreSingleListFind = vi.fn().mockResolvedValue(undefined);

vi.mock('../../lists_integration/endpoint/validators/trusted_app_validator', () => {
      const mocked = {
      TrustedAppValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: mockValidatePreSingleListFind,
        })),
        {
          isTrustedApp: vi.fn(({ listId }: { listId: string }) => listId === 'endpoint_trusted_apps'),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../lists_integration/endpoint/validators/trusted_device_validator', () => {
      const mocked = {
      TrustedDeviceValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
        })),
        {
          isTrustedDevice: vi.fn(
            ({ listId }: { listId: string }) => listId === 'endpoint_trusted_devices'
          ),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock(
  '../../lists_integration/endpoint/validators/host_isolation_exceptions_validator',
  () => {
      const mocked = {
        HostIsolationExceptionsValidator: Object.assign(
          vi.fn().mockImplementation(() => ({
            validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
          })),
          {
            isHostIsolationException: vi.fn(
              ({ listId }: { listId: string }) => listId === 'endpoint_host_isolation_exceptions'
            ),
          }
        ),
      };
      return { ...mocked, default: mocked };
    }
);

vi.mock('../../lists_integration/endpoint/validators/event_filter_validator', () => {
      const mocked = {
      EventFilterValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
        })),
        {
          isEventFilter: vi.fn(
            ({ listId }: { listId: string }) => listId === 'endpoint_event_filters'
          ),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../lists_integration/endpoint/validators/blocklist_validator', () => {
      const mocked = {
      BlocklistValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
        })),
        {
          isBlocklist: vi.fn(({ listId }: { listId: string }) => listId === 'endpoint_blocklists'),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../lists_integration/endpoint/validators/endpoint_exceptions_validator', () => {
      const mocked = {
      EndpointExceptionsValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
        })),
        {
          isEndpointException: vi.fn(({ listId }: { listId: string }) => listId === 'endpoint_list'),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../lists_integration/endpoint/validators/custom_yara_signatures_validator', () => {
      const mocked = {
      CustomYaraSignaturesValidator: Object.assign(
        vi.fn().mockImplementation(() => ({
          validatePreSingleListFind: vi.fn().mockResolvedValue(undefined),
        })),
        {
          isCustomYaraSignature: vi.fn(
            ({ listId }: { listId: string }) => listId === 'endpoint_custom_yara_signatures'
          ),
        }
      ),
    };
      return { ...mocked, default: mocked };
    });

const { buildSpaceDataFilter } = (await vi.importMock('../../lists_integration/endpoint/utils/build_space_data_filter')) as { buildSpaceDataFilter: Mock };

const { TrustedAppValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/trusted_app_validator')) as { TrustedAppValidator: Mock & { isTrustedApp: Mock } };

const { BlocklistValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/blocklist_validator')) as { BlocklistValidator: Mock & { isBlocklist: Mock } };

const { TrustedDeviceValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/trusted_device_validator')) as { TrustedDeviceValidator: Mock & { isTrustedDevice: Mock } };

const { HostIsolationExceptionsValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/host_isolation_exceptions_validator')) as {
  HostIsolationExceptionsValidator: Mock & { isHostIsolationException: Mock };
};

const { EventFilterValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/event_filter_validator')) as { EventFilterValidator: Mock & { isEventFilter: Mock } };

const { EndpointExceptionsValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/endpoint_exceptions_validator')) as { EndpointExceptionsValidator: Mock & { isEndpointException: Mock } };

const { CustomYaraSignaturesValidator } = (await vi.importMock('../../lists_integration/endpoint/validators/custom_yara_signatures_validator')) as { CustomYaraSignaturesValidator: Mock & { isCustomYaraSignature: Mock } };

describe('ScopedEndpointArtifactListClient', () => {
  let mockExceptionListClient: Mocked<ExceptionListClient>;
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
    vi.clearAllMocks();
    mockValidatePreSingleListFind.mockResolvedValue(undefined);

    mockExceptionListClient = {
      findExceptionListItem: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        per_page: 20,
      }),
    } as unknown as Mocked<ExceptionListClient>;

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
      ['customYaraSignatures', CustomYaraSignaturesValidator],
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
        ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id,
      ];

      for (const listId of allListIds) {
        await client.findEndpointArtifactListItems({ ...baseOptions, listId });
      }

      expect(buildSpaceDataFilter).toHaveBeenCalledTimes(1);
      expect(mockExceptionListClient.findExceptionListItem).toHaveBeenCalledTimes(7);
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
      CustomYaraSignaturesValidator.isCustomYaraSignature.mockReturnValueOnce(false);

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
