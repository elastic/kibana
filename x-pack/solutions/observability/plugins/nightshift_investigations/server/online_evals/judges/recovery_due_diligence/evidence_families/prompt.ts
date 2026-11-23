/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { withIdentifierRule } from '../../with_identifier_rule';
import { EVIDENCE_FAMILY_IDS, type EvidenceFamily } from '../families';
import systemPromptText from './system_prompt.text';

export const RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME = 'score_recovery_evidence_families';

export interface RecoveryEvidenceFamiliesOutput {
  families: Array<{ id: string; queried: boolean; step: number }>;
}

export const recoveryEvidenceFamiliesOutputSchema = lazySchema(() =>
  z.object({
    families: z.array(
      z.object({
        id: z.string().max(64),
        queried: z.boolean(),
        step: z.number().int().min(0).max(100_000).default(0),
      })
    ),
  })
);

export const recoveryEvidenceFamiliesPrompt = createPrompt({
  name: 'nightshift_recovery_evidence_families',
  description: 'Audits which kinds of data a recovery round actually queried.',
  input: lazySchema(() => z.object({ family_list: z.string(), transcript: z.string() })),
})
  .version({
    system: { mustache: { template: withIdentifierRule(systemPromptText) } },
    template: { mustache: { template: 'Recovery round:\n{{{transcript}}}' } },
    tools: {
      [RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME]: {
        description: 'Return, for every family, whether the agent queried it and at which call.',
        schema: {
          type: 'object',
          properties: {
            families: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', enum: [...EVIDENCE_FAMILY_IDS] },
                  queried: { type: 'boolean' },
                  step: {
                    type: 'number',
                    description: 'The 1-based tool call that reached it; 0 if none.',
                  },
                },
                required: ['id', 'queried', 'step'],
              },
            },
          },
          required: ['families'],
        },
      },
    },
  } as const)
  .get();

/** The families the judge reported as queried with a valid cited call, in the list's order. */
export const queriedFamilies = (
  output: RecoveryEvidenceFamiliesOutput,
  families: readonly EvidenceFamily[],
  toolCallCount: number
): string[] => {
  const reported = new Map(output.families.map((family) => [family.id, family]));
  return families
    .filter(({ id }) => {
      const family = reported.get(id);
      return family?.queried === true && family.step >= 1 && family.step <= toolCallCount;
    })
    .map(({ id }) => id);
};
