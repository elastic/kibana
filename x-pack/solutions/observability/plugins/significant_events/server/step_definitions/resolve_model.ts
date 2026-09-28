/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  MAX_ID_LENGTH,
  NightshiftModelBlockedError,
  type NightshiftModelStep,
} from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { resolveSignificantEventsModelForRequest } from '../model_resolution';

const significantEventsModelSteps = [
  'discovery',
  'kiExtraction',
  'kiQueryGeneration',
] as const satisfies readonly NightshiftModelStep[];

export const resolveModelStepDefinition = ({
  getInference,
  getSavedObjects,
  getUiSettings,
  logger,
}: {
  getInference: () => InferenceServerStart | undefined;
  getSavedObjects: () => CoreStart['savedObjects'] | undefined;
  getUiSettings: () => CoreStart['uiSettings'] | undefined;
  logger: Logger;
}) =>
  createServerStepDefinition({
    id: 'significantEvents.resolveModel',
    label: 'Resolve Significant Events model',
    category: StepCategory.Ai,
    description: 'Validates and resolves the model used by a Significant Events step.',
    inputSchema: z.object({
      step: z.enum(significantEventsModelSteps),
      connector_id: z.string().max(MAX_ID_LENGTH).optional(),
    }),
    outputSchema: z.object({
      connector_id: z.string().max(MAX_ID_LENGTH),
    }),
    handler: async (context) => {
      const inference = getInference();
      const savedObjects = getSavedObjects();
      const uiSettings = getUiSettings();
      if (!inference || !savedObjects || !uiSettings) {
        throw new Error('Significant Events model resolution is unavailable');
      }

      try {
        const connectorId = await resolveSignificantEventsModelForRequest({
          request: context.contextManager.getFakeRequest(),
          inference,
          savedObjects,
          uiSettings,
          step: context.input.step,
          requestedId: context.input.connector_id,
        });

        return { output: { connector_id: connectorId } };
      } catch (error) {
        if (error instanceof NightshiftModelBlockedError) {
          logger.error(error);
        }
        throw error;
      }
    },
  });
