/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import pRetry from 'p-retry';
import { z } from '@kbn/zod/v4';

export const ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME = 'ES|QL Functional Equivalence';

/**
 * Calibration version stamped into every score document's metadata so
 * historical scores in the golden cluster can be partitioned cleanly:
 *
 *   - `v1` (framework default): vague "Yes/No" rubric, no calibration.
 *   - `v2` (this evaluator):    three-point rubric + few-shot + bias toward
 *                               conservative partial credit for caveats.
 *
 * The Kibana evaluations data stream keys evaluator history on
 * `evaluator.name` only, so we deliberately keep the same name as the
 * framework's evaluator (history-compatible). Dashboards that want to
 * isolate v2 trend can filter on `evaluator.metadata.judgeVersion`.
 */
export const ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION = 'v2';

/**
 * Three-point judgement returned by the LLM judge. Mapped to a numeric
 * score for the golden-cluster trend dashboards.
 */
type EquivalenceJudgement = 'equivalent' | 'equivalent_with_caveats' | 'not_equivalent';

const JUDGEMENT_TO_SCORE: Record<EquivalenceJudgement, number> = {
  equivalent: 1,
  equivalent_with_caveats: 0.5,
  not_equivalent: 0,
};

const JUDGEMENT_TO_LABEL: Record<EquivalenceJudgement, string> = {
  equivalent: 'Equivalent ES|QL query',
  equivalent_with_caveats: 'Equivalent with caveats',
  not_equivalent: 'Non-equivalent ES|QL query',
};

/**
 * Calibrated rubric. Spelled out enough that smaller judge models (Sonnet,
 * GPT-4o-mini, gpt-oss-120b) don't anchor on token-level similarity, and
 * tight enough that the larger ones don't free-associate.
 *
 * The leading sections cover:
 *   1. What "functional equivalence" means (logical outcome, not syntax).
 *   2. Three-point scale with concrete grading anchors.
 *   3. Allow-list of transformations that DO NOT break equivalence —
 *      drawn from real failure cases in the suite (column renames,
 *      `?_tstart` ↔ literal date, equivalent date functions, etc.).
 *   4. Deny-list of patterns that DO break equivalence (wrong aggregation,
 *      wrong source, missing critical filter, swapped subject).
 *   5. Tie-breaker rule: when unsure between "equivalent" and
 *      "equivalent_with_caveats", pick the latter — biases the judge
 *      against false-positive equivalence claims that mask real
 *      regressions.
 */
const SYSTEM_PROMPT = `You are a senior Elasticsearch analyst evaluating whether a candidate ES|QL query is functionally equivalent to a gold reference ES|QL query.

Two queries are FUNCTIONALLY EQUIVALENT when they would produce the same answer for the same underlying question, even if the syntax differs. Judge on a three-point scale:

- "equivalent" (score 1.0):
  The candidate produces the same logical result as the gold for the question being asked. Any differences are purely surface-level (aliases, output column ordering, equivalent function forms).
- "equivalent_with_caveats" (score 0.5):
  The candidate captures the same intent but has a non-trivial deviation: a slightly different field choice, a different LIMIT, a reasonable but distinct filter threshold, or a partial subset of what the gold computes.
- "not_equivalent" (score 0.0):
  The candidate answers a different question, queries the wrong data source, applies the wrong aggregation, omits a critical filter that changes the result substantially, or is entirely off-topic.

TREAT THE FOLLOWING AS EQUIVALENT (do NOT penalise):
- Column alias differences: \`STATS count = COUNT(*)\` vs \`STATS total = COUNT(*)\`.
- Equivalent function forms: \`DATE_EXTRACT("hour", @timestamp)\` vs \`HOUR(@timestamp)\`; \`SUBSTRING(x, 1, 3)\` vs \`LEFT(x, 3)\`.
- Equivalent comparison forms: \`x >= 5 AND x <= 10\` vs \`x BETWEEN 5 AND 10\`; \`a == "x" AND b == "y"\` vs \`a == "x" | WHERE b == "y"\`.
- Output column ordering or extra cosmetic \`KEEP\`/\`DROP\` clauses that don't change the answer.
- Time-range bind parameters: \`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend\` is equivalent to a hardcoded time-range literal of the same window — both refer to "the user's time of interest".
- Different but compatible bucketing where the granularity is interchangeable for the question (e.g. \`BUCKET(@timestamp, 1h)\` vs \`BUCKET(@timestamp, 50, ?_tstart, ?_tend)\` over the same window when the question is "by hour").
- Broader index patterns that still cover the same logical dataset: \`logs-*\` vs \`logs-endpoint.*\` when the gold uses the broader pattern.
- Different but equivalent ordering of clauses (\`SORT ... | LIMIT n\` vs \`LIMIT n | SORT ...\` when the result set fits in n).

TREAT THE FOLLOWING AS NOT EQUIVALENT (DO penalise):
- Wrong aggregation: gold uses \`AVG\`, candidate uses \`MAX\` (or \`SUM\` vs \`COUNT\`, etc.).
- Wrong index source: gold queries \`logs-*\`, candidate queries \`metrics-*\` or \`.alerts-*\`.
- Missing critical filter: gold filters \`event.action == "failure"\` and the candidate has no equivalent filter at all.
- Different subject: gold groups by \`user.name\`, candidate groups by \`host.name\`.
- Hallucinated or wrong field: candidate references \`source.user\` when the gold (and the question) clearly means \`user.name\`.
- Different question being answered (gold counts authentication failures, candidate lists all processes).

TIE-BREAKER:
When you're genuinely uncertain whether a difference matters, return "equivalent_with_caveats". Reserve "equivalent" for cases where any reasonable analyst would treat the two queries as interchangeable.

CALL THE \`evaluate\` TOOL with your judgement and a 1-2 sentence reason. Do not respond in prose.`;

