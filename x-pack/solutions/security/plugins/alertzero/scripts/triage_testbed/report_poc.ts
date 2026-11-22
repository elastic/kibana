/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The PoC part of a run report (`report_run.ts`): where each verdict came from, and how often each source was wrong against the truth.
 * A verdict tag has one of three sources, told by the tag next to it:
 * - `cache`: `az:cache_reuse:<record id>`. The verdict of an active record, applied without analysis.
 * - `jev`: `az:jev_verdict`. A false positive verdict of the benign lane of the Jev first line, applied without analysis.
 * - `model`: no provenance tag. The model analyzed the alert.
 * It also reads the audit sample (`az:cache_audit:<record id>`: an alert that had a hit and was analyzed anyway, so that the fresh
 * verdict can be compared with the record) and the Jev lanes (`az:jev_lane:<lane>`) against the truth.
 */

import {
  JEV_AUDIT_TAG,
  JEV_LANE_TAG_PREFIX,
  JEV_VERDICT_TAG,
} from '../../server/alert_triage/jev_first_line';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import { parseAlertIds } from './fake_llm';
import type { ModelCall, Sweep, TaggedAlert, Truth } from './report_run';

export type VerdictSource = 'model' | 'cache' | 'jev';

const VERDICT_BY_TAG: Readonly<Record<string, string>> = {
  'az:false_positive': 'false_positive',
  'az:true_positive': 'true_positive',
  'az:inconclusive': 'inconclusive',
};

const LANES = ['benign', 'attack', 'middle'] as const;

interface SourceCounts {
  verdicts: number;
  falsePositive: number;
  truePositive: number;
  inconclusive: number;
  /** A false or true positive verdict whose truth differs. An inconclusive verdict is not counted here. */
  wrong: number;
  wrongRate: number | null;
  /** True positives in the truth that got a false positive verdict from this source: the dangerous error. */
  truePositivesGotFalsePositive: number;
}

export interface PocSection {
  bySource: Record<VerdictSource, SourceCounts>;
  /** Verdicts on alerts that are not building blocks, all sources, and the rate over the hours of the model calls. */
  nonBuildingBlock: { verdicts: number; perHour: number | null };
  audit: {
    sampled: number;
    /** Sampled alerts that got a fresh verdict and have their record. */
    compared: number;
    agreedWithRecord: number;
    agreedWithRecordShare: number | null;
    freshWrongAgainstTruth: number;
    recordWrongAgainstTruth: number;
  };
  jev: {
    lanes: Record<
      (typeof LANES)[number],
      { alerts: number; truePositive: number; falsePositive: number }
    >;
    /** Alerts that took the Jev verdict (on mode). */
    applied: number;
    appliedTruePositives: number;
    appliedTruePositiveShare: number | null;
    /**
     * The audit sample: alerts of the benign lane that were analyzed anyway (`az:jev_audit`). Jev would have called them harmless.
     * `attacksInSample` is read from the truth, so it counts the alerts that Jev missed even when the model has not analyzed them.
     */
    audit: {
      sampled: number;
      attacksInSample: number;
      /** Sampled alerts that got a model verdict. */
      compared: number;
      /** Of those, the model verdicts that agree with Jev (a false positive verdict). */
      agreedWithJev: number;
      agreedWithJevShare: number | null;
      /** Model verdicts on the sample that differ from the truth. An inconclusive verdict is not counted. */
      modelWrongAgainstTruth: number;
    };
  };
}

const share = (part: number, whole: number): number | null =>
  whole === 0 ? null : Number((part / whole).toFixed(4));

const emptyCounts = (): SourceCounts => ({
  verdicts: 0,
  falsePositive: 0,
  truePositive: 0,
  inconclusive: 0,
  wrong: 0,
  wrongRate: null,
  truePositivesGotFalsePositive: 0,
});

export const sourceOf = (tags: readonly string[]): VerdictSource => {
  if (tags.some((tag) => tag.startsWith(TRIAGE_CACHE_REUSE_TAG_PREFIX))) return 'cache';
  if (tags.includes(JEV_VERDICT_TAG)) return 'jev';
  return 'model';
};

