/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IKibanaResponse } from '@kbn/core/server';
import moment from 'moment/moment';
import type { Alert } from '@kbn/alerts-as-data-utils';
import _ from 'lodash';

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { APP_ID, RISK_SUMMARY_URL } from '../../../../../common/constants';
import {
  RiskScoreSummaryResponse,
  RiskScoreSummaryRequestBody,
} from '../../../../../common/api/entity_analytics/risk_engine/risk_score_summary.gen';
import type { EntityAnalyticsRoutesDeps } from '../../types';

const ROUTE_HANDLER_TIMEOUT = 10 * 60 * 1000; // 10 * 60 seconds = 10 minutes

const schema = {
  type: 'object',
  properties: {
    summary: {
      description: 'A summary of why the entity is considered risky.',
      type: 'string',
    },
    detailedExplanation: {
      description:
        'A detailed explanation of the risk summary, including the most recent alerts and their significance.',
      type: 'string',
    },
    recommendations: {
      description: 'A summary of why the entity is considered risky.',
      type: 'string',
    },
  },
} as const;

export const riskSummaryRoute = (
  router: EntityAnalyticsRoutesDeps['router'],
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'],
  logger: Logger
) => {
  router.versioned
    .post({
      access: 'internal',
      path: RISK_SUMMARY_URL,
      options: {
        // tags: ['access:elasticAssistant'],
        timeout: {
          idleSocket: ROUTE_HANDLER_TIMEOUT,
        },
      },
      security: {
        authz: {
          requiredPrivileges: [
            'elasticAssistant',
            'securitySolution',
            `${APP_ID}-entity-analytics`,
          ],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: buildRouteValidationWithZod(RiskScoreSummaryRequestBody),
          },
          response: {
            200: {
              body: { custom: buildRouteValidationWithZod(RiskScoreSummaryResponse) },
            },
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<RiskScoreSummaryResponse>> => {
        const startTime = moment(); // start timing the generation
        const resp = buildSiemResponse(response);
        // get parameters from the request body
        const { connectorId, identifier, identifierKey } =
          request.body as RiskScoreSummaryRequestBody;

        const inferenceClient = (await context.securitySolution).getInferenceClient();

        // get an Elasticsearch client for the authenticated user:
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;

        if (!identifier || !identifierKey) {
          return resp.error({
            body: `Identifier and identifierKey are required`,
            statusCode: 400,
          });
        }

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

        const chatCompleteResponse = await inferenceClient.output({
          id: 'entity_risk_summary',
          connectorId,
          system: `You are a helpful cybersecurity (SIEM) expert agent.`,
          input: `Your task is to analyze if an entity is risky and why based on the most recent alerts provided. Weight your response to the more recent or highest risk events.
                  Here are the alerts:
                  ${mostRecentAlerts.map((alert) => JSON.stringify(alert)).join('\n\n')}
          `,
          schema,
        });

        const endTime = moment(); // end timing the generation

        logger.info(
          `Risk summary LLM call took ${endTime.diff(startTime, 'seconds')} seconds to generate`
        );

        return response.ok({
          body: chatCompleteResponse.output as RiskScoreSummaryResponse,
        });
      }
    );
};
