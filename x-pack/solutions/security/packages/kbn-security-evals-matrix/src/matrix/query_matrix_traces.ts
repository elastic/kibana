/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import type { EvaluationScoreDocument } from '@kbn/evals-common';
import type { MatrixEvalsClient } from './matrix_evals_client';
import type { AggregatedModelScores } from './query_matrix_scores';
import type { MatrixTraceData, MatrixTraceEntry, TraceStep } from './trace_types';
import { directTraceKey, parseDirectTraceKey, traceKey } from './trace_types';
import type { PathContract } from './trajectory_agreement';
import { answersFromDocs, pathContractFromDocs, trailsFromDocs } from './trajectory_agreement';
import type { JudgeVerdict } from './judge_agreement';
import { applyScoringPolicy, type ScoringPolicy } from './scoring_policy';

/** Converts one score document into a judge verdict, when it carries an identifiable judge + score. */
const verdictFromScoreDoc = (
  score: EvaluationScoreDocument,
  modelId: string,
  suiteId?: string
): JudgeVerdict | undefined => {
  const example = score.example?.id;
  const evaluator = score.evaluator?.name;
  const judgeId = score.evaluator?.model?.id;
  const evalScore = score.evaluator?.score;
  if (!example || !evaluator || !judgeId || typeof evalScore !== 'number') {
    return undefined;
  }
  return {
    modelId,
    judgeId,
    suiteId,
    example,
    repetition: score.task?.repetition_index ?? 0,
    evaluator,
    score: evalScore,
  };
};

/** Runs `fn` over `items` with at most `limit` in flight, preserving input order. */
const mapWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

const extractTraceFromScore = (score: EvaluationScoreDocument): MatrixTraceEntry => {
  const question = (score.example?.input as { question?: string } | null)?.question;
  const taskOutput = score.task?.output as
    | {
        steps?: Array<Record<string, unknown>>;
        messages?: Array<{ message?: string }>;
      }
    | null
    | undefined;

  const steps: TraceStep[] = [];
  const toolTrail: string[] = [];

  for (const step of taskOutput?.steps ?? []) {
    const stepType = step.type as string | undefined;
    if (stepType === 'tool_call') {
      const toolId = step.tool_id as string | undefined;
      if (toolId) {
        toolTrail.push(toolId);
      }
      const rawParams = step.params ?? step.args;
      steps.push({
        type: 'tool',
        toolId,
        toolParams: rawParams ? JSON.stringify(rawParams).slice(0, 300) : undefined,
      });
    } else if (stepType === 'reasoning') {
      steps.push({
        type: 'reasoning',
        text: (step.reasoning as string | undefined)?.slice(0, 500),
      });
    } else if (stepType === 'relevant_skills') {
      const skills = Array.isArray(step.skills)
        ? (step.skills as Array<{ id?: string }>)
            .map((s) => s.id)
            .filter((id): id is string => Boolean(id))
        : undefined;
      steps.push({ type: 'skill', skills });
    }
  }

  let answer: string | undefined;
  for (const msg of taskOutput?.messages ?? []) {
    const content = msg.message;
    if (content && content.length > 50) {
      answer = content;
    }
  }

  return {
    question,
    toolTrail: toolTrail.length > 0 ? toolTrail : undefined,
    answer,
    steps: steps.length > 0 ? steps : undefined,
    stepCount: steps.length,
    toolCount: toolTrail.length,
  };
};

/** Aborted runs can write partial docs with a null score or output; those are incomplete. */
const isCompleteScore = (score: EvaluationScoreDocument): boolean => {
  if (score.evaluator?.score == null) return false;
  return score.task?.output != null;
};

/** Per-evaluator mean score across one example's score documents. */
export const exampleScoresByEvaluator = (
  docs: EvaluationScoreDocument[]
): Record<string, number> => {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const doc of docs) {
    const name = doc.evaluator?.name;
    const score = doc.evaluator?.score;
    if (name && typeof score === 'number') {
      const agg = sums.get(name) ?? { sum: 0, count: 0 };
      agg.sum += score;
      agg.count += 1;
      sums.set(name, agg);
    }
  }
  return Object.fromEntries([...sums.entries()].map(([name, agg]) => [name, agg.sum / agg.count]));
};

