/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AcceptanceCriteria,
  CandidateReplay,
  CandidateTrial,
  EngineConfig,
  LabelledIncident,
  StrategyCandidate,
} from '../../../common';
import { BUCKET_MS, DAY_MS, HOUR_MS, MINUTE_MS } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { getErrorMessage } from '../errors';
import { checkBaseline, fillSparseHistory } from '../pipeline/baseline';
import type { StoredSample } from '../storage/records_store';
import { countDetectorsDirectly, learnedFingerprint } from '../strategies/learned_detectors';
import { incidentWindow } from './incidents';

/** Rules settle about three minutes behind; the replay stops there so it reads complete data. */
const REPLAY_SETTLE_MS = 3 * MINUTE_MS;
/** A replay reaches this far before the earliest incident it must catch, to have a baseline. */
const REPLAY_LEAD_MS = HOUR_MS;
/** Replays are cut into slices so one query never scans a whole day. */
const REPLAY_SLICE_MS = 6 * HOUR_MS;
/** Observations are kept three days, which bounds a threshold replay. */
const THRESHOLD_REPLAY_MS = 3 * DAY_MS;

/** One run of above-normal minutes: roughly one event the change would open. */
export interface SimulatedOpen {
  from: number;
  to: number;
}

/**
 * Walks a series in time order through the same baseline check the engine runs, and returns
 * the events it would open. Minutes inside an open run are left out of the history, as the
 * engine leaves out an open event's windows, so a long problem never becomes its own normal.
 */
export function simulateOpens({
  samples,
  unit,
  settings,
  quietPeriodBuckets,
}: {
  samples: StoredSample[];
  unit: string;
  settings: EngineConfig['baseline'];
  quietPeriodBuckets: number;
}): SimulatedOpen[] {
  const result = samples.reduce(
    (state, sample) => {
      const decision = sample.looks_off
        ? checkBaseline({
            value: sample.value,
            unit,
            policy: 'own_history',
            history: state.history,
            excludeWindows: [],
            settings,
          }).decision
        : 'background';
      const at = Date.parse(sample.bucket_start);
      const above = decision === 'above_normal';
      if (above) {
        const current = state.open ?? { from: at, to: at + BUCKET_MS };
        return {
          ...state,
          open: { ...current, to: at + BUCKET_MS },
          quiet: 0,
        };
      }
      const history = [
        ...state.history,
        { bucket_start: sample.bucket_start, value: sample.value },
      ];
      if (!state.open) {
        return { ...state, history };
      }
      const quiet = state.quiet + 1;
      return quiet >= quietPeriodBuckets
        ? { ...state, history, opens: [...state.opens, state.open], open: undefined, quiet: 0 }
        : { ...state, history, quiet };
    },
    {
      history: [] as Array<{ bucket_start: string; value: number }>,
      opens: [] as SimulatedOpen[],
      open: undefined as SimulatedOpen | undefined,
      quiet: 0,
    }
  );
  return result.open ? [...result.opens, result.open] : result.opens;
}

const overlaps = (open: SimulatedOpen, window: { from: number; to: number }) =>
  open.from < window.to && open.to > window.from;

/** Labelled incidents on a service. */
export function incidentsOn(incidents: LabelledIncident[], service: string): LabelledIncident[] {
  return incidents.filter((incident) => incident.services.includes(service));
}

/**
 * Scores what a change would have opened against the labelled incidents of its scope. An open
 * catches an incident when it starts inside the incident's window; an open outside every real
 * incident is false, and one on a dismissed incident counts as both false and dismissed.
 */
export function scoreOpens({
  opens,
  incidents,
  from,
  to,
  acceptance,
  minDays = 1 / 24,
}: {
  opens: SimulatedOpen[];
  incidents: LabelledIncident[];
  from: number;
  to: number;
  acceptance: AcceptanceCriteria;
  /**
   * The shortest span the false-open rate is computed over. A short trial would turn one
   * unlabelled open into dozens per day; the replay already measured the rate over a day.
   */
  minDays?: number;
}): Omit<CandidateReplay, 'at'> {
  const real = incidents.filter((incident) => incident.label !== 'false_positive');
  const dismissed = incidents.filter((incident) => incident.label === 'false_positive');
  const caught = real.flatMap((incident) => {
    const window = incidentWindow(incident);
    const first = opens.find((open) => open.from >= window.from && open.from < window.to);
    return first
      ? [
          {
            incident_id: incident.incident_id,
            // The minute must end before anything can see it.
            warning_minutes:
              Math.max(0, first.from + BUCKET_MS - Date.parse(incident.from)) / MINUTE_MS,
          },
        ]
      : [];
  });
  const outsideReal = opens.filter(
    (open) => !real.some((incident) => overlaps(open, incidentWindow(incident)))
  );
  const dismissedOpens = outsideReal.filter((open) =>
    dismissed.some((incident) => overlaps(open, incidentWindow(incident)))
  ).length;
  const days = Math.max((to - from) / DAY_MS, minDays);
  const falseOpensPerDay = outsideReal.length / days;

  const caughtIds = new Map(caught.map((item) => [item.incident_id, item.warning_minutes]));
  const missed = acceptance.must_catch.filter((id) => !caughtIds.has(id));
  const late = acceptance.must_catch.filter(
    (id) => (caughtIds.get(id) ?? 0) > acceptance.max_warning_minutes
  );
  const reasons = [
    ...missed.map((id) => `does not catch kept incident ${id}`),
    ...late.map(
      (id) =>
        `catches ${id} after ${Math.round(caughtIds.get(id)!)} min, past the ${
          acceptance.max_warning_minutes
        } min bar`
    ),
    ...(falseOpensPerDay > acceptance.max_false_opens_per_day
      ? [
          `${falseOpensPerDay.toFixed(1)} false opens per day, above the bar of ${
            acceptance.max_false_opens_per_day
          }`,
        ]
      : []),
    ...(opens.length === 0 ? ['would not have opened anything; nothing shows it helps'] : []),
  ];
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    would_open: opens.length,
    caught,
    missed,
    false_opens: outsideReal.length,
    false_opens_per_day: Math.round(falseOpensPerDay * 100) / 100,
    dismissed_opens: dismissedOpens,
    passed: reasons.length === 0,
    reasons,
  };
}

