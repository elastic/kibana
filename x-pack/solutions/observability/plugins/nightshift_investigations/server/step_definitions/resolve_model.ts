/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { NightshiftModelBlockedError } from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { MAX_KEYWORD_LENGTH } from '../../common';

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
    id: 'nightshift.resolveModel',
    label: 'Resolve Nightshift model',
    category: StepCategory.Ai,
    description: 'Validates and resolves the model used by a Nightshift investigation step.',
    inputSchema: z.object({
      step: z.literal('investigation'),
      connector_id: z.string().max(MAX_KEYWORD_LENGTH).optional(),
      round_connector_id: z.string().max(MAX_KEYWORD_LENGTH).optional(),
    }),
    outputSchema: z.object({
      connector_id: z.string(),
    }),
    handler: async (context) => {
      const inference = getInference();
      const savedObjects = getSavedObjects();
      const uiSettings = getUiSettings();
      if (!inference || !savedObjects || !uiSettings) {
        throw new Error('Nightshift model resolution is unavailable');
      }

      try {
        const connectorId = await resolveNightshiftModelForRequest({
          request: context.contextManager.getFakeRequest(),
          inference,
          savedObjects,
          uiSettings,
          step: context.input.step,
          requestedId: context.input.connector_id,
          roundConnectorId: context.input.round_connector_id,
          onFallback: (reason) =>
            logger.warn(
              `Nightshift round model is unavailable, using the default: ${reason.message}`
            ),
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
