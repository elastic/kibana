/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { type IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import {
  EntityResolutionPostRequestBody,
  EntityResolutionPostResponse,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import moment from 'moment/moment';
import { ENTITY_RESOLUTION } from '../../../common/constants';
import { getAssistantTool, getAssistantToolParams } from './helpers';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { buildResponse } from '../../lib/build_response';
import { ElasticAssistantRequestHandlerContext } from '../../types';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const postEntityResolutionRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_RESOLUTION,
      options: {
        tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(EntityResolutionPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(EntityResolutionPostResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<EntityResolutionPostResponse>> => {
        const startTime = moment(); // start timing the generation
        const resp = buildResponse(response);
        const assistantContext = await context.elasticAssistant;
        const logger: Logger = assistantContext.logger;

        try {
          // get the actions plugin start contract from the request context:
          const actions = (await context.elasticAssistant).actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const authenticatedUser = assistantContext.getCurrentUser();
          if (authenticatedUser == null) {
            return resp.error({
              body: `Authenticated user not found`,
              statusCode: 401,
            });
          }
          const pluginName = getPluginNameFromRequest({
            request,
            defaultPluginName: DEFAULT_PLUGIN_NAME,
            logger,
          });

          // get parameters from the request body
          const entitiesIndexPattern = decodeURIComponent(request.body.entitiesIndexPattern);
          const { apiConfig, langSmithApiKey, langSmithProject, size, promptTemplate } =
            request.body;

          // if (!searchEntity) {
          //   return resp.error({
          //     body: `Entity to resolve not found`,
          //     statusCode: 400,
          //   });
          // }

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          // const entityResolutionClient = await assistantContext.getEntityResolutionDataClient();

          // if (!entityResolutionClient) {
          //   return resp.error({
          //     body: `Entity resolution data client not initialized`,
          //     statusCode: 500,
          //   });
          // }

          const assistantTool = getAssistantTool(
            (await context.elasticAssistant).getRegisteredTools,
            pluginName
          );

          if (!assistantTool) {
            return response.notFound(); // attack discovery tool not found
          }

          const assistantToolParams = getAssistantToolParams({
            promptTemplate,
            actionsClient,
            // entityResolutionClient,
            entitiesIndexPattern,
            apiConfig,
            esClient,
            connectorTimeout: CONNECTOR_TIMEOUT,
            langChainTimeout: LANG_CHAIN_TIMEOUT,
            langSmithProject,
            langSmithApiKey,
            logger,
            request,
            size,
          });

          // invoke the attack discovery tool:
          const toolInstance = assistantTool.getTool(assistantToolParams);

          const result = await toolInstance?.invoke('');

          if (!result) {
            return resp.error({
              body: `Entity resolution tool failed to generate`,
              statusCode: 500,
            });
          }

          const castResult = JSON.parse(result) as EntityResolutionPostResponse;
          const endTime = moment(); // end timing the generation

          logger.info(
            `Entity resolution tool took ${endTime.diff(startTime, 'seconds')} seconds to generate`
          );

          return response.ok({
            body: castResult,
          });
        } catch (err) {
          logger.error(err);
          const error = transformError(err);

          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
