/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS, ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import type { EndpointAppContextService } from '../endpoint_app_context_services';

export const migrateEndpointDataToSupportSpaces = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const artifactMigrationResults = await migrateArtifactsToSpaceAware(endpointService);
};

const migrateArtifactsToSpaceAware = async (
  endpointService: EndpointAppContextService
): Promise<void> => {
  const logger = endpointService.createLogger('migrateArtifactsToSpaceAware');

  logger.info(`starting migration of endpoint artifacts in support of spaces`);

  const exceptionsClient = endpointService.getExceptionListsClient();
  const listIds: string[] = Object.values(ENDPOINT_ARTIFACT_LISTS).map(({ id }) => id);
  listIds.push(ENDPOINT_LIST_ID);

  //
};