const USER_PROMPT = `Here is the task:

Gold ES|QL query (reference):
\`\`\`esql
{{{ground_truth}}}
\`\`\`

Candidate ES|QL query (under evaluation):
\`\`\`esql
{{{prediction}}}
\`\`\`

Score the candidate's functional equivalence to the gold.`;

const CalibratedEsqlEquivalencePrompt = createPrompt({
  name: 'security_esql_equivalence_v2',
  description:
    'Three-point calibrated rubric judging ES|QL functional equivalence with explicit allow/deny lists for common transformations.',
  input: z.object({
    ground_truth: z.string(),
    prediction: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: SYSTEM_PROMPT,
      },
    },
    template: {
      mustache: {
        template: USER_PROMPT,
      },
    },
    toolChoice: {
      function: 'evaluate',
    },
    tools: {
      evaluate: {
        description:
          'Score the functional equivalence of the candidate ES|QL query to the gold reference using the three-point rubric.',
        schema: {
          type: 'object',
          properties: {
            equivalence: {
              type: 'string',
              enum: ['equivalent', 'equivalent_with_caveats', 'not_equivalent'],
              description:
                'Three-point equivalence judgement; see system prompt rubric. Use "equivalent_with_caveats" when unsure.',
            },
            reason: {
              type: 'string',
              description:
                'Briefly explain the reasoning (1-2 sentences). Cite the specific clause that drove the judgement.',
            },
          },
          required: ['equivalence', 'reason'],
        },
      },
    },
  } as const)
  .get();

type EsqlPredictionExtractor<T = unknown> = (output: T) => string;
type EsqlGroundTruthExtractor<T = unknown> = (expected: T) => string;

function isEquivalenceJudgement(value: unknown): value is EquivalenceJudgement {
  return (
    typeof value === 'string' &&
    (value === 'equivalent' || value === 'equivalent_with_caveats' || value === 'not_equivalent')
  );
}

/**
 * LLM-judged functional equivalence evaluator with a calibrated three-point
 * rubric. Drop-in replacement for the framework's
 * `createEsqlEquivalenceEvaluator` (`@kbn/evals`) — same factory signature,
 * same evaluator name (so golden-cluster history stays comparable), same
 * `kind: 'LLM'`. Differences from the framework default:
 *
 *   - Three-point scale instead of binary Yes/No, so cosmetic-but-imperfect
 *     candidates earn partial credit and don't get dumped into the same
 *     bucket as wrong-aggregation or wrong-source regressions.
 *   - Explicit allow-list of transformations (column renames, equivalent
 *     date functions, `?_tstart`/`?_tend` ↔ literal time range, broader
 *     index patterns, etc.) so judges don't over-penalise stylistic
 *     differences that the suite was previously throwing away as `0`.
 *   - Explicit deny-list of substantive differences (wrong aggregation,
 *     wrong source, missing critical filter, swapped subject) so judges
 *     don't over-credit superficially-similar candidates.
 *   - Conservative tie-breaker: when uncertain, judges must return
 *     `equivalent_with_caveats`, not `equivalent`. Biases the suite
 *     against false-positive equivalence claims that would mask
 *     regressions during model swaps.
 *
 * Every result is stamped with `metadata.judgeVersion` so historical
 * scores from the framework's v1 rubric can be partitioned out of trend
 * dashboards if needed.
 */
