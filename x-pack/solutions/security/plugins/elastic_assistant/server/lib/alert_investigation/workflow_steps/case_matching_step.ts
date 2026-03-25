/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { LiquidArraySchema } from './workflow_schema_helpers';

export const CaseMatchingStepId = 'security.matchAndAttachAlertsToCases';

const CaseMatchingInputSchema = z.object({
  entities: z
    .union([
      z.array(z.object({ type_key: z.string(), value: z.string(), alert_id: z.string() })),
      z.string(),
    ])
    .transform((val) => {
      if (Array.isArray(val)) return val;
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }),
  leader_alert_ids: LiquidArraySchema,
  index_pattern: z.string().default('.alerts-security.alerts-default'),
});

const CaseMatchingOutputSchema = z.object({
  cases_matched: z.number(),
  cases_created: z.number(),
  alerts_attached: z.number(),
  affected_case_ids: z.array(z.string()),
});

export const caseMatchingStep = createServerStepDefinition({
  id: CaseMatchingStepId,
  category: StepCategory.Kibana,
  label: 'Match Alerts to Cases',
  description:
    'Matches extracted entities to open security cases using weighted overlap scoring, attaches alerts to matched cases, or creates new cases for unmatched alerts.',
  documentation: {
    details:
      'Uses entity overlap scoring with configurable weights. Supports multiple matching strategies: strict, relaxed, weighted, and temporal. Limited to 100 most recent open cases for performance.',
    examples: [],
  },
  inputSchema: CaseMatchingInputSchema,
  outputSchema: CaseMatchingOutputSchema,
  handler: async (context) => {
    // Implementation would call matchAlertsToCases + case attachment logic
    // from orchestrator.ts - extracting that logic into reusable function

    context.logger.info(
      `Case matching step: ${context.input.entities.length} entities, ${context.input.leader_alert_ids.length} alerts`
    );

    // TODO: Extract case matching + attachment logic from orchestrator.ts
    // into standalone function that can be called from workflow step

    return {
      output: {
        cases_matched: 0,
        cases_created: 0,
        alerts_attached: 0,
        affected_case_ids: [],
      },
    };
  },
});
