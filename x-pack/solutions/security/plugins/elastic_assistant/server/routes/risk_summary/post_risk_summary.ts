/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import type { IRouter, Logger, IKibanaResponse } from '@kbn/core/server';
import {
  RiskScoreSummaryPostRequestBody,
  RiskScoreSummaryPostResponse,
} from '@kbn/elastic-assistant-common';
import { transformError } from '@kbn/securitysolution-es-utils';

import moment from 'moment/moment';
import type { Alert } from '@kbn/alerts-as-data-utils';
import _ from 'lodash';
import { RISK_SUMMARY } from '../../../common/constants';
import { getAssistantTool, getAssistantToolParams } from './helpers';
import { DEFAULT_PLUGIN_NAME, getPluginNameFromRequest } from '../helpers';
import { buildResponse } from '../../lib/build_response';
import type { ElasticAssistantRequestHandlerContext } from '../../types';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes
const LANG_CHAIN_TIMEOUT = ROUTE_HANDLER_TIMEOUT - 10_000; // 9 minutes 50 seconds
const CONNECTOR_TIMEOUT = LANG_CHAIN_TIMEOUT - 10_000; // 9 minutes 40 seconds

export const postRiskSummaryRoute = (router: IRouter<ElasticAssistantRequestHandlerContext>) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_SUMMARY,
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
            body: buildRouteValidationWithZod(RiskScoreSummaryPostRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(RiskScoreSummaryPostResponse) },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<RiskScoreSummaryPostResponse>> => {
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
          const { apiConfig, langSmithApiKey, langSmithProject, identifier, identifierKey } =
            request.body as RiskScoreSummaryPostRequestBody;

          if (!identifier || !identifierKey) {
            return resp.error({
              body: `Identifier and identifierKey are required`,
              statusCode: 400,
            });
          }

          // get an Elasticsearch client for the authenticated user:
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const searchRes = await esClient.search({
            index: '.internal.alerts-security.alerts-default*',
            size: 25,
            sort: [
              {
                '@timestamp': {
                  order: 'desc',
                },
              },
            ],
            query: {
              terms: {
                [identifierKey]: [identifier],
              },
            },
          });

          const mostRecentAlerts: Alert[] = searchRes.hits.hits.map(
            (hit) =>
              _.omit(hit._source as object, [
                'Endpoint',
                'process.Ext',
                'process.parent',
                'ecs',
                'data_stream',
                'elastic',
                'agent',
                'kibana.alert.rule.severity_mapping',
                'kibana.alert.ancestors',
                'kibana.alert.rule.producer',
                'kibana.alert.rule.revision',
                'kibana.alert.rule.rule_type_id',
                'kibana.alert.original_event.agent_id_status',
                'kibana.alert.original_event.sequence',
                'kibana.alert.original_event.action',
                'kibana.alert.original_event.id',
                'kibana.alert.rule.parameters.severity_mapping',
                'kibana.alert.rule.parameters["severity_mapping"]', // Expressed as a lodash path
              ]) as Alert
          );

          mostRecentAlerts.forEach((alert) => {
            // @ts-ignore
            delete alert['kibana.alert.rule.parameters'].severity_mapping;
            // @ts-ignore
            delete alert['kibana.alert.rule.parameters'].risk_score_mapping;
          });

          const assistantTool = getAssistantTool(
            (await context.elasticAssistant).getRegisteredTools,
            pluginName
          );

          if (!assistantTool) {
            return response.notFound();
          }

          const assistantToolParams = getAssistantToolParams({
            mostRecentAlerts,
            identifier,
            identifierKey,
            actionsClient,
            apiConfig,
            esClient,
            connectorTimeout: CONNECTOR_TIMEOUT,
            langChainTimeout: LANG_CHAIN_TIMEOUT,
            langSmithProject,
            langSmithApiKey,
            logger,
            request,
          });

          const toolInstance = await assistantTool.getTool(assistantToolParams);

          const result = await toolInstance?.invoke('');

          if (!result) {
            return resp.error({
              body: `Entity resolution tool failed to generate`,
              statusCode: 500,
            });
          }

          const castResult = JSON.parse(result) as RiskScoreSummaryPostResponse;
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