/** Per-evaluator spread (max - min) across one example's repetitions; omits evaluators seen once. */
export const exampleSpreadByEvaluator = (
  docs: EvaluationScoreDocument[]
): Record<string, number> => {
  const seen = new Map<string, { min: number; max: number; count: number }>();
  for (const doc of docs) {
    const name = doc.evaluator?.name;
    const score = doc.evaluator?.score;
    if (name && typeof score === 'number') {
      const agg = seen.get(name);
      if (!agg) {
        seen.set(name, { min: score, max: score, count: 1 });
      } else {
        agg.min = Math.min(agg.min, score);
        agg.max = Math.max(agg.max, score);
        agg.count += 1;
      }
    }
  }
  return Object.fromEntries(
    [...seen.entries()]
      .filter(([, agg]) => agg.count > 1)
      .map(([name, agg]) => [name, agg.max - agg.min])
  );
};

/** Number of distinct repetitions present in a batch of score documents. */
export const countRepetitions = (docs: EvaluationScoreDocument[]): number =>
  new Set(docs.map((doc) => doc.task?.repetition_index ?? 0)).size;

/**
 * Overlays the multi-repetition execution from the trace cache onto each
 * (model, example) trace; separate single-rep executions are never concatenated.
 */
export const overlayRepeatedCacheTrails = (
  traces: MatrixTraceData,
  traceCache?: Record<string, EvaluationScoreDocument[]>
): void => {
  if (!traceCache) {
    return;
  }
  interface RepeatedCell {
    trails: string[][];
    answers: string[];
    pathContract?: PathContract;
    executionId: string;
  }
  const best = new Map<string, RepeatedCell>();
  for (const [cacheKey, docs] of Object.entries(traceCache)) {
    // Keys are `${executionId}::${exampleId}` and executionId itself may contain `::`.
    const split = cacheKey.lastIndexOf('::');
    if (split >= 0 && docs.length > 0) {
      const exampleId = cacheKey.slice(split + 2);
      const modelId = docs[0].task?.model?.id;
      if (modelId && exampleId) {
        const trails = trailsFromDocs(docs);
        if (trails.length > 1) {
          const combo = `${modelId}\0${exampleId}`;
          const previous = best.get(combo);
          if (!previous || trails.length > previous.trails.length) {
            best.set(combo, {
              trails,
              answers: answersFromDocs(docs),
              pathContract: pathContractFromDocs(docs),
              executionId: cacheKey.slice(0, split),
            });
          }
        }
      }
    }
  }
  for (const [combo, cell] of best) {
    const sep = combo.indexOf('\0');
    const modelId = combo.slice(0, sep);
    const exampleId = combo.slice(sep + 1);
    // Overlay onto every suite-scoped direct cell for this (model, example); the
    // cache keys carry no suite id, so all matching suites receive the reps.
    const matching = Object.keys(traces).filter((key) => {
      const parsed = parseDirectTraceKey(key);
      return parsed && parsed.modelId === modelId && parsed.exampleId === exampleId;
    });
    const keys = matching.length > 0 ? matching : [traceKey(modelId, exampleId)];
    for (const key of keys) {
      const measured = {
        repTrails: cell.trails,
        repAnswers: cell.answers,
        pathContract: cell.pathContract,
        repExecutionIds: [cell.executionId],
      };
      const existing = traces[key];
      if (existing) {
        Object.assign(existing, measured);
      } else {
        traces[key] = measured;
      }
    }
  }
};

