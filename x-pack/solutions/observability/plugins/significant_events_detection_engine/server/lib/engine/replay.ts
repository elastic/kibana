/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import type { ActivityEntry, DetectionStrategyId, ReplaySummary } from '../../../common';
import { BUCKET_MS, DETECTION_STRATEGY_IDS, MINUTE_MS } from '../../../common';
import type { TaggedObservation } from '../domain';
import { getErrorMessage } from '../errors';
import { checkBaseline, fillSparseHistory } from '../pipeline/baseline';
import { STRATEGIES } from '../strategies/strategy_registry';
import type { IEngineScope } from './engine_scope';
import { createRunKnowledge } from './knowledge';

/** Replay windows are cut into slices, so one query never scans a whole day. */
const SLICE_MS = 60 * MINUTE_MS;

/**
 * Replays strategies over past minutes with direct queries, because Alerting v2 rules never
 * backfill. Every evaluation is stored as history, so the baseline check has something to
 * compare with, and the summary says what each strategy would have raised. It raises nothing.
 */
export async function replayEngine(
  scope: IEngineScope,
  {
    minutes,
    now = Date.now(),
    sources: givenSources,
    signal,
  }: {
    minutes: number;
    now?: number;
    /** Overrides the enabled sources, for a source created moments ago. */
    sources?: NightshiftSource[];
    signal?: AbortSignal;
  }
): Promise<ReplaySummary> {
  const { storage } = scope;
  const config = await storage.getConfig();
  const sources = givenSources ?? (await scope.listSources());
  const to = Math.floor(now / BUCKET_MS) * BUCKET_MS - BUCKET_MS;
  const from = to - minutes * MINUTE_MS;
  const runId = `replay-${uuidv4()}`;
  const abortSignal = signal ?? new AbortController().signal;
  const knowledge = createRunKnowledge({ scope, sources });
  const strategies = DETECTION_STRATEGY_IDS.filter(
    (id) => config.strategies[id].mode !== 'off' && STRATEGIES[id].replay
  );
  const slices = Array.from({ length: Math.ceil((to - from) / SLICE_MS) }, (_, index) => ({
    from: from + index * SLICE_MS,
    to: Math.min(to, from + (index + 1) * SLICE_MS),
  }));

  const evaluations = await Promise.all(
    strategies.map(async (strategy) => {
      const observations: TaggedObservation[] = [];
      const notes: string[] = [];
      try {
        for (const slice of slices) {
          // Sequential slices: replay is background work and must not crowd out live runs.
          const result = await STRATEGIES[strategy].replay!({
            spaceId: scope.spaceId,
            sources,
            dataEsClient: scope.dataEsClient,
            getQueryLinks: knowledge.getQueryLinks,
            signal: abortSignal,
            logger: scope.logger,
            from: slice.from,
            to: slice.to,
          });
          observations.push(...result.observations.map((item) => ({ ...item, strategy })));
          notes.push(...result.notes);
        }
        return { strategy, observations, notes: [...new Set(notes)] };
      } catch (error) {
        return { strategy, observations, notes, error: getErrorMessage(error) };
      }
    })
  );

  const all = evaluations.flatMap((evaluation) => evaluation.observations);
  await storage.records.writeObservations(
    all.map((observation) => ({
      run_id: runId,
      strategy: observation.strategy,
      fingerprint: observation.fingerprint,
      service: observation.service,
      bucket_start: new Date(observation.bucket_start).toISOString(),
      value: observation.value,
      looks_off: observation.looks_off,
      mode: 'replay',
    }))
  );

  const visible = all.filter((observation) => !observation.internal);
  const fingerprints = [
    ...new Set(
      visible.flatMap((observation) =>
        observation.heartbeat
          ? [observation.fingerprint, observation.heartbeat]
          : [observation.fingerprint]
      )
    ),
  ];
  const prior = await storage.records.readHistory({
    series: fingerprints.map((fingerprint) => ({ fingerprint, exclude: [] })),
    before: from,
    lookbackMs: config.baseline.history_buckets * BUCKET_MS,
    limit: config.baseline.history_buckets,
  });

  const replayedBeats = all
    .filter((observation) => observation.internal)
    .reduce((beats, observation) => {
      beats.set(observation.fingerprint, [
        ...(beats.get(observation.fingerprint) ?? []),
        { bucket_start: new Date(observation.bucket_start).toISOString() },
      ]);
      return beats;
    }, new Map<string, Array<{ bucket_start: string }>>());
  const heartbeatBefore = (fingerprint: string, bucketStart: number) => [
    ...(prior.get(fingerprint) ?? []),
    ...(replayedBeats.get(fingerprint) ?? []).filter(
      (beat) => Date.parse(beat.bucket_start) < bucketStart
    ),
  ];

  // Each series is walked in time order, so the baseline only ever sees its past.
  const bySeries = visible.reduce((groups, observation) => {
    const series = groups.get(observation.fingerprint) ?? [];
    series.push(observation);
    groups.set(observation.fingerprint, series);
    return groups;
  }, new Map<string, TaggedObservation[]>());

  const perStrategy = new Map<DetectionStrategyId, { aboveNormal: number; wouldOpen: number }>();
  bySeries.forEach((series, fingerprint) => {
    const sorted = [...series].sort((a, b) => a.bucket_start - b.bucket_start);
    const strategy = sorted[0].strategy;
    const policy = STRATEGIES[strategy].descriptor.baselinePolicy;
    const stats = perStrategy.get(strategy) ?? { aboveNormal: 0, wouldOpen: 0 };
    const result = sorted.reduce(
      (state, observation) => {
        const decision = observation.looks_off
          ? checkBaseline({
              value: observation.value,
              unit: observation.unit,
              policy,
              history: observation.heartbeat
                ? fillSparseHistory({
                    samples: state.history,
                    heartbeat: heartbeatBefore(observation.heartbeat, observation.bucket_start),
                  })
                : state.history,
              excludeWindows: [],
              settings: config.baseline,
            }).decision
          : 'background';
        const above = decision === 'above_normal' || decision === 'skipped';
        return {
          history: [
            ...state.history,
            {
              bucket_start: new Date(observation.bucket_start).toISOString(),
              value: observation.value,
            },
          ],
          above: state.above + (above ? 1 : 0),
          opens: state.opens + (above && !state.inRun ? 1 : 0),
          inRun: above,
        };
      },
      { history: prior.get(fingerprint) ?? [], above: 0, opens: 0, inRun: false }
    );
    perStrategy.set(strategy, {
      aboveNormal: stats.aboveNormal + result.above,
      wouldOpen: stats.wouldOpen + result.opens,
    });
  });

  const summary: ReplaySummary = {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    strategies: evaluations.map((evaluation) => {
      const own = visible.filter((observation) => observation.strategy === evaluation.strategy);
      return {
        strategy: evaluation.strategy,
        observations: own.length,
        looked_off: own.filter((observation) => observation.looks_off).length,
        above_normal: perStrategy.get(evaluation.strategy)?.aboveNormal ?? 0,
        would_open: perStrategy.get(evaluation.strategy)?.wouldOpen ?? 0,
        error: evaluation.error,
      };
    }),
  };

  const timestamp = new Date().toISOString();
  const activity: ActivityEntry[] = [
    ...evaluations.flatMap((evaluation) =>
      evaluation.notes.map(
        (note): ActivityEntry => ({
          '@timestamp': timestamp,
          run_id: runId,
          step: 'strategy',
          action: 'note',
          strategy: evaluation.strategy,
          message: note,
        })
      )
    ),
    ...summary.strategies.map(
      (strategySummary): ActivityEntry => ({
        '@timestamp': timestamp,
        run_id: runId,
        step: 'trial',
        action: 'replayed',
        strategy: strategySummary.strategy,
        message: `Replay ${summary.from} - ${summary.to}: ${
          STRATEGIES[strategySummary.strategy].descriptor.name
        } evaluated ${strategySummary.observations} series-minutes; ${
          strategySummary.above_normal
        } above normal, about ${strategySummary.would_open} event(s) it would open.${
          strategySummary.error ? ` It failed part way: ${strategySummary.error}` : ''
        }`,
      })
    ),
  ];
  await storage.records.appendActivity(activity);
  return summary;
}