export function createCalibratedEsqlEquivalenceEvaluator({
  inferenceClient,
  log,
  predictionExtractor,
  groundTruthExtractor,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  predictionExtractor: EsqlPredictionExtractor;
  groundTruthExtractor: EsqlGroundTruthExtractor;
}): Evaluator {
  return {
    name: ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME,
    kind: 'LLM',
    evaluate: async ({ output, expected }) => {
      const prediction = predictionExtractor(output);
      const groundTruth = groundTruthExtractor(expected);

      if (!prediction || !groundTruth) {
        return {
          score: 0,
          label: 'No',
          explanation: 'Missing prediction or ground truth query',
          metadata: {
            equivalent: false,
            equivalence: 'not_equivalent',
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            reason: 'Missing prediction or ground truth query for comparison',
          },
        };
      }

      async function runAnalysis(): Promise<{
        equivalence: EquivalenceJudgement;
        reason: string;
      }> {
        const response = await executeUntilValid({
          prompt: CalibratedEsqlEquivalencePrompt,
          inferenceClient,
          input: {
            ground_truth: groundTruth,
            prediction,
          },
          finalToolChoice: {
            function: 'evaluate',
          },
          maxRetries: 3,
          toolCallbacks: {
            evaluate: async (toolCall) => {
              const { equivalence, reason } = toolCall.function.arguments as {
                equivalence?: unknown;
                reason?: unknown;
              };
              if (!isEquivalenceJudgement(equivalence) || typeof reason !== 'string') {
                throw new Error(
                  `Invalid evaluate() tool-call arguments: equivalence=${String(
                    equivalence
                  )}, reason=${typeof reason}`
                );
              }
              return {
                response: {
                  equivalence,
                  reason,
                },
              };
            },
          },
        });

        // Defensive: `executeUntilValid` is supposed to coerce the judge into
        // emitting a structured `evaluate` tool call (we pass
        // `finalToolChoice = { function: 'evaluate' }`), but some judges
        // — especially when the candidate prediction is huge or contains
        // long chain-of-thought traces from thinking models like Kimi —
        // still come back with empty `toolCalls`. The previous
        // implementation dereferenced `response.toolCalls[0].function`
        // directly, which threw `TypeError: Cannot read properties of
        // undefined (reading 'function')`, took down the whole suite for
        // that connector, and dumped ~31 examples' worth of useful data.
        // Throw a clean Error here instead so the surrounding `pRetry`
        // can do its job, and the outer catch below can score
        // conservatively if all retries exhaust.
        const firstToolCall = response.toolCalls?.[0];
        if (!firstToolCall?.function?.arguments) {
          throw new Error(
            `Calibrated FuncEq judge returned no structured tool call ` +
              `(received ${response.toolCalls?.length ?? 0} tool calls). ` +
              `Likely a bare-text refusal or truncation on the judge side.`
          );
        }
        const args = firstToolCall.function.arguments as {
          equivalence?: unknown;
          reason?: unknown;
        };
        if (!isEquivalenceJudgement(args.equivalence) || typeof args.reason !== 'string') {
          throw new Error('Calibrated FuncEq judge returned malformed tool-call arguments');
        }
        return { equivalence: args.equivalence, reason: args.reason };
      }

      try {
        const { equivalence, reason } = await pRetry(runAnalysis, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.attemptNumber === error.retriesLeft + error.attemptNumber;
            if (isLastAttempt) {
              log.error(
                new Error(
                  `Failed to retrieve calibrated ES|QL equivalence judgement after ${error.attemptNumber} attempts`,
                  { cause: error }
                )
              );
            } else {
              log.warning(
                new Error(
                  `Calibrated ES|QL equivalence judge returned an invalid response on attempt ${error.attemptNumber}; retrying...`,
                  { cause: error }
                )
              );
            }
          },
        });

        const score = JUDGEMENT_TO_SCORE[equivalence];
        return {
          score,
          label: JUDGEMENT_TO_LABEL[equivalence],
          explanation: reason,
          metadata: {
            equivalence,
            equivalent: equivalence === 'equivalent',
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            reason,
          },
        };
      } catch (error) {
        // Judge could not produce a valid structured judgement after all
        // `pRetry` attempts. Common cause: a candidate query carrying a
        // multi-thousand-token reasoning trace from a thinking model
        // (Kimi-K2-Thinking, Kimi-K2.5, Kimi-K2.6 in build 442041) blows
        // the judge's context budget and Gemini returns a bare-text
        // refusal instead of the forced `evaluate` tool call.
        //
        // Scoring conservatively as `not_equivalent` (0) means one
        // problematic example no longer kills the connector's entire
        // suite run — the rest of the 31-example dataset still produces
        // signal. `metadata.fallback = 'judge_no_tool_call'` lets
        // dashboards filter these out of the FuncEq distribution so
        // they don't drag the trendline down for reasons unrelated to
        // the candidate's actual correctness.
        log.warning(
          new Error(
            `Calibrated ES|QL FuncEq judge could not produce a structured judgement after retries; scoring as not_equivalent for this example.`,
            { cause: error }
          )
        );
        return {
          score: JUDGEMENT_TO_SCORE.not_equivalent,
          label: 'judge-no-tool-call',
          explanation:
            'Judge did not return a structured tool call after retries; scored conservatively as not_equivalent. ' +
            'See metadata.cause for the underlying error.',
          metadata: {
            equivalence: 'not_equivalent',
            equivalent: false,
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            fallback: 'judge_no_tool_call',
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
