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
import type { KibanaRequest } from '@kbn/core-http-server';
import { stringify } from '../../../endpoint/utils/stringify';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '../../../../common/endpoint/service/artifacts/utils';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

/**
 * Mutates the Find options provided on input to include a filter that will scope the search
 * down to only data that should be visible in active space
 * @param endpointServices
 * @param httpRequest
 * @param findOptions
 */
export const setFindRequestFilterScopeToActiveSpace = async (
  endpointServices: EndpointAppContextService,
  httpRequest: KibanaRequest,
  findOptions: FindExceptionListItemOptions | FindExceptionListsItemOptions
): Promise<void> => {
  if (endpointServices.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    const logger = endpointServices.createLogger('setFindRequestFilterScopeToActiveSpace');

    logger.debug(() => `Find options prior to adjusting filter:\n${stringify(findOptions)}`);

    const spaceId = (await endpointServices.getActiveSpace(httpRequest)).id;
    const fleetServices = endpointServices.getInternalFleetServices(spaceId);
    const soScopedClient = fleetServices.savedObjects.createInternalScopedSoClient({ spaceId });
    const { items: allEndpointPolicyIds } = await fleetServices.packagePolicy.listIds(
      soScopedClient,
      { kuery: fleetServices.endpointPolicyKuery, perPage: 10_000 }
    );

    logger.debug(
      () =>
        `policies currently visible in space ID [${spaceId}]:\n${stringify(allEndpointPolicyIds)}`
    );

    // Filter to scope down the data visible in active space id by appending to the Find options the following filter:
    //      (
    //         All global artifacts
    //         -OR-
    //         All per-policy artifacts assigned to a policy visible in active space
    //      )
    //      -OR-
    //      (
    //         Artifacts NOT containing a `policy:` tag ("dangling" per-policy artifacts)
    //         -AND-
    //         having an owner space ID value that matches active space
    //      )
    //
    const spaceVisibleDataFilter = `
      (
        (
          exception-list-agnostic.attributes.tags:("${GLOBAL_ARTIFACT_TAG}"${
      allEndpointPolicyIds.length === 0
        ? ')'
        : ` OR ${allEndpointPolicyIds
            .map((policyId) => `"${buildPerPolicyTag(policyId)}"`)
            .join(' OR ')}
          )
        )
        OR
        (
          NOT exception-list-agnostic.attributes.tags:"${buildPerPolicyTag('*')}"
          AND
          exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag(spaceId)}"
        )
      )`
    }`;

    if (isSingleListFindOptions(findOptions)) {
      findOptions.filter = `${spaceVisibleDataFilter}${
        findOptions.filter ? ` AND (${findOptions.filter})` : ''
      }`;
    } else {
      if (!findOptions.filter) {
        findOptions.filter = [];
      }

      // Add the filter for every list that was defined in the options
      findOptions.listId.forEach((listId, index) => {
        const userFilter = findOptions.filter[index];
        findOptions.filter[index] = `${spaceVisibleDataFilter}${
          userFilter ? ` AND (${userFilter})` : ''
        }`;
      });
    }

    logger.debug(() => `Find options updated with active space filter:\n${stringify(findOptions)}`);
  }
};

const isSingleListFindOptions = (
  findOptions: FindExceptionListItemOptions | FindExceptionListsItemOptions
): findOptions is FindExceptionListItemOptions => {
  return !Array.isArray(findOptions.listId);
};
