/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { stringify } from '../../../endpoint/utils/stringify';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts';
import {
  buildPerPolicyTag,
  buildSpaceOwnerIdTag,
} from '../../../../common/endpoint/service/artifacts/utils';

/**
 * Builds the KQL string for filtering artifacts that can be accessed from active space
 * @param endpointServices
 * @param httpRequest
 */
export const buildSpaceDataFilter = async (
  endpointServices: EndpointAppContextService,
  httpRequest: KibanaRequest
): Promise<{ filter: string }> => {
  const logger = endpointServices.createLogger('buildSpaceDataFilter');
  const spaceId = (await endpointServices.getActiveSpace(httpRequest)).id;
  const fleetServices = endpointServices.getInternalFleetServices(spaceId);
  const soScopedClient = fleetServices.savedObjects.createInternalScopedSoClient({ spaceId });
  const { items: allEndpointPolicyIds } = await fleetServices.packagePolicy.listIds(
    soScopedClient,
    { kuery: fleetServices.endpointPolicyKuery, perPage: 10_000 }
  );

  logger.debug(
    () => `policies currently visible in space ID [${spaceId}]:\n${stringify(allEndpointPolicyIds)}`
  );

  // Filter to scope down the data visible in active space id:
  //
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
          )`
  }
        )
        OR
        (
          NOT exception-list-agnostic.attributes.tags:"${buildPerPolicyTag('*')}"
          AND
          exception-list-agnostic.attributes.tags:"${buildSpaceOwnerIdTag(spaceId)}"
        )
      )`;

  logger.debug(`Filter for space id [${spaceId}]:\n${spaceVisibleDataFilter}`);

  return { filter: spaceVisibleDataFilter };
};
