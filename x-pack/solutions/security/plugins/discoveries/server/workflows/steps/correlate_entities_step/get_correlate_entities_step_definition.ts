/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';

import { getOriginalAlertIds } from '@kbn/discoveries/impl/attack_discovery/anonymization';
import { isEntityCorrelationEnabled } from '@kbn/discoveries/impl/lib/helpers/is_entity_correlation_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { asNonEmpty } from '../../../lib/non_empty_string';
import { CorrelateEntitiesStepCommonDefinition } from '../../../../common/step_types/correlate_entities_step';
import { authenticateAndGetSpace } from '../default_validation_step/helpers/authenticate_and_get_space';
import { buildEntityCandidatesQuery } from './helpers/build_entity_candidates_query';
import { classifyEntities } from './helpers/classify_entities';
import { extractEntityCandidates } from './helpers/extract_entity_candidates';
import { extractObservables } from './helpers/extract_observables';
import { findMatchedEuids } from './helpers/find_matched_euids';

/**
 * Narrows an unknown discovery to its alert ids. Supports both snake_case
 * (`alert_ids`, discoveries plugin) and camelCase (`alertIds`,
 * elastic_assistant) field naming.
 */
const getDiscoveryAlertIds = (discovery: unknown): string[] => {
  if (discovery == null || typeof discovery !== 'object') {
    return [];
  }

  const record = discovery as Record<string, unknown>;
  const rawAlertIds = record.alert_ids ?? record.alertIds;

  return Array.isArray(rawAlertIds)
    ? rawAlertIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
};

/**
 * Extracts the discovery-embedded anonymization replacements map (when
 * present) so anonymized alert ids can be de-obfuscated before querying the
 * alerts index.
 */
const getDiscoveryReplacements = (discovery: unknown): Record<string, string> | undefined => {
  if (discovery == null || typeof discovery !== 'object') {
    return undefined;
  }

  const { replacements } = discovery as { replacements?: unknown };

  if (replacements == null || typeof replacements !== 'object' || Array.isArray(replacements)) {
    return undefined;
  }

  return replacements as Record<string, string>;
};

/**
 * Correlates each attack discovery with Entity Store entities (best-effort):
 *
 * 1. Aggregates the discovery's alerts by user/host/service EUID (painless
 *    runtime fields + terms aggs with a `top_hits` sample).
 * 2. Looks the candidate EUIDs up in the Entity Store (`listEntities` with a
 *    terms filter on `entity.id`).
 * 3. Matched EUIDs become `entities: [{ id, type }]`; unmatched values and
 *    Cases-rule observables from the sample docs become
 *    `observable_entities: [{ type_key, value }]`.
 *
 * Degradation contract: this step NEVER fails the workflow for enrichment
 * errors. On any failure (feature flag off, entity store unavailable, agg
 * failure) it logs and returns the discoveries unmodified.
 */
export const getCorrelateEntitiesStepDefinition = ({
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
    ...CorrelateEntitiesStepCommonDefinition,
    handler: async (context) => {
      const { alerts_index_pattern: alertsIndexPattern, attack_discoveries: attackDiscoveries } =
        context.input;

      const passthroughOutput = {
        output: {
          correlated_discoveries: attackDiscoveries,
          entities_matched_count: 0,
          observable_entities_count: 0,
        },
      };

      try {
        const { coreStart, pluginsStart } = await getStartServices();

        if (!(await isEntityCorrelationEnabled(coreStart.featureFlags))) {
          logger.debug(
            () =>
              '[CORRELATE] Attack Discovery entity correlation is disabled; passing discoveries through unmodified'
          );

          return passthroughOutput;
        }

        if (attackDiscoveries.length === 0) {
          logger.debug(() => '[CORRELATE] No discoveries to correlate');

          return passthroughOutput;
        }

        const request = context.contextManager.getFakeRequest();
        const { esClient, spaceId } = await authenticateAndGetSpace({
          coreStart,
          pluginsStart,
          request,
        });

        const index = asNonEmpty(alertsIndexPattern) ?? `.alerts-security.alerts-${spaceId}`;
        const crudClient = pluginsStart.entityStore?.createCRUDClient(esClient, spaceId);

        if (crudClient == null) {
          logger.debug(
            () =>
              '[CORRELATE] Entity Store plugin is unavailable; EUID candidates will be classified as observables'
          );
        }

        let entitiesMatchedCount = 0;
        let observableEntitiesCount = 0;

        const correlatedDiscoveries: unknown[] = [];

        for (const discovery of attackDiscoveries) {
          try {
            const alertIds = getDiscoveryAlertIds(discovery);

            if (alertIds.length === 0 || discovery == null || typeof discovery !== 'object') {
              correlatedDiscoveries.push(discovery);
              continue;
            }

            const originalAlertIds = getOriginalAlertIds({
              alertIds,
              replacements: getDiscoveryReplacements(discovery),
            });

            const searchResponse = await esClient.search(
              { index, ...buildEntityCandidatesQuery({ alertIds: originalAlertIds }) },
              { signal: context.abortSignal }
            );

            const candidates = extractEntityCandidates(
              searchResponse.aggregations as Record<string, unknown> | undefined
            );

            const matchedEuids = await findMatchedEuids({
              crudClient,
              euids: candidates.map(({ euid }) => euid),
              logger,
            });

            const { entities, matchedIdentityValues, observableEntities } = classifyEntities({
              candidates,
              matchedEuids,
            });

            const extractedObservables = extractObservables({
              excludeValues: matchedIdentityValues,
              sources: candidates.map(({ sampleSource }) => sampleSource),
            });

            // Merge classification observables with Cases-rule extracted
            // observables, deduplicating by type_key + value:
            const seenObservables = new Set(
              observableEntities.map(({ type_key: typeKey, value }) => `${typeKey}:${value}`)
            );
            const mergedObservables = [
              ...observableEntities,
              ...extractedObservables.filter(
                ({ type_key: typeKey, value }) => !seenObservables.has(`${typeKey}:${value}`)
              ),
            ];

            entitiesMatchedCount += entities.length;
            observableEntitiesCount += mergedObservables.length;

            correlatedDiscoveries.push({
              ...discovery,
              entities,
              observable_entities: mergedObservables,
            });
          } catch (error) {
            logger.debug(
              () =>
                `[CORRELATE] Failed to correlate a discovery; returning it unmodified: ${
                  error instanceof Error ? error.stack : String(error)
                }`
            );

            correlatedDiscoveries.push(discovery);
          }
        }

        context.logger.info(
          `Correlated ${attackDiscoveries.length} discoveries: ${entitiesMatchedCount} matched entities, ${observableEntitiesCount} observable entities`
        );

        return {
          output: {
            correlated_discoveries: correlatedDiscoveries,
            entities_matched_count: entitiesMatchedCount,
            observable_entities_count: observableEntitiesCount,
          },
        };
      } catch (error) {
        logger.debug(
          () => `[CORRELATE] ERROR: ${error instanceof Error ? error.stack : String(error)}`
        );

        context.logger.error(
          'Failed to correlate entities; passing discoveries through unmodified',
          error instanceof Error ? error : undefined
        );

        // Degradation contract: never fail the workflow for enrichment errors.
        return passthroughOutput;
      }
    },
  });
