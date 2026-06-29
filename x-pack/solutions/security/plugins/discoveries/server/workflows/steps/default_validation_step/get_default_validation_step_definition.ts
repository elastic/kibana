/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { Logger } from '@kbn/core/server';
import type { CoreStart } from '@kbn/core/server';

import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { asNonEmpty } from '../../../lib/non_empty_string';
import { resolveConnectorDetails } from '../../helpers/resolve_connector_details';
import { DefaultValidationStepCommonDefinition } from '../../../../common/step_types/default_validation_step';
import { authenticateAndGetSpace } from './helpers/authenticate_and_get_space';
import { filterAndValidateDiscoveries } from './helpers/filter_and_validate_discoveries';
import { handleValidationError } from './helpers/handle_validation_error';
import { transformDiscoveriesToOutputFormat } from './helpers/transform_discoveries_to_output_format';

/**
 * Server-side implementation of the default validation step.
 * Performs hallucination detection and deduplication on Attack Discoveries.
 */
export const getDefaultValidationStepDefinition = ({
  getStartServices,
  logger,
}: {
  getStartServices: () => Promise<{
    coreStart: CoreStart;
    pluginsStart: DiscoveriesPluginStartDeps;
  }>;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...DefaultValidationStepCommonDefinition,
    handler: async (context) => {
      try {
        const {
          alerts_index_pattern: alertsIndexPattern = '.alerts-security.alerts-*',
          api_config: apiConfig,
          attack_discoveries: attackDiscoveries,
          connector_name: connectorName,
          generation_uuid: generationUuid,
          replacements,
        } = context.input;

        const tracedLogger = createTracedLogger(logger, generationUuid);

        tracedLogger.info('[VALIDATE] Handler starting...');
        tracedLogger.debug(
          () => `[VALIDATE] Context input: ${JSON.stringify(context.input, null, 2)}`
        );

        const { coreStart, pluginsStart } = await getStartServices();
        const request = context.contextManager.getFakeRequest();

        const { esClient } = await authenticateAndGetSpace({
          coreStart,
          pluginsStart,
          request,
        });

        const parsedApiConfig = apiConfig as { connector_id?: string } | undefined;
        const connectorId = parsedApiConfig?.connector_id;

        if (!connectorId) {
          throw new Error('Missing connector_id in api_config');
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

        const { filteredCount, filterReason, shouldValidate, validDiscoveries } =
          await filterAndValidateDiscoveries({
            alertsIndexPattern,
            attackDiscoveries,
            contextLogger: context.logger,
            esClient,
            generationUuid,
            logger: tracedLogger,
          });

        tracedLogger.info(
          `[VALIDATE] Filter result: shouldValidate=${shouldValidate}, validDiscoveries=${
            validDiscoveries.length
          }, filteredCount=${filteredCount}, originalCount=${attackDiscoveries?.length ?? 0}`
        );

        if (!shouldValidate) {
          tracedLogger.warn(
            `[VALIDATE] No discoveries to validate after filtering. Original count: ${
              attackDiscoveries?.length ?? 0
            }`
          );

          return {
            output: {
              ...(filterReason != null ? { filter_reason: filterReason } : {}),
              filtered_count: filteredCount,
              validated_discoveries: [],
            },
          };
        }

        context.logger.info(
          `Validating ${validDiscoveries.length} attack discoveries (generation: ${generationUuid})`
        );

        const transformedDiscoveries = transformDiscoveriesToOutputFormat({
          attackDiscoveries: validDiscoveries,
          connectorId,
          connectorName: resolvedConnectorName,
          generationUuid,
          replacements,
        });

        return {
          output: {
            ...(filterReason != null ? { filter_reason: filterReason } : {}),
            filtered_count: filteredCount,
            validated_discoveries: transformedDiscoveries,
          },
        };
      } catch (error) {
        return handleValidationError({
          contextLogger: context.logger,
          error,
          logger,
        });
      }
    },
  });
