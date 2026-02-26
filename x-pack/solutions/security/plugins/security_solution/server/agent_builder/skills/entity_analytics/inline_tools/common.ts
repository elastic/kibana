/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/common';
import { DEFAULT_DATA_VIEW_ID, DEFAULT_ALERTS_INDEX } from '../../../../../common/constants';
import { IdentifierType } from '../../../../../common/api/entity_analytics/common/common.gen';
import type { EntityAnalyticsRoutesDeps } from '../../../../lib/entity_analytics/types';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { EntityTypeToIdentifierField } from '../../../../../common/entity_analytics/types';

export const entityAnalyticsCommonSchema = z.object({
  entityType: IdentifierType.describe('The type of entity: host, user, service, or generic'),
  prompt: z.string().describe('The prompt or question that calling this tool will help to answer.'),
  queryExtraContext: z
    .string()
    .describe('Information from previous chat messages like an ESQL filter that should be used.'),
});

export type EntityAnalyticsCommonType = Omit<
  z.infer<typeof entityAnalyticsCommonSchema>,
  'entityType'
> & {
  entityType: EntityType;
};

interface BootstrapCommonServicesOpts {
  entityType: EntityType;
  esClient: IScopedClusterClient;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  request: KibanaRequest;
  spaceId: string;
}

export const bootstrapCommonServices = async ({
  entityType,
  esClient,
  getStartServices,
  request,
  spaceId,
}: BootstrapCommonServicesOpts) => {
  const [core, startPlugins] = await getStartServices();
  const soClient = core.savedObjects.getScopedClient(request);
  const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
    soClient,
    esClient.asCurrentUser
  );
  const uiSettingsClient = core.uiSettings.asScopedToClient(soClient);
  const securityDataViewId = `${DEFAULT_DATA_VIEW_ID}-${spaceId}`;
  const dataView = await dataViewsService.get(securityDataViewId);
  const isEntityStoreV2Enabled = await uiSettingsClient.get<boolean>(FF_ENABLE_ENTITY_STORE_V2);

  const indexPattern = dataView.getIndexPattern();
  // remove alert indices from the pattern
  const indexPatterns = indexPattern
    .split(',')
    .filter((pattern) => !pattern.includes(DEFAULT_ALERTS_INDEX)) // Filter out alerts index. The explore dataview isn't available in the server side.
    .join(',');

  return {
    defaultMessage: getGeneralSecuritySolutionMessage(entityType, indexPatterns),
    isEntityStoreV2Enabled,
  };
};

const getGeneralSecuritySolutionMessage = (entityType: EntityType, indexPatterns: string) => {
  return `
If you believe that the current information and index mappings are not enough to answer the user's question, you must not generate an ESQL query.
Always try querying the most appropriate domain index when available.
When it isn't enough, you can query security solution events and logs.
For that, you must generate an ES|QL, and you **MUST ALWAYS** use the following FROM clause (ONLY FOR LOGS AND NOT FOR OTHER INDICES): "FROM ${indexPatterns}"
When searching for logs of a ${entityType} you **MUST ALWAYS** use the following WHERE clause "WHERE ${EntityTypeToIdentifierField[entityType]} == {identifier}"`;
};

export const escapeEsqlString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
