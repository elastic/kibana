/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { EcsVersion } from '@elastic/ecs';
import { Logger } from '@kbn/core/server';
import { Alert } from '@kbn/alerts-as-data-utils';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { replaceAnonymizedValuesWithOriginalValues } from '@kbn/elastic-assistant-common';
import { ECS_VERSION } from '@kbn/rule-data-utils';

import { ANONYMIZATION_FIELDS_RESOURCE } from '../../../../ai_assistant_service/constants';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { getResourceName } from '../../../../ai_assistant_service';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { findDocuments } from '../../../../ai_assistant_data_clients/find';
import { generateAttackDiscoveries } from '../../../../routes/attack_discovery/helpers/generate_discoveries';
import { AttackDiscoveryAlertDocument, AttackDiscoveryExecutorOptions } from '../types';
import {
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
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
} from '../fields';
import { getIndexTemplateAndPattern } from '../../../data_stream/helpers';

type AttackDiscoveryAlertDocumentBase = Omit<AttackDiscoveryAlertDocument, keyof Alert>;

export interface AttackDiscoveryScheduleExecutorParams {
  options: AttackDiscoveryExecutorOptions;
  logger: Logger;
}

export const attackDiscoveryScheduleExecutor = async ({
  options,
  logger,
}: AttackDiscoveryScheduleExecutorParams) => {
  const { params, services, spaceId } = options;
  const { alertsClient, actionsClient, savedObjectsClient, scopedClusterClient } = services;
  if (!alertsClient) {
    throw new AlertsClientError();
  }
  if (!actionsClient) {
    throw new Error('Expected actionsClient not to be null!');
  }

  const esClient = scopedClusterClient.asCurrentUser;

  const resourceName = getResourceName(ANONYMIZATION_FIELDS_RESOURCE);
  const index = getIndexTemplateAndPattern(resourceName, spaceId).alias;
  const result = await findDocuments<EsAnonymizationFieldsSchema>({
    esClient,
    page: 1,
    perPage: 1000,
    index,
    logger,
  });
  const anonymizationFields = transformESSearchToAnonymizationFields(result.data);

  const { query, filters, combinedFilter, ...restParams } = params;

  const { anonymizedAlerts, attackDiscoveries, replacements } = await generateAttackDiscoveries({
    actionsClient,
    config: {
      ...restParams,
      filter: combinedFilter,
      anonymizationFields,
      subAction: 'invokeAI',
    },
    esClient,
    logger,
    savedObjectsClient,
  });

  attackDiscoveries?.forEach((attack) => {
    const payload: AttackDiscoveryAlertDocumentBase = {
      [ECS_VERSION]: EcsVersion,
      // TODO: ALERT_RISK_SCORE
      [ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT]: anonymizedAlerts.length,
      [ALERT_ATTACK_DISCOVERY_ALERT_IDS]: attack.alertIds,
      [ALERT_ATTACK_DISCOVERY_API_CONFIG]: {
        action_type_id: params.apiConfig.actionTypeId,
        connector_id: params.apiConfig.connectorId,
        model: params.apiConfig.model,
        name: params.apiConfig.name,
        provider: params.apiConfig.provider,
      },
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]: attack.detailsMarkdown,
      [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS]:
        replaceAnonymizedValuesWithOriginalValues({
          messageContent: attack.detailsMarkdown,
          replacements,
        }),
      [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN]: attack.entitySummaryMarkdown,
      [ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
        attack.entitySummaryMarkdown
          ? replaceAnonymizedValuesWithOriginalValues({
              messageContent: attack.entitySummaryMarkdown,
              replacements,
            })
          : undefined,
      [ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS]: attack.mitreAttackTactics,
      [ALERT_ATTACK_DISCOVERY_REPLACEMENTS]: replacements
        ? Object.keys(replacements).map((key) => ({
            uuid: key,
            value: replacements[key],
          }))
        : undefined,
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]: attack.summaryMarkdown,
      [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS]:
        replaceAnonymizedValuesWithOriginalValues({
          messageContent: attack.summaryMarkdown,
          replacements,
        }),
      [ALERT_ATTACK_DISCOVERY_TITLE]: attack.title,
      [ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS]: replaceAnonymizedValuesWithOriginalValues({
        messageContent: attack.title,
        replacements,
      }),
    };
    alertsClient.report({ id: uuidv4(), actionGroup: 'default', payload });
  });

  return { state: {} };
};
