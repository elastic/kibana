/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsVersion } from '@elastic/ecs';
import { Alert } from '@kbn/alerts-as-data-utils';
import { AuthenticatedUser } from '@kbn/core/server';
import {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  type CreateAttackDiscoveryAlertsParams,
  replaceAnonymizedValuesWithOriginalValues,
  AttackDiscovery,
} from '@kbn/elastic-assistant-common';
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
  ALERT_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  ECS_VERSION,
  EVENT_KIND,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { getAlertRiskScore } from './get_alert_risk_score';
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
  ALERT_RISK_SCORE,
} from '../../../schedules/fields/field_names';
import { AttackDiscoveryAlertDocument } from '../../../schedules/types';

type AttackDiscoveryAlertDocumentBase = Omit<AttackDiscoveryAlertDocument, keyof Alert>;

export const transformToBaseAlertDocument = ({
  attackDiscovery,
  alertsParams,
}: {
  attackDiscovery: AttackDiscovery;
  alertsParams: Omit<CreateAttackDiscoveryAlertsParams, 'attackDiscoveries' | 'generationUuid'>;
}): AttackDiscoveryAlertDocumentBase => {
  const { alertsContextCount, anonymizedAlerts, apiConfig, connectorName, replacements } =
    alertsParams;

  const {
    alertIds,
    entitySummaryMarkdown,
    detailsMarkdown,
    mitreAttackTactics,
    summaryMarkdown,
    title,
  } = attackDiscovery;

  return {
    // Alert base fields
    [ECS_VERSION]: EcsVersion,
    [ALERT_RISK_SCORE]: getAlertRiskScore({
      alertIds,
      anonymizedAlerts,
    }),

    // Attack discovery fields
    [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: alertIds,
    [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: alertsContextCount,
    [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
      action_type_id: apiConfig.actionTypeId,
      connector_id: apiConfig.connectorId,
      model: apiConfig.model,
      name: connectorName,
      provider: apiConfig.provider,
    },
    [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: detailsMarkdown,
    [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]:
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: detailsMarkdown,
        replacements,
      }),
    [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: entitySummaryMarkdown,
    [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
      entitySummaryMarkdown != null
        ? replaceAnonymizedValuesWithOriginalValues({
            messageContent: entitySummaryMarkdown,
            replacements,
          })
        : undefined,
    [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: mitreAttackTactics,
    [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: !isEmpty(replacements)
      ? Object.entries(replacements).map(([uuid, value]) => ({
          uuid,
          value,
        }))
      : undefined,
    [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: summaryMarkdown,
    [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
      replaceAnonymizedValuesWithOriginalValues({
        messageContent: summaryMarkdown,
        replacements,
      }),
    [ALERT_ATTACK_DISCOVERY_TITLE]: title,
    [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: replaceAnonymizedValuesWithOriginalValues({
      messageContent: title,
      replacements,
    }),
  };
};

export const transformToAlertDocuments = ({
  authenticatedUser,
  createAttackDiscoveryAlertsParams,
  now,
  spaceId,
}: {
  authenticatedUser: AuthenticatedUser;
  createAttackDiscoveryAlertsParams: CreateAttackDiscoveryAlertsParams;
  now: Date;
  spaceId: string;
}): AttackDiscoveryAlertDocument[] => {
  const { attackDiscoveries, generationUuid, ...restParams } = createAttackDiscoveryAlertsParams;

  return attackDiscoveries.map((attackDiscovery) => {
    const alertUuid = uuidv4();

    const baseAlertDocument = transformToBaseAlertDocument({
      attackDiscovery,
      alertsParams: restParams,
    });

    return {
      ...baseAlertDocument,

      '@timestamp': now.toISOString(),
      [ALERT_ATTACK_DISCOVERY_USER_ID]: authenticatedUser.profile_uid,
      [ALERT_ATTACK_DISCOVERY_USER_NAME]: authenticatedUser.username,
      [ALERT_ATTACK_DISCOVERY_USERS]: [
        {
          id: authenticatedUser.profile_uid,
          name: authenticatedUser.username,
        },
      ],
      [ALERT_RULE_EXECUTION_UUID]: generationUuid,
      [ALERT_INSTANCE_ID]: alertUuid,
      [ALERT_RULE_CATEGORY]: 'Attack discovery ad hoc (placeholder rule category)',
      [ALERT_RULE_CONSUMER]: 'siem',
      [ALERT_RULE_NAME]: 'Attack discovery ad hoc (placeholder rule name)',
      [ALERT_RULE_PRODUCER]: 'siem',
      [ALERT_RULE_REVISION]: 1,
      [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID, // sentinel value
      [ALERT_RULE_UUID]: ATTACK_DISCOVERY_AD_HOC_RULE_ID, // sentinel value
      [ALERT_STATUS]: 'active',
      [ALERT_UUID]: alertUuid, // IMPORTANT: the document _id should be the same as this field when it's bulk inserted
      [ALERT_WORKFLOW_STATUS]: 'open',
      [EVENT_KIND]: 'signal',
      [SPACE_IDS]: [spaceId],
    };
  });
};
