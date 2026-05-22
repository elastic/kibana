/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { CoreStart } from '@kbn/core/server';

import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { asNonEmpty } from '../../../lib/non_empty_string';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { validateAttackDiscoveries } from '../../../routes/post/validate/helpers/validate_attack_discoveries';
import { PersistDiscoveriesStepCommonDefinition } from '../../../../common/step_types/persist_discoveries_step';
import { authenticateAndGetSpace } from '../default_validation_step/helpers/authenticate_and_get_space';

export const getPersistDiscoveriesStepDefinition = ({
  adhocAttackDiscoveryDataClient,
  getStartServices,
  logger,
}: {
  adhocAttackDiscoveryDataClient: IRuleDataClient;
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...PersistDiscoveriesStepCommonDefinition,
    handler: async (context) => {
      try {
        const {
          alerts_context_count: alertsContextCount,
          anonymized_alerts: anonymizedAlerts,
          api_config: apiConfig,
          attack_discoveries: attackDiscoveries,
          connector_name: connectorName,
          enable_field_rendering: enableFieldRendering = true,
          generation_uuid: generationUuid,
          replacements,
          source,
          with_replacements: withReplacements = false,
        } = context.input;

        const tracedLogger = createTracedLogger(logger, generationUuid);

        tracedLogger.info('[PERSIST] Handler starting...');

        // Scheduled executions are persisted by the alerting-framework executor
        // (workflowExecutor) via alertsClient, which writes to the dedicated
        // scheduled alerts index. Writing here too would put scheduled
        // discoveries into the ad-hoc index, causing them to appear on the
        // main Attack Discovery page (which only queries the ad-hoc index).
        if (source === 'scheduled') {
          tracedLogger.info(
            '[PERSIST] Skipping ad-hoc persistence for scheduled execution — alertsClient handles persistence to the scheduled index'
          );

          return {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
          };
        }

        if (attackDiscoveries.length === 0) {
          tracedLogger.info('[PERSIST] No discoveries to persist');

          return {
            output: {
              duplicates_dropped_count: 0,
              persisted_discoveries: [],
            },
          };
        }

        context.logger.info(
          `Persisting ${attackDiscoveries.length} attack discoveries (generation: ${generationUuid})`
        );

        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        const { authenticatedUser, spaceId } = await authenticateAndGetSpace({
          coreStart,
          pluginsStart,
          request,
        });

        if (!authenticatedUser) {
          throw new Error(
            'Persist discoveries step failed to resolve authenticated user. Check service account or API key configuration for scheduled runs.'
          );
        }

        const parsedApiConfig = apiConfig as { connector_id?: string } | undefined;
        const connectorId = parsedApiConfig?.connector_id;

        if (!connectorId) {
          throw new Error('Missing connector_id in api_config');
        }

        if (!spaceId) {
          throw new Error('Failed to resolve space id');
        }

        const actionsClient = await pluginsStart.actions.getActionsClientWithRequest(request);

        // connectorName may be '' from upstream workflow steps; asNonEmpty converts
        // it to undefined so resolveConnectorDetails looks up the real name:
        const { connectorName: resolvedConnectorName } = await resolveConnectorDetails({
          actionsClient,
          connectorId,
          connectorName: asNonEmpty(connectorName),
          inference: pluginsStart.inference,
          logger,
          request,
        });

        const result = await validateAttackDiscoveries({
          adhocAttackDiscoveryDataClient,
          authenticatedUser,
          logger: tracedLogger,
          spaceId,
          validateRequestBody: {
            alerts_context_count: alertsContextCount,
            anonymized_alerts: anonymizedAlerts,
            api_config: apiConfig,
            attack_discoveries: attackDiscoveries,
            connector_name: resolvedConnectorName,
            enable_field_rendering: enableFieldRendering,
            generation_uuid: generationUuid,
            replacements,
            with_replacements: withReplacements,
          },
        });

        tracedLogger.info(
          `[PERSIST] Successfully persisted ${
            result.validated_discoveries?.length ?? 0
          } discoveries (${result.duplicates_dropped_count} duplicates dropped)`
        );

        return {
          output: {
            duplicates_dropped_count: result.duplicates_dropped_count,
            persisted_discoveries: result.validated_discoveries,
          },
        };
      } catch (error) {
        logger.debug(
          () => `[PERSIST] ERROR: ${error instanceof Error ? error.stack : String(error)}`
        );

        context.logger.error(
          'Failed to persist discoveries',
          error instanceof Error ? error : undefined
        );

        return {
          error: new Error(
            error instanceof Error ? error.message : 'Failed to persist discoveries'
          ),
        };
      }
    },
  });
