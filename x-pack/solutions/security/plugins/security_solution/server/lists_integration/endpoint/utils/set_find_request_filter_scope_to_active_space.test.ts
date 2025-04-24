/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FindExceptionListItemOptions,
  FindExceptionListsItemOptions,
} from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client_types';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import { setFindRequestFilterScopeToActiveSpace } from './set_find_request_filter_scope_to_active_space';
import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';

describe('Artifacts: setFindRequestFilterScopeToActiveSpace()', () => {
  let endpointAppContextServices: EndpointAppContextService;
  let kibanaRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let findOptionsMock: FindExceptionListItemOptions | FindExceptionListsItemOptions;

  beforeEach(() => {
    endpointAppContextServices = createMockEndpointAppContextService();
    kibanaRequest = httpServerMock.createKibanaRequest();

    (
      endpointAppContextServices.getInternalFleetServices()
        .packagePolicy as jest.Mocked<PackagePolicyClient>
    ).listIds.mockResolvedValue({
      items: ['policy-1', 'policy-2'],
      total: 2,
      page: 1,
      perPage: 20,
    });

    findOptionsMock = {
      listId: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      namespaceType: 'agnostic',
      filter: undefined,
      perPage: 20,
      page: 1,
      sortField: undefined,
      sortOrder: undefined,
    };

    // @ts-expect-error updating a readonly field
    endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = true;
  });

  it('should nothing if feature flag is disabled', async () => {
    // @ts-expect-error updating a readonly field
    endpointAppContextServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled = false;
    await setFindRequestFilterScopeToActiveSpace(
      endpointAppContextServices,
      kibanaRequest,
      findOptionsMock
    );

    expect(findOptionsMock.filter).toBeUndefined();
  });

  it('should inject additional filtering into find request', async () => {
    await setFindRequestFilterScopeToActiveSpace(
      endpointAppContextServices,
      kibanaRequest,
      findOptionsMock
    );

    expect(findOptionsMock.filter).toEqual(`
      (
        (
          exception-list-agnostic.attributes.tags:("policy:all" OR "policy:policy-1" OR "policy:policy-2"
          )
        )
        OR
        (
          NOT exception-list-agnostic.attributes.tags:"policy:*"
          AND
          exception-list-agnostic.attributes.tags:"ownerSpaceId:default"
        )
      )`);
  });

  it('should inject additional filtering into find request when it already has a filter value', async () => {
    findOptionsMock.filter = 'somevalue:match-this';
    await setFindRequestFilterScopeToActiveSpace(
      endpointAppContextServices,
      kibanaRequest,
      findOptionsMock
    );

    expect(findOptionsMock.filter).toEqual(`
      (
        (
          exception-list-agnostic.attributes.tags:("policy:all" OR "policy:policy-1" OR "policy:policy-2"
          )
        )
        OR
        (
          NOT exception-list-agnostic.attributes.tags:"policy:*"
          AND
          exception-list-agnostic.attributes.tags:"ownerSpaceId:default"
        )
      ) AND (somevalue:match-this)`);
  });

  it('should inject additional filtering when there is no visible policies in active space', async () => {
    (
      endpointAppContextServices.getInternalFleetServices()
        .packagePolicy as jest.Mocked<PackagePolicyClient>
    ).listIds.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 20,
    });
    await setFindRequestFilterScopeToActiveSpace(
      endpointAppContextServices,
      kibanaRequest,
      findOptionsMock
    );

    expect(findOptionsMock.filter).toEqual(`
      (
        (
          exception-list-agnostic.attributes.tags:("policy:all")
        )
        OR
        (
          NOT exception-list-agnostic.attributes.tags:"policy:*"
          AND
          exception-list-agnostic.attributes.tags:"ownerSpaceId:default"
        )
      )`);
  });

  it('should inject additional filtering when using multi-list search format', async () => {
    findOptionsMock.listId = [
      ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      ENDPOINT_ARTIFACT_LISTS.eventFilters.id,
    ];
    findOptionsMock.filter = ['', 'somevalue:match-this'];
    await setFindRequestFilterScopeToActiveSpace(
      endpointAppContextServices,
      kibanaRequest,
      findOptionsMock
    );

    expect(findOptionsMock.filter).toEqual([
      '\n      (\n        (\n          exception-list-agnostic.attributes.tags:("policy:all" OR "policy:policy-1" OR "policy:policy-2"\n          )\n        )\n        OR\n        (\n          NOT exception-list-agnostic.attributes.tags:"policy:*"\n          AND\n          exception-list-agnostic.attributes.tags:"ownerSpaceId:default"\n        )\n      )',
      '\n      (\n        (\n          exception-list-agnostic.attributes.tags:("policy:all" OR "policy:policy-1" OR "policy:policy-2"\n          )\n        )\n        OR\n        (\n          NOT exception-list-agnostic.attributes.tags:"policy:*"\n          AND\n          exception-list-agnostic.attributes.tags:"ownerSpaceId:default"\n        )\n      ) AND (somevalue:match-this)',
    ]);
  });
});
