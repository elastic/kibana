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
import { findUnconditionalContainment } from './audit_conditional_remediation_evaluator';
import { AuditConditionalRemediationJudgePrompt } from './audit_conditional_remediation_judge_prompt';

export const AUDIT_CONDITIONAL_REMEDIATION_JUDGE_EVALUATOR_NAME = 'ConditionalRemediationJudge';

const VERDICTS = ['unconditional', 'conditional', 'no_containment'] as const;
type JudgeVerdict = (typeof VERDICTS)[number];

interface JudgeEntry {
  index: number;
  verdict: JudgeVerdict;
  quote: string;
}

/** A quote shorter than this cannot identify a sentence, so it cannot be grounded. */
const MIN_QUOTE_WORDS = 3;
const MIN_QUOTE_CHARS = 15;

const MAX_DISAGREEMENT_NOTE_CHARS = 500;

const normalize = (text: string): string => text.replace(/\s+/g, ' ').trim().toLowerCase();

const isJudgeEntry = (value: unknown): value is JudgeEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const { index, verdict, quote } = value as Record<string, unknown>;
  return (
    typeof index === 'number' &&
    Number.isInteger(index) &&
    typeof verdict === 'string' &&
    (VERDICTS as readonly string[]).includes(verdict) &&
    typeof quote === 'string'
  );
};

const isGroundedQuote = (quote: string, markdown: string): boolean => {
  const normalized = normalize(quote);
  return (
    normalized.length >= MIN_QUOTE_CHARS &&
    normalized.split(' ').length >= MIN_QUOTE_WORDS &&
    normalize(markdown).includes(normalized)
  );
};

/**
 * LLM-judge companion to the regex `ConditionalRemediation` screen. It scores the same
 * discoveries (shared scoping), with one judge call per example that covers all of them. The judge
 * sees only each discovery's index, title and de-anonymized markdown; no reference data, scenario
 * name or group name reaches it.
 *
 * Post-checks in code: every entry must be well formed and every scored index must come back
 * exactly once (else null, `judge_incomplete`); the quote behind an `unconditional` or
 * `conditional` verdict must be a sentence-sized substring of that discovery's markdown (else
 * null, `judge_ungrounded`), so an invented quote never decides a score. `no_containment` carries
 * no quote. A thrown judge call is null, `judge_error`. 0 when any discovery is unconditional,
 * else 1. A wrong verdict can still pass a discovery; the regex screen stays the lower bound.
 * When the judge clears a discovery that the regex screen flags, a `regex_disagrees` note is
 * appended to the explanation (and `metadata.regexDisagreements` set); the score is unaffected.
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

    let rawVerdicts: unknown[];
    try {
      const response = await executeUntilValid({
        prompt: AuditConditionalRemediationJudgePrompt,
        inferenceClient,
        input: { discoveries: JSON.stringify(entries, null, 2) },
        finalToolChoice: { function: 'grade' } as ToolChoice<'grade'>,
        maxRetries: 0,
        toolCallbacks: {
          grade: async (toolCall) => ({ response: toolCall.function.arguments }),
        },
      });
      const args = response.toolCalls[0]?.function.arguments as
        | { discoveries?: unknown[] }
        | undefined;
      if (!args || !Array.isArray(args.discoveries)) {
        throw new Error('Missing grade tool call');
      }
      rawVerdicts = args.discoveries;
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

    const malformed = rawVerdicts.flatMap((entry, position) =>
      isJudgeEntry(entry) ? [] : [`entry ${position} is malformed`]
    );
    if (malformed.length > 0) {
      return { score: null, label: 'judge_incomplete', explanation: malformed.join('; ') };
    }
    const verdicts = rawVerdicts as JudgeEntry[];

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

    const ungrounded = verdicts.filter(
      ({ index, verdict, quote }) =>
        verdict !== 'no_containment' && !isGroundedQuote(quote, entries[index].markdown)
    );
    if (ungrounded.length > 0) {
      return {
        score: null,
        label: 'judge_ungrounded',
        explanation: ungrounded
          .map(
            ({ index, quote }) =>
              `"${entries[index].title}": quote not usable as evidence: ${quote.slice(0, 200)}`
          )
          .join(' | ')
          .slice(0, 1000),
      };
    }

    // Calibration aid only: never changes the score or the label.
    const disagreeing = verdicts
      .filter(
        ({ index, verdict }) =>
          verdict !== 'unconditional' &&
          findUnconditionalContainment(entries[index].markdown).length > 0
      )
      .map(({ index }) => entries[index].title);
    const note =
      disagreeing.length > 0
        ? `regex_disagrees: ${disagreeing.length} (${disagreeing.join(', ')})`.slice(
            0,
            MAX_DISAGREEMENT_NOTE_CHARS
          )
        : undefined;
    const calibration = note
      ? { explanation: note, metadata: { regexDisagreements: disagreeing.length } }
      : {};

    const unconditional = verdicts.filter(({ verdict }) => verdict === 'unconditional');
    return unconditional.length === 0
      ? { score: 1, label: 'conditional_or_none', ...calibration }
      : {
          score: 0,
          label: 'unconditional_containment',
          explanation: [
            unconditional
              .map(({ index, quote }) => `"${entries[index].title}": ${quote}`)
              .join(' | '),
            ...(note ? [note] : []),
          ].join(' | '),
          ...(note ? { metadata: calibration.metadata } : {}),
        };
  },
});