/** The PoC section of the report. Pure: `readRun` and `readCacheData` read the data. */
export const buildPocSection = ({
  alerts,
  truth,
  records,
  verdictsPerHour,
}: {
  alerts: readonly TaggedAlert[];
  truth: Truth;
  records: readonly VerdictCacheRecord[];
  /** The rate of the scorecard, all sources, so that the hours are the ones of the model calls. */
  verdictsPerHour: number | null;
}): PocSection => {
  const bySource: Record<VerdictSource, SourceCounts> = {
    model: emptyCounts(),
    cache: emptyCounts(),
    jev: emptyCounts(),
  };
  const recordById = new Map(records.map((record) => [verdictCacheId(record.keyHash), record]));
  const audit = {
    sampled: 0,
    compared: 0,
    agreedWithRecord: 0,
    freshWrongAgainstTruth: 0,
    recordWrongAgainstTruth: 0,
  };
  const lanes = {
    benign: { alerts: 0, truePositive: 0, falsePositive: 0 },
    attack: { alerts: 0, truePositive: 0, falsePositive: 0 },
    middle: { alerts: 0, truePositive: 0, falsePositive: 0 },
  };
  let verdictsOutsideBuildingBlocks = 0;
  let verdictsAll = 0;
  const jevAudit = {
    sampled: 0,
    attacksInSample: 0,
    compared: 0,
    agreedWithJev: 0,
    modelWrongAgainstTruth: 0,
  };

  for (const alert of alerts) {
    const verdict = alert.tags.map((tag) => VERDICT_BY_TAG[tag]).find(Boolean);
    const known = truth.get(alert.id);

    const lane = alert.tags
      .find((tag) => tag.startsWith(JEV_LANE_TAG_PREFIX))
      ?.slice(JEV_LANE_TAG_PREFIX.length);
    if (known !== undefined && LANES.some((name) => name === lane)) {
      const entry = lanes[lane as (typeof LANES)[number]];
      entry.alerts++;
      if (known.verdict === 'true_positive') entry.truePositive++;
      else entry.falsePositive++;
    }

    if (alert.tags.includes(JEV_AUDIT_TAG)) {
      jevAudit.sampled++;
      if (known?.verdict === 'true_positive') jevAudit.attacksInSample++;
      if (verdict !== undefined) {
        jevAudit.compared++;
        if (verdict === 'false_positive') jevAudit.agreedWithJev++;
        if (known !== undefined && verdict !== 'inconclusive' && verdict !== known.verdict) {
          jevAudit.modelWrongAgainstTruth++;
        }
      }
    }

    if (verdict === undefined || known === undefined) continue;
    verdictsAll++;
    if (alert.buildingBlock !== true) verdictsOutsideBuildingBlocks++;
    const source = sourceOf(alert.tags);
    const counts = bySource[source];
    counts.verdicts++;
    if (verdict === 'false_positive') counts.falsePositive++;
    else if (verdict === 'true_positive') counts.truePositive++;
    else counts.inconclusive++;
    if (verdict !== 'inconclusive' && verdict !== known.verdict) counts.wrong++;
    if (verdict === 'false_positive' && known.verdict === 'true_positive') {
      counts.truePositivesGotFalsePositive++;
    }

    const auditTag = alert.tags.find((tag) => tag.startsWith(TRIAGE_CACHE_AUDIT_TAG_PREFIX));
    if (auditTag === undefined) continue;
    audit.sampled++;
    const record = recordById.get(auditTag.slice(TRIAGE_CACHE_AUDIT_TAG_PREFIX.length));
    if (record === undefined) continue;
    audit.compared++;
    if (record.verdict === verdict) audit.agreedWithRecord++;
    if (verdict !== 'inconclusive' && verdict !== known.verdict) audit.freshWrongAgainstTruth++;
    if (record.verdict !== known.verdict) audit.recordWrongAgainstTruth++;
  }

  for (const counts of Object.values(bySource)) {
    counts.wrongRate = share(counts.wrong, counts.falsePositive + counts.truePositive);
  }
  const hours = verdictsPerHour ? verdictsAll / verdictsPerHour : null;
  return {
    bySource,
    nonBuildingBlock: {
      verdicts: verdictsOutsideBuildingBlocks,
      perHour: hours ? Number((verdictsOutsideBuildingBlocks / hours).toFixed(1)) : null,
    },
    audit: { ...audit, agreedWithRecordShare: share(audit.agreedWithRecord, audit.compared) },
    jev: {
      lanes,
      applied: bySource.jev.verdicts,
      appliedTruePositives: bySource.jev.truePositivesGotFalsePositive,
      appliedTruePositiveShare: share(
        bySource.jev.truePositivesGotFalsePositive,
        bySource.jev.verdicts
      ),
      audit: {
        ...jevAudit,
        agreedWithJevShare: share(jevAudit.agreedWithJev, jevAudit.compared),
      },
    },
  };
};

