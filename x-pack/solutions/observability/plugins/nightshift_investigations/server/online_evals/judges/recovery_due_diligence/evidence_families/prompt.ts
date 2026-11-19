/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import { z, lazySchema } from '@kbn/zod/v4';
import { withIdentifierRule } from '../../with_identifier_rule';
import { EVIDENCE_FAMILIES, type EvidenceFamily } from '../families';

export const RECOVERY_EVIDENCE_FAMILIES_TOOL_NAME = 'score_recovery_evidence_families';

export const buildEvidenceFamiliesSystemPrompt = (
  families: readonly EvidenceFamily[]
): string => `You audit which kinds of data an AI agent queried during an alert-recovery round. You get one round: the recovery request, each tool call the agent made with its arguments and result, and its final answer.

For every family below, decide whether the agent queried it. "queried" is true only when a tool call in this round actually executed a read or query against that kind of data, even when the call returned nothing or was denied. Judge by what each call targeted (the index, data stream, API or tool), not by words that merely appear: a field name, a note, or a query that was written into a script but never run does not count. A family can be reached together with another, such as a remote cluster's APM metrics. Give the number of the tool call that reached it, or 0 when none did.

Families:
${families.map(({ id, description }) => `- ${id}: ${description}`).join('\n')}`;

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

/** The prompt for a set of families; the eval suite drops the ones its guardrail forbids. */
export const createEvidenceFamiliesPrompt = (
  families: readonly EvidenceFamily[] = EVIDENCE_FAMILIES
) =>
  createPrompt({
    name: 'nightshift_recovery_evidence_families',
    description: 'Audits which kinds of data a recovery round actually queried.',
    input: lazySchema(() => z.object({ transcript: z.string() })),
  })
    .version({
      system: {
        mustache: { template: withIdentifierRule(buildEvidenceFamiliesSystemPrompt(families)) },
      },
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
                    id: { type: 'string', enum: families.map(({ id }) => id) },
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

export const recoveryEvidenceFamiliesPrompt = createEvidenceFamiliesPrompt();

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
