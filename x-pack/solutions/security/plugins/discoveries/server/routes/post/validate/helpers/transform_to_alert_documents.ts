/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { EcsVersion } from '@elastic/ecs';
import type { Alert } from '@kbn/alerts-as-data-utils';
import type { AuthenticatedUser } from '@kbn/core/server';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ECS_VERSION,
  EVENT_KIND,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import type { PostValidateRequestBody } from '@kbn/discoveries-schemas';

import {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  getOriginalAlertIds,
  replaceAnonymizedValuesWithOriginalValues,
} from '@kbn/discoveries/impl/attack_discovery/anonymization';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_IDS,
  ALERT_RISK_SCORE,
} from '@kbn/discoveries/impl/attack_discovery/alert_fields';

type AttackDiscoveryAlertDocumentBase = Omit<
  Record<string, unknown>,
  keyof Omit<Alert, typeof ALERT_URL | typeof ALERT_UUID | typeof ALERT_INSTANCE_ID>
>;

/**
 * Converts snake_case fields from REST API to camelCase for internal use
 */
const convertApiFieldsToCamelCase = (body: PostValidateRequestBody) => {
  return {
    alertsContextCount: body.alerts_context_count,
    anonymizedAlerts: body.anonymized_alerts.map((alert) => ({
      metadata: alert.metadata,
      pageContent: alert.page_content,
    })),
    apiConfig: {
      actionTypeId: body.api_config.action_type_id,
      connectorId: body.api_config.connector_id,
      model: body.api_config.model,
      provider: body.api_config.provider,
    },
    attackDiscoveries: body.attack_discoveries.map((discovery) => ({
      alertIds: discovery.alert_ids,
      detailsMarkdown: discovery.details_markdown,
      entitySummaryMarkdown: discovery.entity_summary_markdown,
      id: discovery.id,
      mitreAttackTactics: discovery.mitre_attack_tactics,
      summaryMarkdown: discovery.summary_markdown,
      timestamp: discovery.timestamp,
      title: discovery.title,
    })),
    connectorName: body.connector_name,
    enableFieldRendering: body.enable_field_rendering,
    generationUuid: body.generation_uuid,
    replacements: body.replacements,
    withReplacements: body.with_replacements,
  };
};

/**
 * Generates a hash to uniquely identify an attack discovery
 */
export const generateAttackDiscoveryAlertHash = ({
  alertIds,
  attackDiscoveryId,
  connectorId,
  ownerId,
  replacements,
  spaceId,
}: {
  alertIds: string[];
  attackDiscoveryId: string | undefined;
  connectorId: string;
  ownerId: string;
  replacements: Record<string, string> | undefined;
  spaceId: string;
}) => {
  const originalAlertIds = getOriginalAlertIds({ alertIds, replacements });
  const hash = createHash('sha256');

  if (originalAlertIds.length > 0) {
    hash.update([...originalAlertIds].sort().join());
  } else if (attackDiscoveryId != null && attackDiscoveryId.length > 0) {
    // Fallback for unverifiable discoveries: still persist unique documents by id
    hash.update(attackDiscoveryId);
  } else {
    // Last-resort fallback to avoid empty hash seed
    hash.update('attack_discovery');
  }

  return hash.update(connectorId).update(ownerId).update(spaceId).digest('hex');
};

/**
 * Calculate risk score based on the max risk score from anonymized alerts
 */