/** One sentence for the Notes column of the ledger row. */
export const pocNote = (section: PocSection): string => {
  const percent = (value: number | null): string =>
    value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
  const { bySource, audit, jev, nonBuildingBlock } = section;
  return `PoC: verdicts by source model ${bySource.model.verdicts}, cache ${
    bySource.cache.verdicts
  } (${bySource.cache.wrong} wrong, ${percent(bySource.cache.wrongRate)}), Jev ${
    bySource.jev.verdicts
  } (${jev.appliedTruePositives} true positives, ${percent(
    jev.appliedTruePositiveShare
  )}). Verdicts on alerts that are not building blocks: ${nonBuildingBlock.verdicts} (${
    nonBuildingBlock.perHour ?? 'n/a'
  } per hour). Audit: ${audit.agreedWithRecord} of ${
    audit.compared
  } fresh verdicts agree with their record (${percent(
    audit.agreedWithRecordShare
  )}). Jev audit sample: ${jev.audit.sampled} alerts of the benign lane analyzed anyway, ${
    jev.audit.attacksInSample
  } of them attacks, the model agrees with Jev on ${jev.audit.agreedWithJev} of ${
    jev.audit.compared
  }.`;
};

const nearestRank = (values: readonly number[], q: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
};

const WAIT_MINUTES = [15, 30, 60] as const;

/**
 * Counts from the alert index, read before the reset. A severity of `unknown` means the alert has none. Every count leaves out the
 * alerts that are closed without a verdict: the worker never sees a closed alert. `closedWithoutVerdict` counts them.
 */
export interface AlertCounts {
  nonBuildingBlock: number;
  nonBuildingBlockWithoutVerdict: number;
  closedWithoutVerdict?: number;
  bySeverity?: Record<string, { alerts: number; withoutVerdict: number }>;
}

/** The wait of the alerts of one severity. A held rule must not make urgent alerts wait longer. */
export interface SeverityWait {
  /** Alerts that are not building blocks, from the alert index (null without counts). */
  alerts: number | null;
  withVerdict: number;
  withoutVerdict: number | null;
  /** Alerts with a verdict within 60 minutes, as a share of all alerts of the severity, so alerts without a verdict count against it. */
  shareWithin60: number | null;
  p50Seconds: number | null;
  p95Seconds: number | null;
  /** The model verdicts alone: the path that a held rule delays. */
  model: { count: number; p50Seconds: number | null; p95Seconds: number | null };
}

export interface WaitSection {
  /** How the time of each source is known. Read it before you trust a number. */
  method: string;
  /** Alerts that carry a verdict tag and have a time. */
  alertsWithTime: number;
  /** Alerts with a verdict tag and no time (for example a verdict of a decision, or an alert newer than the last sweep). */
  alertsWithoutTime: number;
  /** Alerts that are not building blocks, and how many of them have no verdict at the end. Read from the alert index. */
  nonBuildingBlockAlerts: number | null;
  nonBuildingBlockWithoutVerdict: number | null;
  /** Alerts closed without a verdict, left out of both counts above: the worker never sees a closed alert. */
  closedWithoutVerdict: number | null;
  /** Alerts that got a verdict within N minutes of their creation, counted over all sources. */
  within: Record<'15' | '30' | '60', number>;
  /** The same as a share of all alerts that are not building blocks, so that alerts without a verdict count against it. */
  shareOfAllWithin: Record<'15' | '30' | '60', number | null>;
  p50Seconds: number | null;
  p95Seconds: number | null;
  bySource: Record<VerdictSource, { count: number; p50Seconds: number | null }>;
  /** The wait per `kibana.alert.severity`, for alerts that are not building blocks. */
  bySeverity: Record<string, SeverityWait>;
}

/**
 * The wait from creation to verdict, over every alert that has a verdict, not only the ones that the model analyzed. The time of a
 * model verdict is the end of its call. A tag update does not record a time on the alert, so the time of a Jev or cache verdict is the
 * end of the first sweep after the alert was created. That is a little late (the layers run before the end of the sweep), and the
 * cache can reuse an alert only once its record is active, so the cache time is a floor of the real wait, not an exact value.
 */
