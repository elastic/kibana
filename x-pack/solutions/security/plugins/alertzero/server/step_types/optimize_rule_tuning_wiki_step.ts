/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { optimizeRuleTuningWiki } from '../wiki/optimize_rule_tuning_wiki';

const inputSchema = z.object({
  rule_name: z.string().min(1).max(512),
  rule_id: z.string().min(1).max(512),
  diagnosis: z
    .object({
      change_type: z.string().max(64).optional(),
      reasoning: z.string().max(20_000).optional(),
      fp_pattern: z.string().max(4000).optional(),
      proposed_query: z.string().max(50_000).optional(),
    })
    .default({}),
  gate_outcome: z.enum(['approved', 'rejected', 'expired']),
});

const outputSchema = z.object({
  edits: z.array(
    z.object({
      action: z.enum(['upsert', 'corroborate', 'archive']),
      entity_type: z.string(),
      slug: z.string(),
      title: z.string(),
      description: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(['established', 'tentative', 'archived']).optional(),
    })
  ),
});

export const optimizeRuleTuningWikiStepDefinition = createServerStepDefinition({
  id: 'alertzero.optimizeRuleTuningWiki',
  label: i18n.translate('xpack.alertzero.steps.optimizeRuleTuningWiki.label', {
    defaultMessage: 'Optimize Rule Tuning wiki',
  }),
  description: i18n.translate('xpack.alertzero.steps.optimizeRuleTuningWiki.description', {
    defaultMessage:
      'Maps a Rule Tuning diagnosis and proposal-gate outcome into wiki edit proposals.',
  }),
  category: StepCategory.Ai,
  stability: 'tech_preview',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    const input = inputSchema.parse(context.input);
    return {
      output: optimizeRuleTuningWiki({
        ruleName: input.rule_name,
        ruleId: input.rule_id,
        diagnosis: input.diagnosis,
        gateOutcome: input.gate_outcome,
      }),
    };
  },
});