const getAlertRiskScore = ({
  alertIds,
  anonymizedAlerts,
}: {
  alertIds: string[];
  anonymizedAlerts: Array<{ pageContent: string; metadata: unknown }>;
}): number => {
  const riskScores = anonymizedAlerts
    .map((alert) => {
      const match = alert.pageContent.match(/kibana\.alert\.risk_score,(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((score) => !isNaN(score));

  return riskScores.length > 0 ? Math.max(...riskScores) : 0;
};

/**
 * Transform request body to Elasticsearch alert documents
 * This replicates the logic from transformToAlertDocuments in elastic_assistant
 */
export const transformToAlertDocuments = ({
  authenticatedUser,
  now,
  spaceId,
  validateRequestBody,
}: {
  authenticatedUser: AuthenticatedUser;
  now: Date;
  spaceId: string;
  validateRequestBody: PostValidateRequestBody;
}): Array<Record<string, unknown>> => {
  const converted = convertApiFieldsToCamelCase(validateRequestBody);
  const { attackDiscoveries, generationUuid, ...restParams } = converted;

  return attackDiscoveries.map((attackDiscovery) => {
    const alertHash = generateAttackDiscoveryAlertHash({
      alertIds: attackDiscovery.alertIds,
      attackDiscoveryId: attackDiscovery.id,
      connectorId: restParams.apiConfig.connectorId,
      ownerId: authenticatedUser.username ?? authenticatedUser.profile_uid,
      replacements: restParams.replacements,
      spaceId,
    });

    const baseAlertDocument: AttackDiscoveryAlertDocumentBase = {
      // Alert base fields
      [ECS_VERSION]: EcsVersion,
      [ALERT_INSTANCE_ID]: alertHash,
      [ALERT_UUID]: alertHash,
      [ALERT_RISK_SCORE]: getAlertRiskScore({
        alertIds: attackDiscovery.alertIds,
        anonymizedAlerts: restParams.anonymizedAlerts,
      }),
      [ALERT_URL]: `/s/${spaceId}/app/security/attacks/${alertHash}`,

      // Attack discovery fields
      [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: attackDiscovery.alertIds,
      [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: restParams.alertsContextCount,
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
        action_type_id: restParams.apiConfig.actionTypeId,
        connector_id: restParams.apiConfig.connectorId,
        model: restParams.apiConfig.model,
        name: restParams.connectorName,
        provider: restParams.apiConfig.provider,
      },
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: attackDiscovery.detailsMarkdown,
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]:
        replaceAnonymizedValuesWithOriginalValues({
          messageContent: attackDiscovery.detailsMarkdown,
          replacements: restParams.replacements,
        }),
      [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: attackDiscovery.entitySummaryMarkdown,
      [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
        attackDiscovery.entitySummaryMarkdown != null
          ? replaceAnonymizedValuesWithOriginalValues({
              messageContent: attackDiscovery.entitySummaryMarkdown,
              replacements: restParams.replacements,
            })
          : undefined,
      [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: attackDiscovery.mitreAttackTactics,
      [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: !isEmpty(restParams.replacements)
        ? Object.entries(restParams.replacements as Record<string, string>).map(
            ([uuid, value]) => ({
              uuid,
              value,
            })
          )
        : undefined,
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: attackDiscovery.summaryMarkdown,
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
        replaceAnonymizedValuesWithOriginalValues({
          messageContent: attackDiscovery.summaryMarkdown,
          replacements: restParams.replacements,
        }),
      [ALERT_ATTACK_DISCOVERY_TITLE]: attackDiscovery.title,
      [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: replaceAnonymizedValuesWithOriginalValues({
        messageContent: attackDiscovery.title,
        replacements: restParams.replacements,
      }),
      [ALERT_ATTACK_IDS]: [alertHash],
    };

    return {
      ...baseAlertDocument,
      '@timestamp': now.toISOString(),
      [ALERT_START]: now.toISOString(),
      [ALERT_ATTACK_DISCOVERY_USER_ID]: authenticatedUser.profile_uid,
      [ALERT_ATTACK_DISCOVERY_USER_NAME]: authenticatedUser.username,
      [ALERT_ATTACK_DISCOVERY_USERS]: [
        {
          id: authenticatedUser.profile_uid,
          name: authenticatedUser.username,
        },
      ],
      [ALERT_RULE_EXECUTION_UUID]: generationUuid,
      [ALERT_RULE_CATEGORY]: 'Attack discovery ad hoc (placeholder rule category)',
      [ALERT_RULE_CONSUMER]: 'siem',
      [ALERT_RULE_NAME]: 'Attack discovery ad hoc (placeholder rule name)',
      [ALERT_RULE_PRODUCER]: 'siem',
      [ALERT_RULE_REVISION]: 1,
      [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
      [ALERT_RULE_UUID]: ATTACK_DISCOVERY_AD_HOC_RULE_ID,
      [ALERT_STATUS]: 'active',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [EVENT_KIND]: 'signal',
      [SPACE_IDS]: [spaceId],
    };
  });
};