export const buildWaitSection = ({
  alerts,
  calls,
  sweeps,
  counts,
}: {
  alerts: readonly TaggedAlert[];
  calls: readonly ModelCall[];
  sweeps: readonly Sweep[];
  counts?: AlertCounts;
}): WaitSection => {
  const modelTime = new Map<string, number>();
  calls
    .filter((call) => call.status === 'completed')
    .forEach((call) =>
      parseAlertIds(call.prompt).forEach((id) => modelTime.set(id, Date.parse(call.finishedAt)))
    );
  const sweepEnds = sweeps.map((sweep) => Date.parse(sweep.startedAt)).sort((a, b) => a - b);

  const waits: number[] = [];
  const bySource: Record<VerdictSource, number[]> = { model: [], cache: [], jev: [] };
  let withoutTime = 0;
  const severityWaits = new Map<string, { all: number[]; model: number[] }>();
  for (const alert of alerts) {
    if (!alert.tags.some((tag) => VERDICT_BY_TAG[tag] !== undefined)) continue;
    const source = sourceOf(alert.tags);
    const created = Date.parse(alert.timestamp);
    const verdictAt =
      source === 'model' ? modelTime.get(alert.id) : sweepEnds.find((end) => end > created);
    if (verdictAt === undefined) {
      withoutTime++;
      continue;
    }
    const wait = Math.max(0, (verdictAt - created) / 1000);
    waits.push(wait);
    bySource[source].push(wait);
    if (!alert.buildingBlock) {
      const severity = alert.severity ?? 'unknown';
      const entry = severityWaits.get(severity) ?? { all: [], model: [] };
      entry.all.push(wait);
      if (source === 'model') entry.model.push(wait);
      severityWaits.set(severity, entry);
    }
  }

  const within = Object.fromEntries(
    WAIT_MINUTES.map((minutes) => [
      String(minutes),
      waits.filter((wait) => wait <= minutes * 60).length,
    ])
  ) as WaitSection['within'];
  const total = counts?.nonBuildingBlock;
  const round1 = (value: number | null): number | null =>
    value === null ? null : Number(value.toFixed(1));
  const severities = new Set([...severityWaits.keys(), ...Object.keys(counts?.bySeverity ?? {})]);
  const bySeverity: Record<string, SeverityWait> = Object.fromEntries(
    [...severities].sort().map((severity) => {
      const { all, model } = severityWaits.get(severity) ?? { all: [], model: [] };
      const counted = counts?.bySeverity?.[severity];
      return [
        severity,
        {
          alerts: counted?.alerts ?? null,
          withVerdict: all.length,
          withoutVerdict: counted?.withoutVerdict ?? null,
          shareWithin60: counted?.alerts
            ? Number((all.filter((wait) => wait <= 3600).length / counted.alerts).toFixed(4))
            : null,
          p50Seconds: round1(nearestRank(all, 0.5)),
          p95Seconds: round1(nearestRank(all, 0.95)),
          model: {
            count: model.length,
            p50Seconds: round1(nearestRank(model, 0.5)),
            p95Seconds: round1(nearestRank(model, 0.95)),
          },
        },
      ];
    })
  );
  return {
    method:
      'Model verdicts: the end of the model call. Jev and cache verdicts: the end of the first sweep after creation (no time is stored on the alert), so these are a little late, and the cache time is a floor.',
    alertsWithTime: waits.length,
    alertsWithoutTime: withoutTime,
    nonBuildingBlockAlerts: counts?.nonBuildingBlock ?? null,
    nonBuildingBlockWithoutVerdict: counts?.nonBuildingBlockWithoutVerdict ?? null,
    closedWithoutVerdict: counts?.closedWithoutVerdict ?? null,
    within,
    shareOfAllWithin: Object.fromEntries(
      WAIT_MINUTES.map((minutes) => [
        String(minutes),
        total ? Number((within[String(minutes) as '15' | '30' | '60'] / total).toFixed(4)) : null,
      ])
    ) as WaitSection['shareOfAllWithin'],
    p50Seconds: round1(nearestRank(waits, 0.5)),
    p95Seconds: round1(nearestRank(waits, 0.95)),
    bySource: {
      model: { count: bySource.model.length, p50Seconds: round1(nearestRank(bySource.model, 0.5)) },
      cache: { count: bySource.cache.length, p50Seconds: round1(nearestRank(bySource.cache, 0.5)) },
      jev: { count: bySource.jev.length, p50Seconds: round1(nearestRank(bySource.jev, 0.5)) },
    },
    bySeverity,
  };
};
