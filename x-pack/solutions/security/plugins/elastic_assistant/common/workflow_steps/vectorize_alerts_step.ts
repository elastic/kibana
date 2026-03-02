/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const VECTORIZE_ALERTS_STEP_ID = 'security.vectorizeAlerts';

export const VectorizeAlertsInputSchema = z.object({
  alerts: z.array(z.record(z.string(), z.unknown())),
});

export const VectorizeAlertsOutputSchema = z.object({
  vectors: z.array(
    z.object({
      alertId: z.string(),
      vector: z.array(z.number()),
      source: z.record(z.string(), z.unknown()),
    })
  ),
});

export const vectorizeAlertsStepCommonDefinition = {
  id: VECTORIZE_ALERTS_STEP_ID,
  inputSchema: VectorizeAlertsInputSchema,
  outputSchema: VectorizeAlertsOutputSchema,
};
