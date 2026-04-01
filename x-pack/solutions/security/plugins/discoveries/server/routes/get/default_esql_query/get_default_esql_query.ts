/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';

import { buildDefaultEsqlQuery } from '@kbn/discoveries/impl/lib/build_default_esql_query';
import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import { assertWorkflowsEnabled } from '../../../lib/assert_workflows_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';

const ROUTE_PATH = '/internal/attack_discovery/attack_discovery/queries/esql/default';

export interface GetDefaultEsqlQueryResponse {
  query: string;
}

export const handleGetDefaultEsqlQuery = async ({
  getStartServices,
  logger,
  request,
}: {
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
  request: KibanaRequest;
}): Promise<GetDefaultEsqlQueryResponse> => {
  const { coreStart, pluginsStart } = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

  const spaceId = getSpaceId({
    request,
    spaces: pluginsStart.spaces?.spacesService,
  });

  const query = await buildDefaultEsqlQuery({
    esClient,
    logger,
    spaceId,
  });

  return { query };
};

export const registerGetDefaultEsqlQueryRoute = (
  router: IRouter,
  logger: Logger,
  {
    getStartServices,
  }: {
    getStartServices: () => Promise<{
      coreStart: CoreStart;
      pluginsStart: DiscoveriesPluginStartDeps;
    }>;
  }
) => {
  router.versioned
    .get({
      access: 'internal',
      path: ROUTE_PATH,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      async (context, request, response) => {
        const disabledResponse = await assertWorkflowsEnabled({ context, response });
        if (disabledResponse) {
          return disabledResponse;
        }

        try {
          const body = await handleGetDefaultEsqlQuery({
            getStartServices,
            logger,
            request,
          });

          return response.ok({ body });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error fetching default ES|QL query: ${errorMessage}`);
          const error = transformError(err);

          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
