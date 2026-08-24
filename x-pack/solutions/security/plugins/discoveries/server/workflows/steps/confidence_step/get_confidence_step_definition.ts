/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';

import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import { isConfidenceEnabled } from '@kbn/discoveries/impl/lib/helpers/is_confidence_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { ConfidenceStepCommonDefinition } from '../../../../common/step_types/confidence_step';
import type { Confidence } from '../../../../common/step_types/shared_schemas';
import { computeDeterministicFactors, toBand } from './helpers/compute_deterministic_factors';
import { parseAnonymizedAlertsCsv } from './helpers/parse_anonymized_alerts_csv';
import { scoreWithLlm } from './helpers/score_with_llm';

/**
 * Server-side implementation of the confidence step. Annotates each validated
 * Attack Discovery with a calibrated `confidence` (0.0-1.0) in place. Best-effort
 * by design: any failure returns the discoveries unchanged so persistence still
 * proceeds (annotate-only, never gates the pipeline).
 */
export const getConfidenceStepDefinition = ({
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
    ...ConfidenceStepCommonDefinition,
    handler: async (context) => {
      const {
        anonymized_alerts: anonymizedAlerts = [],
        api_config: apiConfig,
        attack_discoveries: attackDiscoveries,
        generation_uuid: generationUuid,
      } = context.input;

      const tracedLogger = createTracedLogger(logger, generationUuid);

      try {
        const { coreStart, pluginsStart } = await getStartServices();

        // Own feature flag, independent of attackDiscoveryWorkflowsEnabled: when
        // OFF the step is a pass-through no-op so persist reads it unconditionally.
        const enabled = await isConfidenceEnabled(coreStart.featureFlags);
        if (!enabled) {
          tracedLogger.debug(
            () => '[CONFIDENCE] Feature flag OFF; passing discoveries through unchanged'
          );
          return { output: { attack_discoveries: attackDiscoveries, scored_count: 0 } };
        }

        const connectorId = apiConfig.connector_id;
        if (!connectorId) {
          throw new Error('Missing connector_id in api_config');
        }

        const request = context.contextManager.getFakeRequest();
        const { inference } = pluginsStart;
        // No ES call: the deterministic factors are computed from the anonymized
        // alert CSV that is already an input to this step.
        const rowsById = parseAnonymizedAlertsCsv(anonymizedAlerts);

        let llmScoredCount = 0;
        const scored: Array<Record<string, unknown>> = [];

        for (const discovery of attackDiscoveries) {
          const deterministic = computeDeterministicFactors({ discovery, rowsById });

          let confidence: Confidence | undefined;
          if (inference != null) {
            try {
              confidence = await scoreWithLlm({
                connectorId,
                deterministic,
                discovery,
                inference,
                request,
                signal: context.abortSignal,
              });
              llmScoredCount += 1;
            } catch (error) {
              tracedLogger.warn(
                `[CONFIDENCE] LLM scoring failed; using deterministic fallback: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }

          if (confidence == null) {
            confidence = {
              band: toBand(deterministic.baseScore),
              factors: deterministic.factors,
              rationale:
                'Deterministic fallback (LLM synthesis unavailable): score derived from evidence breadth, MITRE completeness, structural chain coherence, and counter-evidence.',
              score: deterministic.baseScore,
            };
          }

          scored.push({ ...discovery, confidence });
        }

        tracedLogger.info(
          `[CONFIDENCE] Annotated ${scored.length} discoveries (${llmScoredCount} via LLM, ${
            scored.length - llmScoredCount
          } deterministic fallback)`
        );

        return { output: { attack_discoveries: scored, scored_count: scored.length } };
      } catch (error) {
        // Never fail the pipeline: return discoveries unchanged so persist proceeds.
        tracedLogger.error(
          `[CONFIDENCE] Handler error; passing discoveries through unscored: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { output: { attack_discoveries: attackDiscoveries, scored_count: 0 } };
      }
    },
  });
