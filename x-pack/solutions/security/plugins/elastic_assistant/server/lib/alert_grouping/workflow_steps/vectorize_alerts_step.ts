/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { vectorizeAlertsStepCommonDefinition } from '../../../../common/workflow_steps';
import {
  getGenericAlertFeatureVector,
  getVal,
} from '../services/hybrid_alert_deduplication';
import type { AlertDocument } from '../services/hybrid_alert_deduplication';

/**
 * Factory for the security.vectorizeAlerts workflow step.
 *
 * A stateless utility step that computes feature vectors for alert documents
 * using getGenericAlertFeatureVector(). Can be used independently for
 * custom similarity workflows.
 */
export const getVectorizeAlertsStepDefinition = () =>
  createServerStepDefinition({
    ...vectorizeAlertsStepCommonDefinition,
    handler: async (context) => {
      try {
        const rawAlerts = context.input.alerts;
        if (!rawAlerts || rawAlerts.length === 0) {
          return { output: { vectors: [] } };
        }

        context.logger.info(`Vectorizing ${rawAlerts.length} alerts`);

        const vectors = rawAlerts.map((hit) => {
          // Handle both ES search hit format and flat alert documents
          const source: AlertDocument =
            hit._source && typeof hit._source === 'object'
              ? (hit._source as AlertDocument)
              : (hit as AlertDocument);

          const alertId =
            (hit._id as string | undefined) ??
            (getVal(source, 'kibana.alert.uuid') as string | undefined) ??
            (getVal(source, 'event.id') as string | undefined) ??
            'unknown';

          const vector = getGenericAlertFeatureVector(source);

          return {
            alertId,
            vector,
            source,
          };
        });

        context.logger.info(`Vectorized ${vectors.length} alerts`);

        return { output: { vectors } };
      } catch (error) {
        context.logger.error('Vectorize alerts step failed', error as Error);
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