/** Merges one example's score documents for the given model + execution into `traces`. */
const processExampleBatch = (
  scores: EvaluationScoreDocument[],
  modelId: string,
  suiteId: string,
  executionId: string,
  traces: MatrixTraceData,
  examplePrefixes: ReadonlySet<string> = new Set(),
  judgeVerdictsOut?: JudgeVerdict[],
  /**
   * The suite's effective scoring policy (as `queryMatrixScores` applied it per document).
   * Verdicts and trace-card scores must mirror the published matrix: without the policy,
   * a strict-policy suite reports cross-family judge agreement and prompt-card scores
   * derived from documents the matrix itself rejected.
   */
  scoringPolicy?: ScoringPolicy
): boolean => {
  const relevant = scores
    .filter((score) => score.task?.model?.id === modelId)
    .filter((score) => score.metadata?.execution_id === executionId)
    .sort((a, b) => {
      const ta = Date.parse(a['@timestamp'] ?? '');
      const tb = Date.parse(b['@timestamp'] ?? '');
      return tb - ta;
    });

  if (relevant.length === 0) return false;

  // Docs the scoring policy admitted; when no policy is configured every doc is admitted.
  const admitted =
    scoringPolicy &&
    (scoringPolicy.excludeSelfJudged === true || scoringPolicy.requireEisJudge === true)
      ? relevant.filter(
          (score) => applyScoringPolicy(score, scoringPolicy, () => false).score !== null
        )
      : relevant;

  if (judgeVerdictsOut) {
    for (const score of admitted) {
      const verdict = verdictFromScoreDoc(score, modelId, suiteId);
      if (verdict) judgeVerdictsOut.push(verdict);
    }
  }

  const entry = extractTraceFromScore(relevant[0]);
  entry.scores = exampleScoresByEvaluator(admitted);
  const spread = exampleSpreadByEvaluator(admitted);
  if (Object.keys(spread).length > 0) {
    entry.spread = spread;
  }
  entry.repetitions = countRepetitions(relevant);
  const exampleId = relevant[0].example?.id;

  const complete = isCompleteScore(relevant[0]);

  // Only the direct example key carries `repTrails`: the prefix and suite keys
  // alias `entry`, so trails there would be counted once per alias.
  // The direct key includes the suite id: two selected suites can reuse an example
  // ID, and a bare (model, example) key would let the last-processed suite's trace
  // overwrite the other's (losing both an HTML column's trace and reliability reps).
  if (exampleId) {
    const trails = trailsFromDocs(relevant);
    // The reliability path needs answers and the declared path contract alongside
    // the trails; without them a no-cache run falls back to the legacy prefix
    // heuristic and cannot report answer similarity (see overlayRepeatedCacheTrails).
    traces[directTraceKey(modelId, suiteId, exampleId)] =
      trails.length > 0
        ? {
            ...entry,
            repTrails: trails,
            repAnswers: answersFromDocs(relevant),
            pathContract: pathContractFromDocs(relevant),
          }
        : entry;
  }
  // One trace per matching category prefix, using the same boundary-dash
  // matching as scoresByPrefixToDatasets. Exact matches are skipped because
  // they would duplicate the direct example key.
  if (exampleId) {
    for (const prefix of examplePrefixes) {
      if (prefix !== exampleId && exampleId.startsWith(`${prefix}-`)) {
        const key = traceKey(modelId, `prefix:${prefix}`);
        if (traces[key] === undefined) traces[key] = entry;
      }
    }
  }
  // The suite-level key takes the first complete example.
  const suiteTraceKey = traceKey(modelId, suiteId);
  if (complete && traces[suiteTraceKey] === undefined) {
    traces[suiteTraceKey] = entry;
  }

  if (!complete) {
    const firstComplete = relevant.find(isCompleteScore);
    if (firstComplete) {
      const fallbackEntry = extractTraceFromScore(firstComplete);
      fallbackEntry.scores = exampleScoresByEvaluator(admitted.filter(isCompleteScore));
      const fid = firstComplete.example?.id;
      if (fid) {
        const completeDocs = relevant.filter(isCompleteScore);
        const trails = trailsFromDocs(completeDocs);
        traces[directTraceKey(modelId, suiteId, fid)] =
          trails.length > 0
            ? {
                ...fallbackEntry,
                repTrails: trails,
                repAnswers: answersFromDocs(completeDocs),
                pathContract: pathContractFromDocs(completeDocs),
              }
            : fallbackEntry;
      }
      if (traces[suiteTraceKey] === undefined) {
        traces[suiteTraceKey] = fallbackEntry;
      }
      // A fallback trace was resolved even though the newest doc was incomplete —
      // the caller's missing-example accounting must not double-count this example.
      return true;
    }
  }

  return complete;
};

