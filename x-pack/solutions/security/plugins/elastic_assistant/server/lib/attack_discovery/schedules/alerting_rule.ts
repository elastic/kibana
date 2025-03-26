/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AnalyticsServiceSetup,
  AuthenticatedUser,
  DEFAULT_APP_CATEGORIES,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { getResourceName } from '../../../ai_assistant_service';
import { attackDiscoveryStatus } from '../../../routes/attack_discovery/helpers/helpers';
import {
  GenerateAttackDiscoveryConfig,
  generateAttackDiscovery,
} from '../../../routes/attack_discovery/helpers/generate_discovery';
import { ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID } from '../../../../common/constants';
import { RuleParams } from '.';
import { AttackDiscoveryDataClient } from '../persistence';
import { AttackDiscoveryExecutorOptions, AttackDiscoveryRuleType } from './types';
import { ATTACK_DISCOVERY_ALERTS_AAD_CONFIG } from './constants';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_USERS,
} from './field_names';

export interface AttackDiscoverySchedulesExecutorParams {
  options: AttackDiscoveryExecutorOptions;
  logger: Logger;
  authenticatedUser: AuthenticatedUser;
  actionsClient: PublicMethodsOf<ActionsClient>;
  esClient: ElasticsearchClient;
  dataClient: AttackDiscoveryDataClient;
  savedObjectsClient: SavedObjectsClientContract;
  telemetry: AnalyticsServiceSetup;
  config: GenerateAttackDiscoveryConfig;
}

export const attackDiscoverySchedulesExecutor = async ({
  options,
  logger,
  authenticatedUser,
  actionsClient,
  esClient,
  dataClient,
  savedObjectsClient,
  telemetry,
  config,
}: AttackDiscoverySchedulesExecutorParams) => {
  const { services } = options;
  const { alertsClient } = services;
  if (!alertsClient) {
    throw new AlertsClientError();
  }

  const newAttackDiscovery = await dataClient.createAttackDiscovery({
    attackDiscoveryCreate: {
      alertsContextCount: config.size,
      apiConfig: config.apiConfig,
      attackDiscoveries: [],
      status: attackDiscoveryStatus.running,
    },
    authenticatedUser,
  });

  if (!newAttackDiscovery) {
    throw new Error(
      `Could not create attack discovery for connectorId: ${config.apiConfig.connectorId}`
    );
  }

  const { anonymizedAlerts, attackDiscoveries, replacements, error } =
    await generateAttackDiscovery({
      attackDiscoveryId: newAttackDiscovery.id,
      logger,
      authenticatedUser,
      actionsClient,
      esClient,
      dataClient,
      savedObjectsClient,
      telemetry,
      config,
    });

  if (error) {
    logger.error(
      `[${ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID}] Failed because of error: ${JSON.stringify(
        error
      )}`
    );
  } else if (attackDiscoveries?.length) {
    attackDiscoveries.forEach((attack) => {
      const payload = {
        [ALERT_ATTACK_DISCOVERY_USERS]: [
          {
            id: authenticatedUser.profile_uid,
            name: authenticatedUser.username,
          },
        ],
        [ALERT_ATTACK_DISCOVERY_TITLE]: attack.title,
        [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: attack.detailsMarkdown,
        [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: attack.entitySummaryMarkdown,
        [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: attack.summaryMarkdown,
        [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: attack.mitreAttackTactics,
        [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: attack.alertIds,
        [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: replacements,
        [ALERT_ATTACK_DISCOVERY_API_CONFIG]: config.apiConfig,
        [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: anonymizedAlerts.length,
      };
      alertsClient.report({ id: uuidv4(), actionGroup: 'default', payload, context: payload });
    });
  }

  logger.info(
    `[${ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID}] Generated attack discovery: ${newAttackDiscovery.id}`
  );

  // const context = {};
  // alertsClient.report({ id: uuidv4(), actionGroup: 'default', context });

  return { state: {} };
};

export interface GetAttackDiscoveryAlertingRuleParams {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  kibanaVersion: string;
}

export const getAttackDiscoveryAlertingRule = ({
  logger,
  telemetry,
  kibanaVersion,
}: GetAttackDiscoveryAlertingRuleParams): AttackDiscoveryRuleType => {
  return {
    id: ATTACK_DISCOVERY_SCHEDULES_ALERT_TYPE_ID,
    name: 'Attack Discovery Schedule Rule',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    category: DEFAULT_APP_CATEGORIES.security.id,
    producer: 'assistant',
    validate: {
      params: {
        validate: (object: unknown) => {
          return RuleParams.parse(object);
        },
      },
    },
    schemas: {
      params: { type: 'zod', schema: RuleParams },
    },
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    autoRecoverAlerts: false,
    alerts: ATTACK_DISCOVERY_ALERTS_AAD_CONFIG,
    async executor(options: AttackDiscoveryExecutorOptions) {
      const esClient = options.services.scopedClusterClient.asCurrentUser;
      const savedObjectsClient = options.services.savedObjectsClient;
      const actionsClient = options.services.actionsClient;

      const ruleParams = options.params;
      const username = options.rule.updatedBy ?? '';
      const users = await esClient.security.getUser({
        username,
        with_profile_uid: true,
      });
      const currentUser = users[username] as unknown as AuthenticatedUser;

      // options.rule;
      const dataClient = new AttackDiscoveryDataClient({
        logger: logger.get('attackDiscovery'),
        currentUser,
        elasticsearchClientPromise: Promise.resolve(esClient),
        indexPatternsResourceName: getResourceName('attack-discovery'),
        kibanaVersion,
        spaceId: DEFAULT_NAMESPACE_STRING,
      });

      return attackDiscoverySchedulesExecutor({
        options,
        logger,
        authenticatedUser: currentUser,
        actionsClient,
        esClient,
        dataClient,
        savedObjectsClient,
        telemetry,
        config: ruleParams,
      });
    },
  };
};
