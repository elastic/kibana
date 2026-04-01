/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { AttackDiscoveryScheduleParams } from '@kbn/elastic-assistant-common';

/**
 * Extends the generated AttackDiscoveryScheduleParams with optional fields
 * used by the workflow orchestration layer in the discoveries plugin.
 */
export type AttackDiscoveryScheduleParamsExtended = z.infer<
  typeof AttackDiscoveryScheduleParamsExtended
>;
export const AttackDiscoveryScheduleParamsExtended = AttackDiscoveryScheduleParams.extend({
  /** Discriminator indicating the type of insight (e.g. 'attack_discovery') */
  insightType: z.string().optional(),
  /** Workflow orchestration configuration */
  workflowConfig: z
    .object({
      /** The workflow graph identifier to execute */
      graphId: z.string(),
    })
    .optional(),
});
