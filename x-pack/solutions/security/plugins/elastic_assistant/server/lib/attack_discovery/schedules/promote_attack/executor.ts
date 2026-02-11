/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { ATTACK_DISCOVERY_PROMOTE_ATTACK_RULE_TYPE_ID } from '@kbn/elastic-assistant-common';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_URL,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { v4 as uuidv4 } from 'uuid';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
} from '../fields/field_names';
import { updateAlertsWithAttackIds } from '../register_schedule/updateAlertsWithAttackIds';
import type { AttackDiscoveryAlertDocument, AttackDiscoveryScheduleContext } from '../types';
import type { AttackPromotionExecutorOptions } from './types';

export const attackPromotionExecutor = async ({
  params,
  rule,
  services,
  spaceId,
  logger,
}: AttackPromotionExecutorOptions) => {
  const { alertsClient, scopedClusterClient } = services;
  if (!alertsClient) {
    throw new AlertsClientError();
  }

  const { attackIds } = params;
  if (!attackIds || !attackIds.length) {
    logger.warn('No attack IDs provided for promotion');
    return { state: {} };
  }

  const esClient = scopedClusterClient.asCurrentUser;

  try {
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
      logger.warn(`No attacks found for IDs: ${attackIds.join(', ')}`);
      return { state: {} };
    }

    const alertIdToAttackIds: Record<string, string[]> = {};
    const executionUuid = uuidv4(); // Generate a new execution UUID for this promotion run

    hits.forEach((hit) => {
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

      const context: AttackDiscoveryScheduleContext = {
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
        [ALERT_RULE_UUID]: rule.id,
        [ALERT_RULE_EXECUTION_UUID]: executionUuid,
        [ALERT_INSTANCE_ID]: alertInstanceId,
        [ALERT_UUID]: alertDocId,
        '@timestamp': new Date().toISOString(),
      };

      // 3. Store the alert
      alertsClient.setAlertData({
        id: alertInstanceId,
        payload,
        context,
      });
    });

    // 4. Update original alerts to point to this new attack
    if (Object.keys(alertIdToAttackIds).length > 0) {
      await updateAlertsWithAttackIds({
        alertIdToAttackIdsMap: alertIdToAttackIds,
        esClient,
        spaceId,
      });
    }
  } catch (error) {
    logger.error(`Failed to promote attacks: ${error.message}`);
    throw transformError(error);
  }

  return { state: {} };
};
