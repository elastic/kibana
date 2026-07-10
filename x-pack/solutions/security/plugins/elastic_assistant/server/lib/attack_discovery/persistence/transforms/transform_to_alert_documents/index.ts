/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { AuthenticatedUser } from '@kbn/core/server';
import type {
  AttackDiscovery,
  AttackDiscoveryAlertDocument,
  CreateAttackDiscoveryAlertsParams,
  Replacements,
} from '@kbn/elastic-assistant-common';
import {
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
} from '@kbn/elastic-assistant-common';
import {
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
  ALERT_WORKFLOW_STATUS,
  EVENT_KIND,
  SPACE_IDS,
} from '@kbn/rule-data-utils';

import {
  generateAttackDiscoveryAlertHash as generateHashFromShared,
  transformToBaseAlertDocument,
} from '@kbn/attack-discovery-schedules-common';

export { transformToBaseAlertDocument };

const computeSha256Hash = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

export const generateAttackDiscoveryAlertHash = ({
  attackDiscovery,
  connectorId,
  ownerId,
  replacements,
  spaceId,
}: {
  attackDiscovery: AttackDiscovery;
  connectorId: string;
  ownerId: string;
  replacements: Replacements | undefined;
  spaceId: string;
}) =>
  generateHashFromShared({
    attackDiscovery,
    computeSha256Hash,
    connectorId,
    ownerId,
    replacements,
    spaceId,
  });

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
    const alertHash = generateAttackDiscoveryAlertHash({
      attackDiscovery,
      connectorId: restParams.apiConfig.connectorId,
      ownerId: authenticatedUser.username ?? authenticatedUser.profile_uid,
      replacements: restParams.replacements,
      spaceId,
    });

    const baseAlertDocument = transformToBaseAlertDocument({
      alertDocId: alertHash,
      alertInstanceId: alertHash,
      attackDiscovery,
      alertsParams: restParams,
      spaceId,
    });

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
      [ALERT_RULE_TYPE_ID]: ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID, // sentinel value
      [ALERT_RULE_UUID]: ATTACK_DISCOVERY_AD_HOC_RULE_ID, // sentinel value
      [ALERT_STATUS]: 'active',
      [ALERT_WORKFLOW_STATUS]: 'open',
      [EVENT_KIND]: 'signal',
      [SPACE_IDS]: [spaceId],
    };
  });
};