/**
 * Replays a detector over past data with direct queries, because rules never backfill, and
 * scores it. Its evaluations are stored as replayed history, so once it runs live its baseline
 * starts warm instead of warming up.
 */
export async function replayDetector({
  scope,
  config,
  candidate,
  incidents,
  now = Date.now(),
  signal,
}: {
  scope: IEngineScope;
  config: EngineConfig;
  candidate: StrategyCandidate;
  incidents: LabelledIncident[];
  now?: number;
  signal: AbortSignal;
}): Promise<CandidateReplay> {
  const detector = candidate.detector!;
  const to = Math.floor((now - REPLAY_SETTLE_MS) / BUCKET_MS) * BUCKET_MS;
  const relevant = incidentsOn(incidents, detector.service);
  const mustCatchStarts = relevant
    .filter((incident) => candidate.acceptance.must_catch.includes(incident.incident_id))
    .map((incident) => Date.parse(incident.from) - REPLAY_LEAD_MS);
  const from =
    Math.floor(
      Math.min(to - config.learning.replay_hours * HOUR_MS, ...mustCatchStarts) / BUCKET_MS
    ) * BUCKET_MS;
  const at = new Date().toISOString();
  try {
    const sources = await scope.listSources();
    const source = sources.find((item) => item.id === detector.source_id);
    if (!source) {
      throw new Error(`source ${detector.source_id} is not enabled`);
    }
    const slices = Array.from({ length: Math.ceil((to - from) / REPLAY_SLICE_MS) }, (_, index) => ({
      from: from + index * REPLAY_SLICE_MS,
      to: Math.min(to, from + (index + 1) * REPLAY_SLICE_MS),
    }));
    const observations = [];
    for (const slice of slices) {
      // Sequential: learning gives way to live detection, so it never floods the cluster.
      observations.push(
        ...(await countDetectorsDirectly({
          context: { dataEsClient: scope.dataEsClient, signal },
          source,
          detectors: [{ ...detector, candidate_id: candidate.candidate_id, mode: 'trial' }],
          from: slice.from,
          to: slice.to,
        }))
      );
    }
    await scope.storage.records.writeObservations(
      observations.map((observation) => ({
        run_id: `learning-replay-${candidate.candidate_id}`,
        strategy: 'learned_detectors',
        fingerprint: observation.fingerprint,
        service: observation.service,
        bucket_start: new Date(observation.bucket_start).toISOString(),
        value: observation.value,
        looks_off: observation.looks_off,
        mode: 'replay',
      }))
    );
    const opens = simulateOpens({
      samples: observations.map((observation) => ({
        bucket_start: new Date(observation.bucket_start).toISOString(),
        value: observation.value,
        looks_off: observation.looks_off,
      })),
      unit: 'count',
      settings: config.baseline,
      quietPeriodBuckets: config.quiet_period_buckets,
    });
    return {
      ...scoreOpens({ opens, incidents: relevant, from, to, acceptance: candidate.acceptance }),
      at,
    };
  } catch (error) {
    return {
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      at,
      would_open: 0,
      caught: [],
      missed: candidate.acceptance.must_catch,
      false_opens: 0,
      false_opens_per_day: 0,
      dismissed_opens: 0,
      passed: false,
      reasons: ['the replay failed'],
      error: getErrorMessage(error),
    };
  }
}

/** The KI heartbeat that tells a quiet minute from a minute nobody looked at. */
function heartbeatOf(fingerprint: string): string | undefined {
  const parts = fingerprint.split(':');
  return parts[0] === 'ki' && parts.length >= 4 ? `ki_watch:${parts[1]}:${parts[2]}` : undefined;
}