/**
 * Mirrors judge verdicts recorded under a provider-reported `task.model.id` alias onto the matrix
 * row's own model id. `aliasTraceKeys` does the same for trace cells; without this the reliability
 * table keys judge agreement by `configured` id while the verdicts carry the alias, so a row scored
 * entirely through an alias reads as having no judge agreement at all.
 */
export const aliasJudgeVerdicts = (
  verdicts: JudgeVerdict[],
  modelAliases: ReadonlyMap<string, readonly string[]>
): void => {
  // Dedupe per verdict cell, not per judge: an aliased run has many examples,
  // repetitions and evaluators under one judge, and each must be mirrored or the
  // row loses most of its judge-agreement evidence.
  const verdictKey = (v: JudgeVerdict): string =>
    `${v.modelId}\u0000${v.suiteId ?? ''}\u0000${v.example}\u0000${v.repetition}\u0000${
      v.evaluator
    }\u0000${v.judgeId}`;
  const seen = new Set(verdicts.map(verdictKey));
  for (const [rowId, aliases] of modelAliases) {
    const targetAliases = aliases.filter((alias) => alias !== rowId);
    const candidates = verdicts.filter((verdict) => targetAliases.includes(verdict.modelId));
    for (const verdict of candidates) {
      const key = verdictKey({ ...verdict, modelId: rowId });
      if (!seen.has(key)) {
        seen.add(key);
        verdicts.push({ ...verdict, modelId: rowId });
      }
    }
  }
};

/**
 * Mirrors trace cells keyed by a provider-reported `task.model.id` alias onto
 * the matrix row's own model id.
 */
export const aliasTraceKeys = (
  traces: MatrixTraceData,
  modelAliases: ReadonlyMap<string, readonly string[]>,
  /**
   * Per (row, suite) the identity whose suite run `buildMatrix` selected as newest —
   * computed by `newestIdentityBySuite`. Direct example keys carry a `suiteId` tag, so a
   * mirror from the winning identity OVERWRITES a stale primary-ID trace; mirroring from
   * a non-winner (or untagged aggregate keys) stays first-key-wins.
   */
  winnerBySuite?: ReadonlyMap<string, ReadonlyMap<string, string>>
): void => {
  for (const [rowId, aliases] of modelAliases) {
    const winners = winnerBySuite?.get(rowId);
    for (const alias of aliases) {
      if (alias !== rowId) {
        const prefix = `${alias}:`;
        for (const [key, entry] of Object.entries(traces)) {
          if (key.startsWith(prefix)) {
            const rowKey = traceKey(rowId, key.slice(prefix.length));
            const aliasWins = entry.suiteId ? winners?.get(entry.suiteId) === alias : false;
            if (traces[rowKey] === undefined || aliasWins) {
              traces[rowKey] = entry;
            }
          }
        }
      }
    }
  }
};

/**
 * Extracts per-(model, column) trace data from full score documents fetched via
 * the per-example route, since the per-experiment route strips `task.output`.
 */
