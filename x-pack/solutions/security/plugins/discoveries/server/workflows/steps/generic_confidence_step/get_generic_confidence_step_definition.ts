/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { CoreStart, Logger } from '@kbn/core/server';

import {
  computeConfidenceFactors,
  parseAnonymizedAlertsCsv,
  toBand,
} from '@kbn/discoveries/impl/confidence';
import { createTracedLogger } from '@kbn/discoveries/impl/lib/create_traced_logger';
import { isConfidenceEnabled } from '@kbn/discoveries/impl/lib/helpers/is_confidence_enabled';
import type { DiscoveriesPluginStartDeps } from '../../../types';
import { GenericConfidenceStepCommonDefinition } from '../../../../common/step_types/generic_confidence_step';
import type { Confidence } from '../../../../common/step_types/shared_schemas';
import { alertDocsToRows } from './helpers/alert_docs_to_rows';
import { synthesizeConfidence } from './helpers/synthesize_confidence';

/**
 * Server-side implementation of the generic `security.confidence` step. Scores a
 * bundle of alerts (raw ECS docs and/or the anonymized CSV form) and returns ONE
 * calibrated confidence. The deterministic factors are always computed (cheap,
 * no extra privileges); LLM synthesis is layered on top only when the confidence
 * feature flag is on and a connector is supplied. Best-effort: any LLM failure
 * falls back to the deterministic aggregate.
 */
export const getGenericConfidenceStepDefinition = ({
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
    ...GenericConfidenceStepCommonDefinition,
    handler: async (context) => {
      const {
        alerts = [],
        anonymized_alerts: anonymizedAlerts = [],
        api_config: apiConfig,
        context: subject,
        execution_id: executionId,
      } = context.input;

      const tracedLogger = createTracedLogger(logger, executionId ?? 'security.confidence');

      // Build one bundle of scoreable rows from whichever alert shape(s) the
      // caller supplied. No ES call — only step inputs are read.
      const csvRows = [...parseAnonymizedAlertsCsv(anonymizedAlerts).values()];
      const docRows = alertDocsToRows(alerts);
      const alertRows = [...csvRows, ...docRows];
      const alertCount = alertRows.length;

      const deterministic = computeConfidenceFactors({
        alertRows,
        alertCount,
        mitreTacticNamesFallback: subject?.mitre_attack_tactics,
      });

      let confidence: Confidence | undefined;

      try {
        const { coreStart, pluginsStart } = await getStartServices();
        const enabled = await isConfidenceEnabled(coreStart.featureFlags);
        const connectorId = apiConfig?.connector_id;
        const { inference } = pluginsStart;

        if (enabled && connectorId && inference != null) {
          try {
            confidence = await synthesizeConfidence({
              connectorId,
              deterministic,
              inference,
              request: context.contextManager.getFakeRequest(),
              signal: context.abortSignal,
              subject,
            });
          } catch (error) {
            tracedLogger.warn(
              `[CONFIDENCE] LLM scoring failed; using deterministic fallback: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      } catch (error) {
        tracedLogger.warn(
          `[CONFIDENCE] Unable to resolve services; using deterministic fallback: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
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

      tracedLogger.info(
        `[CONFIDENCE] Scored a bundle of ${alertCount} alerts: ${
          confidence.band ?? 'n/a'
        } (${confidence.score.toFixed(2)})`
      );

      return { output: { alert_count: alertCount, confidence } };
    },
  });
