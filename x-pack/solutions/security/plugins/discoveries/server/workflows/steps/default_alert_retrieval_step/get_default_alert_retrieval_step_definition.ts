/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { getAnonymizedAlerts } from '@kbn/discoveries/impl/attack_discovery/graphs';
import { DefaultAlertRetrievalStepCommonDefinition } from '../../../../common/step_types/default_alert_retrieval_step';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { fetchAnonymizationFields } from './helpers/fetch_anonymization_fields';
import {
  ensureRequiredAnonymizationFields,
  getAnonymizedAlertsFromEsql,
} from './helpers/transform_alerts';

/**
 * Server-side implementation of the default alert retrieval step.
 */
export const getDefaultAlertRetrievalStepDefinition = ({
  getEventLogIndex: _getEventLogIndex,
  getEventLogger: _getEventLogger,
  getStartServices,
  logger: _logger,
}: {
  getEventLogIndex: () => Promise<string>;
  getEventLogger: () => Promise<unknown>;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...DefaultAlertRetrievalStepCommonDefinition,
    handler: async (context) => {
      let spaceId: string | undefined;

      try {
        const workflowContext = context.contextManager.getContext();

        spaceId = workflowContext.workflow.spaceId;

        const {
          alerts_index_pattern: alertsIndexPattern,
          anonymization_fields: anonymizationFields,
          api_config: apiConfig,
          end,
          esql_query: esqlQuery,
          filter,
          replacements: inputReplacements = {},
          size,
          start,
        } = context.input;

        context.logger.info(`Retrieving alerts from ${alertsIndexPattern} with size ${size}`);

        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);
        const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

        const parsedApiConfig = apiConfig as {
          action_type_id?: string;
          connector_id: string;
          model?: string;
        };
        const connectorId = parsedApiConfig.connector_id;

        // Track replacements locally
        let localReplacements: Replacements = { ...inputReplacements };
        const onNewReplacements = (newReplacements: Replacements) => {
          localReplacements = { ...localReplacements, ...newReplacements };
        };

        const resolvedAnonymizationFields = ensureRequiredAnonymizationFields(
          anonymizationFields.length > 0
            ? anonymizationFields
            : await fetchAnonymizationFields({ esClient, spaceId })
        );

        // Retrieve and anonymize alerts
        const anonymizedAlertStrings =
          esqlQuery != null
            ? await getAnonymizedAlertsFromEsql({
                anonymizationFields: resolvedAnonymizationFields,
                esClient,
                esqlQuery,
                onNewReplacements,
                replacements: inputReplacements,
              })
            : await getAnonymizedAlerts({
                alertsIndexPattern,
                anonymizationFields: resolvedAnonymizationFields,
                end: end ?? undefined,
                esClient,
                filter: filter ?? undefined,
                onNewReplacements,
                replacements: inputReplacements,
                size,
                start: start ?? undefined,
              });

        context.logger.info(`Retrieved and anonymized ${anonymizedAlertStrings.length} alerts`);

        // Convert to Document format
        const anonymizedAlerts: Array<{
          id?: string;
          metadata: Record<string, never>;
          page_content: string;
        }> = anonymizedAlertStrings.map((alertString) => ({
          metadata: {} as Record<string, never>,
          page_content: alertString,
        }));

        const { connectorName } = await resolveConnectorDetails({
          actionsClient,
          connectorId,
          inference: pluginsStart.inference,
          logger: _logger,
          request,
        });

        return {
          output: {
            alerts: anonymizedAlertStrings,
            alerts_context_count: anonymizedAlertStrings.length,
            anonymized_alerts: anonymizedAlerts,
            api_config: apiConfig,
            connector_name: connectorName,
            replacements: localReplacements,
          },
        };
      } catch (error) {
        context.logger.error('Failed to retrieve alerts', error);
        return {
          error: new Error(error instanceof Error ? error.message : 'Failed to retrieve alerts'),
        };
      }
    },
  });
