/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { BoundInferenceClient, ToolChoice } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { Evaluator } from '@kbn/evals';
import { getDiscoveryMarkdown } from '../audit_failure_classes/discovery_text';
import type { AuditReferenceResolver } from '../audit_failure_classes/registry';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';
import { resolveScoredDiscoveries } from './audit_evaluator_helpers';
import { AuditConditionalRemediationJudgePrompt } from './audit_conditional_remediation_judge_prompt';

export const AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME = 'ConditionalRemediationJudge';

type JudgeVerdict = 'unconditional' | 'conditional' | 'no_containment';

interface JudgeEntry {
  index: number;
  verdict: JudgeVerdict;
  quote: string;
  explanation: string;
}

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * LLM-judge companion to the regex `ConditionalRemediation` screen. It scores the same
 * discoveries (shared scoping), with one judge call per example that covers all of them. The judge
 * sees only each discovery's index, title and de-anonymized markdown; no reference data, scenario
 * name or group name reaches it.
 *
 * Post-checks in code: every scored index must come back exactly once (else null,
 * `judge_incomplete`), and the quote behind an `unconditional` verdict must appear in that
 * discovery's markdown (else null, `judge_ungrounded`), so an invented quote never fails a run. A
 * thrown judge call is null, `judge_error`. 0 when any discovery is unconditional, else 1.
 */
export const createAuditConditionalRemediationJudgeEvaluator = ({
  inferenceClient,
  log,
  resolveReference,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  resolveReference?: AuditReferenceResolver;
}): Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput> => ({
  name: AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME,
  kind: 'LLM',
  direction: 'maximize',
  evaluate: async ({ output, metadata }) => {
    const resolved = resolveScoredDiscoveries({ metadata, output, resolveReference });
    if ('result' in resolved) return resolved.result;

    const entries = resolved.scored.map((discovery, index) => ({
      index,
      title: discovery.title,
      markdown: getDiscoveryMarkdown(discovery),
    }));

    let verdicts: JudgeEntry[];
    try {
      const response = await executeUntilValid({
        prompt: AuditConditionalRemediationJudgePrompt,
        inferenceClient,
        input: { discoveries: JSON.stringify(entries, null, 2) },
        finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
        maxRetries: 3,
        toolCallbacks: {
          grade: async (toolCall) => ({ response: toolCall.function.arguments }),
        },
      });
      const args = response.toolCalls[0]?.function.arguments as
        | { discoveries?: JudgeEntry[] }
        | undefined;
      if (!args || !Array.isArray(args.discoveries)) {
        throw new Error('Missing grade tool call');
      }
      verdicts = args.discoveries;
    } catch (error) {
      log.error(
        `ConditionalRemediationJudge call failed: ${error instanceof Error ? error.message : error}`
      );
      return {
        score: null,
        label: 'judge_error',
        explanation: String(error instanceof Error ? error.message : error).slice(0, 500),
      };
    }

    const counts = new Map<number, number>();
    verdicts.forEach(({ index }) => counts.set(index, (counts.get(index) ?? 0) + 1));
    const problems = [
      ...entries.flatMap(({ index }) => {
        const count = counts.get(index) ?? 0;
        return count === 1 ? [] : [`index ${index} appears ${count} times`];
      }),
      ...[...counts.keys()]
        .filter((index) => !entries.some((entry) => entry.index === index))
        .map((index) => `unexpected index ${index}`),
    ];
    if (problems.length > 0) {
      return { score: null, label: 'judge_incomplete', explanation: problems.join('; ') };
    }

    const unconditional = verdicts.filter(({ verdict }) => verdict === 'unconditional');
    const ungrounded = unconditional.filter(
      ({ index, quote }) =>
        normalize(quote).length === 0 ||
        !normalize(entries[index].markdown).includes(normalize(quote))
    );
    if (ungrounded.length > 0) {
      return {
        score: null,
        label: 'judge_ungrounded',
        explanation: ungrounded
          .map(({ index, quote }) => `"${entries[index].title}": quote not in markdown: ${quote}`)
          .join(' | '),
      };
    }

    return unconditional.length === 0
      ? { score: 1, label: 'conditional_or_none' }
      : {
          score: 0,
          label: 'unconditional_containment',
          explanation: unconditional
            .map(({ index, quote }) => `"${entries[index].title}": ${quote}`)
            .join(' | '),
        };
  },
});