/**
 * Replays a threshold change over the engine's stored evaluations, with the current and the
 * proposed `mad_k`. It passes when it keeps every real incident the current threshold caught,
 * opens fewer events on dismissed ones, and stays under the false-open bar.
 */
export async function replayThreshold({
  scope,
  config,
  candidate,
  incidents,
  now = Date.now(),
}: {
  scope: IEngineScope;
  config: EngineConfig;
  candidate: StrategyCandidate;
  incidents: LabelledIncident[];
  now?: number;
}): Promise<CandidateReplay & { before: Omit<CandidateReplay, 'at'> }> {
  const change = candidate.threshold!;
  const to = Math.floor((now - REPLAY_SETTLE_MS) / BUCKET_MS) * BUCKET_MS;
  const from = to - THRESHOLD_REPLAY_MS;
  const heartbeats = change.fingerprints.flatMap((fingerprint) => {
    const heartbeat = heartbeatOf(fingerprint);
    return heartbeat ? [heartbeat] : [];
  });
  const series = await scope.storage.records.readSeries({
    fingerprints: [...change.fingerprints, ...heartbeats],
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  });
  const relevant = incidentsOn(incidents, candidate.scope.service);
  const opensWith = (madK: number) =>
    change.fingerprints.flatMap((fingerprint) => {
      const own = series.get(fingerprint) ?? [];
      const heartbeat = heartbeatOf(fingerprint);
      const samples = heartbeat
        ? fillSparseHistory({ samples: own, heartbeat: series.get(heartbeat) ?? [] }).map(
            (sample) => ({ ...sample, looks_off: sample.value > 0 })
          )
        : own;
      return simulateOpens({
        samples,
        unit: change.unit,
        settings: { ...config.baseline, mad_k: madK },
        quietPeriodBuckets: config.quiet_period_buckets,
      });
    });
  const before = scoreOpens({
    opens: opensWith(change.from_mad_k),
    incidents: relevant,
    from,
    to,
    acceptance: { ...candidate.acceptance, must_catch: [] },
  });
  // The bar: keep every real incident the current threshold catches.
  const acceptance = {
    ...candidate.acceptance,
    must_catch: [
      ...new Set([
        ...candidate.acceptance.must_catch,
        ...before.caught.map((item) => item.incident_id),
      ]),
    ],
  };
  const after = scoreOpens({
    opens: opensWith(change.to_mad_k),
    incidents: relevant,
    from,
    to,
    acceptance,
  });
  const reasons = [
    ...after.reasons.filter((reason) => !reason.startsWith('would not have opened')),
    ...(after.dismissed_opens >= before.dismissed_opens && before.dismissed_opens > 0
      ? [`still opens ${after.dismissed_opens} event(s) on dismissed incidents, as many as before`]
      : []),
    ...(before.dismissed_opens === 0
      ? ['the current threshold opens nothing on dismissed incidents, so there is nothing to fix']
      : []),
  ];
  return {
    ...after,
    at: new Date().toISOString(),
    passed: reasons.length === 0,
    reasons,
    before,
  };
}

/**
 * Judges a trial from what the detector recorded on live data: the minutes it would have
 * raised, grouped into opens, scored against labelled incidents on its service.
 */
export async function judgeTrial({
  scope,
  candidate,
  incidents,
  quietPeriodBuckets,
  now = Date.now(),
}: {
  scope: IEngineScope;
  candidate: StrategyCandidate;
  incidents: LabelledIncident[];
  quietPeriodBuckets: number;
  now?: number;
}): Promise<CandidateTrial> {
  const trial = candidate.trial!;
  const detections = await scope.storage.records.findDetections({
    fingerprints: [learnedFingerprint(candidate.detector!.detector_id)],
    outcomes: ['trial_would_raise'],
    since: trial.started_at,
  });
  const minutes = [
    ...new Set(detections.map((detection) => Date.parse(detection.bucket_start))),
  ].sort((a, b) => a - b);
  // Minutes closer than the quiet period belong to one open, as the state machine would keep it.
  const opens = minutes.reduce<SimulatedOpen[]>((runs, minute) => {
    const last = runs[runs.length - 1];
    if (last && minute - last.to < quietPeriodBuckets * BUCKET_MS) {
      return [...runs.slice(0, -1), { ...last, to: minute + BUCKET_MS }];
    }
    return [...runs, { from: minute, to: minute + BUCKET_MS }];
  }, []);
  const score = scoreOpens({
    opens,
    incidents: incidentsOn(incidents, candidate.detector!.service),
    from: Date.parse(trial.started_at),
    to: now,
    acceptance: { ...candidate.acceptance, must_catch: [] },
    minDays: 1,
  });
  const reasons = score.reasons.filter((reason) => !reason.startsWith('would not have opened'));
  return {
    ...trial,
    judged_at: new Date(now).toISOString(),
    would_raise: detections.length,
    would_open: opens.length,
    caught: score.caught.map((item) => item.incident_id),
    false_opens: score.false_opens,
    passed: reasons.length === 0,
    reasons,
  };
}
