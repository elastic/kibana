/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { AlertsClientError } from '@kbn/alerting-plugin/server';
import { getAttackDiscoveryMarkdownFields } from '@kbn/elastic-assistant-common';
import { ALERT_URL } from '@kbn/rule-data-utils';
import { transformError } from '@kbn/securitysolution-es-utils';

import {
  reportAttackDiscoveryGenerationFailure,
  reportAttackDiscoveryGenerationSuccess,
} from '../../../../routes/attack_discovery/helpers/telemetry';
import { ANONYMIZATION_FIELDS_RESOURCE } from '../../../../ai_assistant_service/constants';
import { transformESSearchToAnonymizationFields } from '../../../../ai_assistant_data_clients/anonymization_fields/helpers';
import { getResourceName } from '../../../../ai_assistant_service';
import { EsAnonymizationFieldsSchema } from '../../../../ai_assistant_data_clients/anonymization_fields/types';
import { findDocuments } from '../../../../ai_assistant_data_clients/find';
import { generateAttackDiscoveries } from '../../../../routes/attack_discovery/helpers/generate_discoveries';
import { AttackDiscoveryExecutorOptions, AttackDiscoveryScheduleContext } from '../types';
import { getIndexTemplateAndPattern } from '../../../data_stream/helpers';
import {
  generateAttackDiscoveryAlertHash,
  transformToBaseAlertDocument,
} from '../../persistence/transforms/transform_to_alert_documents';
import { deduplicateAttackDiscoveries } from '../../persistence/deduplication';
import { getScheduledIndexPattern } from '../../persistence/get_scheduled_index_pattern';

export interface AttackDiscoveryScheduleExecutorParams {
  options: AttackDiscoveryExecutorOptions;
  logger: Logger;
  publicBaseUrl: string | undefined;
  telemetry: AnalyticsServiceSetup;
}

export const attackDiscoveryScheduleExecutor = async ({
  options,
  logger,
  publicBaseUrl,
  telemetry,
}: AttackDiscoveryScheduleExecutorParams) => {
  const { params, rule, services, spaceId } = options;
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

  const startTime = moment(); // start timing the generation
  const scheduleInfo = {
    id: rule.id,
    interval: rule.schedule.interval,
    actions: rule.actions.map(({ actionTypeId }) => actionTypeId),
  };

  try {
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

    // Remove this when alerting framework adds a way to abort rule execution:
    // https://github.com/elastic/kibana/issues/219152
    if (services.shouldStopExecution()) {
      throw new Error('Rule execution cancelled due to timeout');
    }

    const endTime = moment();
    const durationMs = endTime.diff(startTime);

    reportAttackDiscoveryGenerationSuccess({
      alertsContextCount: anonymizedAlerts.length,
      apiConfig: params.apiConfig,
      attackDiscoveries,
      durationMs,
      end: restParams.end,
      hasFilter: !!(combinedFilter && Object.keys(combinedFilter).length),
      scheduleInfo,
      size: restParams.size,
      start: restParams.start,
      telemetry,
    });

    const alertsParams = {
      alertsContextCount: anonymizedAlerts.length,
      anonymizedAlerts,
      apiConfig: params.apiConfig,
      connectorName: params.apiConfig.name,
      replacements,
    };

    // Deduplicate attackDiscoveries before creating alerts
    const indexPattern = getScheduledIndexPattern(spaceId);
    const dedupedDiscoveries = await deduplicateAttackDiscoveries({
      esClient,
      attackDiscoveries: attackDiscoveries ?? [],
      connectorId: params.apiConfig.connectorId,
      indexPattern,
      logger,
      ownerId: rule.id,
      spaceId,
    });

    await Promise.all(
      dedupedDiscoveries.map(async (attackDiscovery) => {
        const alertInstanceId = generateAttackDiscoveryAlertHash({
          attackDiscovery,
          connectorId: params.apiConfig.connectorId,
          ownerId: rule.id,
          spaceId,
        });
        const { uuid: alertDocId } = alertsClient.report({
          id: alertInstanceId,
          actionGroup: 'default',
        });

        const baseAlertDocument = transformToBaseAlertDocument({
          alertDocId,
          alertInstanceId,
          attackDiscovery,
          alertsParams,
          publicBaseUrl,
          spaceId,
        });

        const { alertIds, timestamp, mitreAttackTactics } = attackDiscovery;
        const { detailsMarkdown, entitySummaryMarkdown, title, summaryMarkdown } =
          getAttackDiscoveryMarkdownFields({
            attackDiscovery,
            replacements,
          });
        const context: AttackDiscoveryScheduleContext = {
          attack: {
            alertIds,
            detailsMarkdown,
            detailsUrl: baseAlertDocument[ALERT_URL],
            entitySummaryMarkdown,
            mitreAttackTactics,
            summaryMarkdown,
            timestamp,
            title,
          },
        };

        alertsClient.setAlertData({
          id: alertInstanceId,
          payload: baseAlertDocument,
          context,
        });
      })
    );
  } catch (error) {
    logger.error(error);
    const transformedError = transformError(error);
    reportAttackDiscoveryGenerationFailure({
      apiConfig: params.apiConfig,
      errorMessage: transformedError.message,
      scheduleInfo,
      telemetry,
    });
    throw error;
  }

  return { state: {} };
};
