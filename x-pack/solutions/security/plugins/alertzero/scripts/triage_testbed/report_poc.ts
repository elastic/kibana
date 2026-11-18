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

import { JEV_LANE_TAG_PREFIX, JEV_VERDICT_TAG } from '../../server/alert_triage/jev_first_line';
import {
  TRIAGE_CACHE_AUDIT_TAG_PREFIX,
  TRIAGE_CACHE_REUSE_TAG_PREFIX,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import type { TaggedAlert, Truth } from './report_run';

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

const sourceOf = (tags: readonly string[]): VerdictSource => {
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
  } fresh verdicts agree with their record (${percent(audit.agreedWithRecordShare)}).`;
};