export const queryMatrixTraces = async (
  evalsClient: MatrixEvalsClient,
  log: SomeDevLog,
  aggregated: AggregatedModelScores[],
  traceCache?: Record<string, EvaluationScoreDocument[]>,
  toolCallWarnAbove: number = 0,
  modelAliases: ReadonlyMap<string, readonly string[]> = new Map(),
  judgeVerdictsOut?: JudgeVerdict[],
  /**
   * Per-suite scoring policy keyed by suite id — the same map `queryMatrixScores`
   * consumed, so trace verdicts/cards mirror exactly the admitted-document set the
   * published matrix used.
   */
  scoringBySuite?: Record<string, ScoringPolicy>,
  /**
   * The global scoring policy used when a suite has no override. Mirrors
   * `queryMatrixScores`'s `scoringBySuite?.[suiteId] ?? scoring` fallback: suites
   * inheriting the global policy have no entry in `scoringBySuite`, and omitting
   * the fallback here would re-admit exactly the documents the score query
   * rejected (global `excludeSelfJudged`/`requireEisJudge`).
   */
  globalScoring?: ScoringPolicy
): Promise<MatrixTraceData> => {
  const traces: MatrixTraceData = {};

  // 1. Collect (suite, model, execution) tuples with the example IDs they ran,
  //    from the stripped experiment-scores responses (cheap, no heavy fields).
  interface RunRef {
    suiteId: string;
    modelId: string;
    executionId: string;
    /** Experiment route ID; can differ from executionId on sharded runs. */
    experimentId: string;
    exampleIds: Set<string>;
  }
  const runRefs: RunRef[] = [];

  const modelSuites: Array<{
    modelId: string;
    suiteId: string;
    executionId: string;
    experimentId: string;
  }> = [];
  for (const modelScores of aggregated) {
    for (const suite of modelScores.suites) {
      // Each shard of a sharded suite owns a disjoint set of examples.
      const executions =
        suite.executions && suite.executions.length > 0
          ? suite.executions
          : suite.executionIds && suite.executionIds.length > 0
          ? suite.executionIds.map((executionId) => ({
              experimentId: suite.experimentId,
              executionId,
            }))
          : [{ experimentId: suite.experimentId, executionId: suite.experimentId }];
      for (const { experimentId, executionId } of executions) {
        modelSuites.push({
          modelId: modelScores.modelId,
          suiteId: suite.suiteId,
          executionId,
          experimentId,
        });
      }
    }
  }

  const enumerated = await mapWithConcurrency(
    modelSuites,
    6,
    async ({ modelId, suiteId, executionId, experimentId }) => {
      log.debug(
        `Enumerating examples for experiment ${executionId} (model ${modelId}, suite ${suiteId})`
      );

      const stripped = await evalsClient.getExperimentScores(experimentId, {
        suiteId,
        taskModelId: modelId,
        executionId,
      });

      const exampleIds = new Set<string>();
      for (const score of stripped) {
        if (score.example?.id) exampleIds.add(score.example.id);
      }

      if (exampleIds.size === 0) {
        log.warning(
          `No example IDs found for suite ${suiteId} (model ${modelId}) — trace will be unavailable`
        );
        return null;
      }

      return { suiteId, modelId, executionId, experimentId, exampleIds };
    }
  );

  for (const ref of enumerated) {
    if (ref) runRefs.push(ref);
  }

  // 2. Fetch full score documents per (run, example), filtered server-side by
  //    execution (the unfiltered payload can exceed the HTTP transport limit).
  //    Older evals plugins ignore the filter; the first pair is fetched alone
  //    to detect that, after which each example is fetched once and shared.
  const exampleScores = new Map<string, EvaluationScoreDocument[]>();
  const cacheKey = (ref: RunRef, exampleId: string) => `${ref.executionId}::${exampleId}`;
  let serverSupportsFilter: boolean | undefined;
  // In-flight dedup, keyed per example on legacy servers and per (run, example) otherwise.
  const inflight = new Map<string, Promise<EvaluationScoreDocument[]>>();

  const fetchScores = (ref: RunRef, exampleId: string): Promise<EvaluationScoreDocument[]> => {
    const key = serverSupportsFilter === false ? exampleId : cacheKey(ref, exampleId);
    const pending = inflight.get(key);
    if (pending) return pending;
    // One retry for transient 502/503s under concurrent heavy fetches.
    const attempt = async (retriesLeft: number): Promise<EvaluationScoreDocument[]> => {
      try {
        return await evalsClient.getExampleScores(exampleId, {
          executionId: ref.executionId,
          modelId: ref.modelId,
        });
      } catch (error) {
        if (retriesLeft === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return attempt(retriesLeft - 1);
      }
    };
    const request = attempt(1).finally(() => inflight.delete(key));
    inflight.set(key, request);
    return request;
  };

  const fetchExample = async (ref: RunRef, exampleId: string): Promise<void> => {
    const cached = traceCache?.[cacheKey(ref, exampleId)];
    if (cached) {
      exampleScores.set(cacheKey(ref, exampleId), cached);
      return;
    }
    if (serverSupportsFilter === false) {
      const shared = exampleScores.get(exampleId);
      if (shared) {
        exampleScores.set(cacheKey(ref, exampleId), shared);
        return;
      }
    }
    const scores = await fetchScores(ref, exampleId);
    if (serverSupportsFilter === undefined && scores.length > 0) {
      // An empty response is inconclusive, so only a non-empty one settles filter support.
      serverSupportsFilter = scores.every((s) => s.metadata?.execution_id === ref.executionId);
      if (!serverSupportsFilter) {
        log.warning(
          'Example-scores route ignores execution filters (older evals plugin) — falling back to shared per-example fetches; traces will be complete but slower'
        );
      }
    }
    if (serverSupportsFilter === false) {
      exampleScores.set(exampleId, scores);
    }
    exampleScores.set(cacheKey(ref, exampleId), scores);
  };

  const pairs: Array<{ ref: RunRef; exampleId: string }> = [];
  for (const ref of runRefs) {
    for (const exampleId of ref.exampleIds) {
      pairs.push({ ref, exampleId });
    }
  }

  const fetchPair = async ({
    ref,
    exampleId,
  }: {
    ref: RunRef;
    exampleId: string;
  }): Promise<void> => {
    try {
      await fetchExample(ref, exampleId);
    } catch (error) {
      log.warning(
        `Skipping trace details for example ${exampleId} (execution ${ref.executionId}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      exampleScores.set(cacheKey(ref, exampleId), []);
    }
  };

  if (pairs.length > 0) {
    await fetchPair(pairs[0]);
    await mapWithConcurrency(pairs.slice(1), 8, fetchPair);
  }

  // Per-cell failures are swallowed above, so surface a total fetch failure explicitly.
  const fetchedCells = [...exampleScores.values()].filter((docs) => docs.length > 0).length;
  if (pairs.length > 0 && fetchedCells === 0) {
    log.warning(
      `Trace fetch returned no documents for any of ${pairs.length} (execution, example) pairs — ` +
        `every trace card will render empty. The scores above are unaffected. ` +
        `Re-run with --trace-cache <path> to read score documents straight from ES.`
    );
  }

  // Derived from the synthetic `prefix:*` dataset ids so trace bucketing matches score bucketing.
  const examplePrefixes = new Set<string>();
  for (const modelScores of aggregated) {
    for (const suite of modelScores.suites) {
      for (const dataset of suite.datasets) {
        if (dataset.datasetId?.startsWith('prefix:')) {
          examplePrefixes.add(dataset.datasetId.slice('prefix:'.length));
        }
      }
    }
  }

  // 3. For each run, pick the newest complete document per example and merge
  //    into the traces map.
  const missingByRun: Array<{ ref: RunRef; missing: string[] }> = [];
  for (const ref of runRefs) {
    const missing: string[] = [];
    for (const exampleId of ref.exampleIds) {
      const scores = exampleScores.get(cacheKey(ref, exampleId)) ?? [];
      const ok = processExampleBatch(
        scores,
        ref.modelId,
        ref.suiteId,
        ref.executionId,
        traces,
        examplePrefixes,
        judgeVerdictsOut,
        scoringBySuite?.[ref.suiteId] ?? globalScoring
      );
      if (!ok) missing.push(exampleId);
    }
    if (missing.length === ref.exampleIds.size) {
      log.warning(
        `No complete score documents found for suite ${ref.suiteId} (model ${ref.modelId}, execution ${ref.executionId}) — trace will be unavailable`
      );
    } else if (missing.length > 0) {
      missingByRun.push({ ref, missing });
    }
  }

  if (missingByRun.length > 0) {
    const details = missingByRun
      .map(
        ({ ref, missing }) =>
          `${ref.modelId} (execution ${ref.executionId}): ${missing.length}/${
            ref.exampleIds.size
          } missing [${missing.join(', ')}]`
      )
      .join('; ');
    log.warning(
      `Trace coverage incomplete — scores exist but no trace was resolved for: ${details}`
    );
  }

  // Runaway tool-loop report: a cost signal only, never a score penalty.
  if (toolCallWarnAbove > 0) {
    // `Tool Calls` counts OTel spans, a different source than `task.output.steps`,
    // so a count far above the recorded trail is treated as measurement error.
    const SUSPECT_RATIO = 2;
    const withTrail = Object.entries(traces).map(([key, trace]) => ({
      key,
      calls: trace.scores?.['Tool Calls'],
      trail: trace.toolTrail?.length ?? 0,
    }));

    const above = withTrail
      .filter(
        (c): c is { key: string; calls: number; trail: number } => typeof c.calls === 'number'
      )
      .filter((c) => c.calls > toolCallWarnAbove)
      .sort((a, b) => b.calls - a.calls);

    // An empty trail cannot refute the count, so it stays reportable.
    const suspect = above.filter((c) => c.trail > 0 && c.calls > c.trail * SUSPECT_RATIO);
    const runaway = above.filter((c) => !suspect.includes(c));

    if (runaway.length > 0) {
      log.warning(
        `Possible runaway tool loops (> ${toolCallWarnAbove} calls) in ${
          runaway.length
        } cell(s): ${runaway
          .slice(0, 10)
          .map((c) => `${c.key}=${c.calls}`)
          .join(', ')}`
      );
    }

    if (suspect.length > 0) {
      log.warning(
        `'Tool Calls' exceeds the recorded tool trail by more than ${SUSPECT_RATIO}x in ` +
          `${suspect.length} cell(s): ${suspect
            .slice(0, 10)
            .map((c) => `${c.key}=${c.calls} (trail ${c.trail})`)
            .join(
              ', '
            )} — the count is not corroborated by the trace; do not cite these as tool-loop lengths`
      );
    }

    // A zero/missing `Tool Calls` score with a non-empty trail means the metric is broken for that model.
    const brokenMetric = new Map<string, number>();
    for (const [key, trace] of Object.entries(traces)) {
      const trail = trace.toolTrail?.length ?? 0;
      const scored = trace.scores?.['Tool Calls'];
      if (trail > 0 && (scored === 0 || scored === undefined)) {
        const modelId = key.split(':')[0];
        brokenMetric.set(modelId, (brokenMetric.get(modelId) ?? 0) + 1);
      }
    }
    if (brokenMetric.size > 0) {
      log.warning(
        `'Tool Calls' reads 0 despite a non-empty tool trail for: ${[...brokenMetric]
          .map(([modelId, n]) => `${modelId}=${n}`)
          .join(', ')} — the metric is broken for these models; do not publish their tool counts`
      );
    }
  }

  log.debug(`Matrix traces resolved ${Object.keys(traces).length} trace entries`);
  overlayRepeatedCacheTrails(traces, traceCache);
  // Which identity (primary id or alias) holds the newest run per (row, suite): trace
  // mirroring must follow the same latest-run selection `buildMatrix` applies to scores,
  // or the row keeps a stale primary-ID trace while its scores came from the alias.
  const winnerBySuite = new Map<string, Map<string, string>>();
  for (const [rowId, aliases] of modelAliases) {
    const identities = [rowId, ...aliases.filter((alias) => alias !== rowId)];
    const bySuite = new Map<string, { identity: string; timestamp: string }>();
    const identityScores = aggregated.filter((modelScores) =>
      identities.includes(modelScores.modelId)
    );
    for (const modelScores of identityScores) {
      for (const suite of modelScores.suites) {
        const prior = bySuite.get(suite.suiteId);
        if (!prior || (suite.timestamp ?? '') > prior.timestamp) {
          bySuite.set(suite.suiteId, {
            identity: modelScores.modelId,
            timestamp: suite.timestamp ?? '',
          });
        }
      }
    }
    const winners = new Map<string, string>();
    for (const [suiteId, { identity }] of bySuite) {
      winners.set(suiteId, identity);
    }
    if (winners.size > 0) {
      winnerBySuite.set(rowId, winners);
    }
  }
  aliasTraceKeys(traces, modelAliases, winnerBySuite);
  if (judgeVerdictsOut) {
    aliasJudgeVerdicts(judgeVerdictsOut, modelAliases);
  }
  return traces;
};
