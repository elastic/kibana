/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_FIND,
} from '@kbn/elastic-assistant-common';
import {
  FindAlertSummaryRequestQuery,
  FindAlertSummaryResponse,
} from '@kbn/elastic-assistant-common/impl/schemas/alert_summary/find_alert_summary_route.gen';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import _ from 'lodash';
import { getPrompt, promptDictionary } from '../../lib/prompt';
import { ElasticAssistantPluginRouter } from '../../types';
import { buildResponse } from '../utils';
import { EsAlertSummarySchema } from '../../ai_assistant_data_clients/alert_summary/types';
import { transformESSearchToAlertSummary } from '../../ai_assistant_data_clients/alert_summary/helpers';
import { performChecks } from '../helpers';
import { promptGroupId } from '../../lib/prompt/local_prompt_object';

export const findAlertSummaryRoute = (router: ElasticAssistantPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      access: 'internal',
      path: ELASTIC_AI_ASSISTANT_ALERT_SUMMARY_URL_FIND,
      security: {
        authz: {
          requiredPrivileges: ['elasticAssistant'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindAlertSummaryRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<FindAlertSummaryResponse>> => {
        const assistantResponse = buildResponse(response);

        try {
          const { query } = request;
          const ctx = await context.resolve(['core', 'elasticAssistant', 'licensing']);
          // Perform license and authenticated user checks
          const checkResponse = await performChecks({
            context: ctx,
            request,
            response,
          });
          if (!checkResponse.isSuccess) {
            return checkResponse.response;
          }
          const dataClient = await ctx.elasticAssistant.getAlertSummaryDataClient();
          const actions = ctx.elasticAssistant.actions;
          const actionsClient = await actions.getActionsClientWithRequest(request);
          const savedObjectsClient = ctx.elasticAssistant.savedObjectsClient;
          const result = await dataClient?.findDocuments<EsAlertSummarySchema>({
            perPage: query.per_page,
            page: query.page,
            sortField: query.sort_field,
            sortOrder: query.sort_order,
            ...(query.filter ? { filter: decodeURIComponent(query.filter) } : {}),
            fields: query.fields?.map((f) => _.snakeCase(f)),
          });
          const prompt = await getPrompt({
            actionsClient,
            connectorId: query.connector_id,
            promptId: promptDictionary.alertSummary,
            promptGroupId: promptGroupId.aiForSoc,
            savedObjectsClient,
          });

          if (result) {
            return response.ok({
              body: {
                perPage: result.perPage,
                page: result.page,
                total: result.total,
                data: transformESSearchToAlertSummary(result.data),
                prompt,
              },
            });
          }
          return response.ok({
            body: { perPage: query.per_page, page: query.page, data: [], total: 0, prompt },
          });
        } catch (err) {
          const error = transformError(err);
          return assistantResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
