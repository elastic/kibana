/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  API_VERSIONS,
  ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID,
  ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
  ATTACK_DISCOVERY_INTERNAL_PROMOTE,
  PostAttackDiscoveryPromoteRequestBody,
  PostAttackDiscoveryPromoteResponse,
} from '@kbn/elastic-assistant-common';
import type { IKibanaResponse, IRouter } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/elastic-assistant-common/impl/schemas/common';
import { ATTACK_DISCOVERY_API_ACTION_ALL } from '@kbn/security-solution-features/actions';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_URL,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import type { AlertInstanceContext, AlertInstanceState } from '@kbn/alerting-plugin/server';
import type { ElasticAssistantRequestHandlerContext } from '../../../types';
import { buildResponse } from '../../../lib/build_response';
import { performChecks } from '../../helpers';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_IDS,
} from '../../../lib/attack_discovery/schedules/fields/field_names';
import type {
  AttackDiscoveryAlertDocument,
  AttackDiscoveryScheduleContext,
} from '../../../lib/attack_discovery/schedules/types';
import { updateAlertsWithAttackIds } from '../../../lib/attack_discovery/schedules/register_schedule/updateAlertsWithAttackIds';

export const postAttackDiscoveryPromoteRoute = (
  router: IRouter<ElasticAssistantRequestHandlerContext>
) => {
  router.versioned
    .post({
      access: 'internal',
      path: ATTACK_DISCOVERY_INTERNAL_PROMOTE,
      security: {
        authz: {
          requiredPrivileges: [ATTACK_DISCOVERY_API_ACTION_ALL],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(PostAttackDiscoveryPromoteRequestBody),
          },
          response: {
            200: {
              body: {
                custom: buildRouteValidationWithZod(PostAttackDiscoveryPromoteResponse),
              },
            },
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<PostAttackDiscoveryPromoteResponse>> => {
        const performChecksContext = await context.resolve([
          'core',
          'elasticAssistant',
          'licensing',
        ]);
        const resp = buildResponse(response);
        const { attack_ids: attackIds } = request.body as PostAttackDiscoveryPromoteRequestBody;

        const checkResponse = await performChecks({
          context: performChecksContext,
          request,
          response,
        });

        if (!checkResponse.isSuccess) {
          return checkResponse.response;
        }

        try {
          // Resolve plugins
          const { elasticAssistant } = await context.resolve(['elasticAssistant']);
          const { rulesClient, frameworkAlerts } = elasticAssistant;

          if (!frameworkAlerts.enabled()) {
            throw new Error('Framework alerts are not enabled');
          }

          const ruleTypeId = ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID;
          const ruleType = rulesClient.getContext().ruleTypeRegistry.get(ruleTypeId);

          if (!ruleType) {
            throw new Error(`Rule type ${ruleTypeId} not found`);
          }

          const spaceId = rulesClient.getSpaceId() || 'default';
          const ruleId = uuidv4();
          const ruleName = 'Promoted Attack (Ad-Hoc)';
          const executionUuid = uuidv4();
          const namespace = rulesClient.getContext().namespace || 'default';

          const alertsClient = await frameworkAlerts.createAdHocAlertsClient<
            Record<string, unknown>,
            AlertInstanceState,
            AlertInstanceContext,
            'default',
            'recovered'
          >({
            namespace,
            ruleData: {
              id: ruleId,
              name: ruleName,
              consumer: ATTACK_DISCOVERY_SCHEDULES_CONSUMER_ID,
              executionId: executionUuid,
            },
            spaceId,
            ruleType,
            eventLogger: elasticAssistant.eventLogger,
            logger: elasticAssistant.logger,
            request,
          });

          if (!alertsClient) {
            throw new Error('Failed to create alerts client');
          }

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;

          // 1. Fetch ad-hoc attacks
          // We search across all indices matching the prefix to find the source attacks.
          const adhocIndex = `.adhoc.alerts-security.attack.discovery.alerts-${spaceId}`;
          const searchResponse = await esClient.search({
            index: [adhocIndex],
            ignore_unavailable: true,
            query: {
              ids: {
                values: attackIds,
              },
            },
            size: attackIds.length,
          });

          const hits = searchResponse.hits.hits;

          if (!hits.length) {
            elasticAssistant.logger.warn(`No attacks found for IDs: ${attackIds.join(', ')}`);
            return response.ok({
              body: {
                success: true,
                execution_uuid: executionUuid,
              },
            });
          }

          const alertIdToAttackIds: Record<string, string[]> = {};

          for (const hit of hits) {
            const source = hit._source as AttackDiscoveryAlertDocument;
            delete source[ALERT_ATTACK_DISCOVERY_USERS];

            // Generate a new alert instance ID for the promoted attack
            const alertInstanceId = uuidv4();
            const { uuid: alertDocId } = alertsClient.report({
              id: alertInstanceId,
              actionGroup: 'default',
            });

            // 2. Prepare context and payload
            const alertIds = source[ALERT_ATTACK_DISCOVERY_ALERT_IDS] || [];
            const title = `Promoted Attack - ${source[ALERT_ATTACK_DISCOVERY_TITLE]}`;
            const summaryMarkdown = source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN];
            const detailsMarkdown = source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN];
            const entitySummaryMarkdown = source[ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN];
            const mitreAttackTactics = source[ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS];
            const timestamp = source['@timestamp'];

            // Collect alert IDs for updating them later
            for (const alertId of alertIds) {
              alertIdToAttackIds[alertId] = alertIdToAttackIds[alertId] ?? [];
              alertIdToAttackIds[alertId].push(alertDocId);
            }

            const alertContext: AttackDiscoveryScheduleContext = {
              attack: {
                alertIds,
                detailsMarkdown,
                detailsUrl: source[ALERT_URL],
                entitySummaryMarkdown,
                mitreAttackTactics,
                summaryMarkdown,
                timestamp: new Date(timestamp).toISOString(),
                title,
              },
            };

            const payload = {
              ...source,
              [ALERT_ATTACK_DISCOVERY_TITLE]: title,
              [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID,
              [ALERT_RULE_UUID]: ruleId,
              [ALERT_RULE_EXECUTION_UUID]: executionUuid,
              [ALERT_INSTANCE_ID]: alertInstanceId,
              [ALERT_ATTACK_IDS]: [alertDocId],
              [ALERT_UUID]: alertDocId,
              '@timestamp': new Date().toISOString(),
            };

            // 3. Store the alert
            alertsClient.setAlertData({
              id: alertInstanceId,
              payload,
              context: alertContext,
            });
          }

          alertsClient.processAlerts();
          await alertsClient.persistAlerts();

          // 4. Update original alerts to point to this new attack
          if (Object.keys(alertIdToAttackIds).length > 0) {
            await updateAlertsWithAttackIds({
              alertIdToAttackIdsMap: alertIdToAttackIds,
              esClient,
              spaceId,
            });
          }

          return response.ok({
            body: {
              success: true,
              execution_uuid: executionUuid,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return resp.error({
            body: { success: false, error: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
};
