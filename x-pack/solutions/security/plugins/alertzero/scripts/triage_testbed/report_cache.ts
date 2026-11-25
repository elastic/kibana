/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The verdict cache part of a run report (`report_run.ts`). In shadow mode the cache changes no outcome, so its effect is read from
 * what it left behind:
 * - the records in the decisions index, by state and verdict
 * - the output of the two cache steps (`writeVerdictCache` of the batch and `matchVerdictCache` of the sweep)
 * - the alerts that carry `az:would_reuse:<record id>`, joined to the record they point to and to the truth file
 *
 * It answers: how many records of each state, how much of the analyzed work an active record would have covered, how often the fresh
 * verdict agreed with the record, and how often the reused verdict would have been wrong against the truth. The dangerous case is a
 * record of a false positive that covers an alert that is a true positive in the truth.
 */

import { TRIAGE_DECISIONS_AI_INDEX_DEST } from '../../common/step_types/triage_decisions_index';
import { GUARD_HIT_TAG_PREFIX, NOVELTY_GUARD } from '../../server/alert_triage/novelty_guard';
import { describePatternKey } from '../../server/alert_triage/pattern_key';
import {
  TRIAGE_WOULD_REUSE_TAG_PREFIX,
  VERDICT_CACHE_KI_TYPE,
  readCacheRecord,
  verdictCacheId,
  type VerdictCacheRecord,
} from '../../server/alert_triage/verdict_cache';
import type { EsRequest, TaggedAlert, Truth } from './report_run';

export const WRITE_STEP_TYPE = 'alertzero.triage.writeVerdictCache';
export const MATCH_STEP_TYPE = 'alertzero.triage.matchVerdictCache';

const HOUR_MS = 60 * 60 * 1000;

const VERDICT_TAGS = ['az:true_positive', 'az:false_positive', 'az:inconclusive'];

export interface CacheStepRow {
  stepType: string;
  status: string;
  output?: Record<string, unknown>;
}

export interface CacheSection {
  records: {
    total: number;
    byState: Record<string, number>;
    byVerdict: Record<string, number>;
    activeByKind: Record<string, number>;
  };
  writeStep: {
    steps: number;
    skipReasons: Record<string, number>;
    created: number;
    activated: number;
    madeUnstable: number;
    leftAlone: number;
    conflicts: number;
    failed: number;
    recordsUpdated: number;
    hitAlerts: number;
    agreements: number;
    disagreements: number;
  };
  matchStep: {
    steps: number;
    statuses: Record<string, number>;
    candidates: number;
    alertsWithStrictKey: number;
    wouldReuse: number;
    wouldReuseFalsePositive: number;
    wouldReuseTruePositive: number;
    tagFailures: number;
  };
  taggedAlerts: {
    total: number;
    /** Tagged alerts that got a verdict in the run, so that their fresh verdict could be compared. */
    analyzed: number;
    notAnalyzed: number;
    byKind: Record<string, number>;
    bySeverity: Record<string, number>;
    /** Tagged alerts that are building blocks. They are cheap to match and inflate a hit rate. */
    buildingBlocks: number;
    /**
     * Tagged alerts that arrived within one hour of the creation of their record. This is what a record lifetime of 1 hour would have
     * covered, next to the 24 hours of the run. The age is the alert timestamp minus `createdAt`, so an alert older than its record counts.
     */
    withinOneHour: number;
    withinOneHourShare: number | null;
    /** Tagged alerts as a share of the alerts analyzed in the run. */
    shareOfAnalyzed: number | null;
  };
  /**
   * The novelty guard on the alerts tagged would-reuse. In shadow mode it changes no outcome, so this is what it would have
   * done: which alerts it would send back to analysis, and whether those are the wrong reuses or the right ones.
   */
  guards: {
    /** Tagged alerts with at least one `az:guard_hit:novelty:<field>` tag. */
    alertsWithHit: number;
    /** Share of the tagged alerts that the guard would send back to analysis. What is left is the saving. */
    shareWithHit: number | null;
    /** Tagged alerts by field that fired. An alert can fire on more than one field. */
    byField: Record<string, number>;
    /** Wrong reuses (the truth differs from the record), and how many the guard caught. The rest is what it misses. */
    wrongReuse: { total: number; caught: number; missed: number; caughtShare: number | null };
    /** Reuses that are right. A hit here costs analysis work and saves nothing. */
    rightReuse: { total: number; fired: number; firedShare: number | null };
    /** Planted variants among the tagged alerts, by type. */
    byVariant: Record<string, { tagged: number; caught: number }>;
    /** Harmless hash updates among the tagged alerts: a guard hit on them is a false alarm. */
    harmlessHashUpdates: { tagged: number; fired: number };
  };
  agreement: {
    /** Of the hits that the batch compared, the share where the fresh verdict equals the verdict of the record. */
    withFresh: number | null;
    againstTruth: {
      checked: number;
      wrong: number;
      wrongRate: number | null;
      /** A record of a false positive that covers an alert that is a true positive: reuse would close a real attack. */
      falsePositiveRecordOnTruePositive: number;
    };
  };
}

const count = (target: Record<string, number>, key: string): void => {
  target[key] = (target[key] ?? 0) + 1;
};

const number = (value: unknown): number => (typeof value === 'number' ? value : 0);

const share = (part: number, whole: number): number | null =>
  whole === 0 ? null : Number((part / whole).toFixed(4));

const kindOf = (record: VerdictCacheRecord): string => describePatternKey(record.strictKey).kind;

/** The cache section of the report. Pure: the data was read by `readCacheData` and by `readRun`. */
export const buildCacheSection = ({
  steps,
  records,
  alerts,
  truth,
  analyzedAlerts,
}: {
  steps: readonly CacheStepRow[];
  records: readonly VerdictCacheRecord[];
  alerts: readonly TaggedAlert[];
  truth: Truth;
  analyzedAlerts: number;
}): CacheSection => {
  const recordStates: Record<string, number> = {};
  const recordVerdicts: Record<string, number> = {};
  const activeByKind: Record<string, number> = {};
  const recordById = new Map<string, VerdictCacheRecord>();
  for (const record of records) {
    count(recordStates, record.state);
    count(recordVerdicts, record.verdict);
    if (record.state === 'active') count(activeByKind, kindOf(record));
    recordById.set(verdictCacheId(record.keyHash), record);
  }

  const writeSteps = steps.filter((step) => step.stepType === WRITE_STEP_TYPE);
  const matchSteps = steps.filter((step) => step.stepType === MATCH_STEP_TYPE);
  const sum = (rows: readonly CacheStepRow[], field: string): number =>
    rows.reduce((total, row) => total + number(row.output?.[field]), 0);
  const writeSkipReasons: Record<string, number> = {};
  writeSteps.forEach((step) =>
    count(writeSkipReasons, String(step.output?.skip_reason ?? step.status))
  );
  const matchStatuses: Record<string, number> = {};
  matchSteps.forEach((step) => count(matchStatuses, String(step.output?.status ?? step.status)));

  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let buildingBlocks = 0;
  let withinOneHour = 0;
  let taggedTotal = 0;
  let taggedAnalyzed = 0;
  let checked = 0;
  let wrong = 0;
  let falsePositiveRecordOnTruePositive = 0;
  const guardTagPrefix = `${GUARD_HIT_TAG_PREFIX}${NOVELTY_GUARD}:`;
  const firedByField: Record<string, number> = {};
  const byVariant: CacheSection['guards']['byVariant'] = {};
  const harmless = { tagged: 0, fired: 0 };
  const wrongReuse = { total: 0, caught: 0 };
  const rightReuse = { total: 0, fired: 0 };
  let alertsWithHit = 0;
  for (const alert of alerts) {
    const tag = alert.tags.find((candidate) => candidate.startsWith(TRIAGE_WOULD_REUSE_TAG_PREFIX));
    if (tag === undefined) continue;
    taggedTotal++;
    if (alert.tags.some((candidate) => VERDICT_TAGS.includes(candidate))) taggedAnalyzed++;
    const record = recordById.get(tag.slice(TRIAGE_WOULD_REUSE_TAG_PREFIX.length));
    if (record === undefined) continue;
    count(byKind, kindOf(record));
    count(bySeverity, alert.severity ?? 'unknown');
    if (alert.buildingBlock === true) buildingBlocks++;
    if (Date.parse(alert.timestamp) - Date.parse(record.createdAt) <= HOUR_MS) withinOneHour++;
    const firedFields = alert.tags
      .filter((candidate) => candidate.startsWith(guardTagPrefix))
      .map((candidate) => candidate.slice(guardTagPrefix.length));
    const fired = firedFields.length > 0;
    if (fired) alertsWithHit++;
    firedFields.forEach((field) => count(firedByField, field));
    const known = truth.get(alert.id);
    if (known === undefined) continue;
    if (known.variant) {
      const entry = (byVariant[known.variant] = byVariant[known.variant] ?? {
        tagged: 0,
        caught: 0,
      });
      entry.tagged++;
      if (fired) entry.caught++;
    }
    if (known.benign === 'hash_update') {
      harmless.tagged++;
      if (fired) harmless.fired++;
    }
    checked++;
    if (known.verdict !== record.verdict) {
      wrong++;
      wrongReuse.total++;
      if (fired) wrongReuse.caught++;
      if (record.verdict === 'false_positive') falsePositiveRecordOnTruePositive++;
    } else {
      rightReuse.total++;
      if (fired) rightReuse.fired++;
    }
  }

  const hitAlerts = sum(writeSteps, 'hit_alerts');
  const agreements = sum(writeSteps, 'agreements');
  return {
    records: {
      total: records.length,
      byState: recordStates,
      byVerdict: recordVerdicts,
      activeByKind,
    },
    writeStep: {
      steps: writeSteps.length,
      skipReasons: writeSkipReasons,
      created: sum(writeSteps, 'created'),
      activated: sum(writeSteps, 'activated'),
      madeUnstable: sum(writeSteps, 'made_unstable'),
      leftAlone: sum(writeSteps, 'left_alone'),
      conflicts: sum(writeSteps, 'conflicts'),
      failed: sum(writeSteps, 'failed'),
      recordsUpdated: sum(writeSteps, 'records_updated'),
      hitAlerts,
      agreements,
      disagreements: sum(writeSteps, 'disagreements'),
    },
    matchStep: {
      steps: matchSteps.length,
      statuses: matchStatuses,
      candidates: sum(matchSteps, 'candidates'),
      alertsWithStrictKey: sum(matchSteps, 'alerts_with_strict_key'),
      wouldReuse: sum(matchSteps, 'would_reuse'),
      wouldReuseFalsePositive: sum(matchSteps, 'would_reuse_false_positive'),
      wouldReuseTruePositive: sum(matchSteps, 'would_reuse_true_positive'),
      tagFailures: sum(matchSteps, 'tag_failures'),
    },
    taggedAlerts: {
      total: taggedTotal,
      analyzed: taggedAnalyzed,
      notAnalyzed: taggedTotal - taggedAnalyzed,
      byKind,
      bySeverity,
      buildingBlocks,
      withinOneHour,
      withinOneHourShare: share(
        withinOneHour,
        Object.values(byKind).reduce((a, b) => a + b, 0)
      ),
      shareOfAnalyzed: share(taggedAnalyzed, analyzedAlerts),
    },
    guards: {
      alertsWithHit,
      shareWithHit: share(
        alertsWithHit,
        Object.values(byKind).reduce((a, b) => a + b, 0)
      ),
      byField: firedByField,
      wrongReuse: {
        ...wrongReuse,
        missed: wrongReuse.total - wrongReuse.caught,
        caughtShare: share(wrongReuse.caught, wrongReuse.total),
      },
      rightReuse: { ...rightReuse, firedShare: share(rightReuse.fired, rightReuse.total) },
      byVariant,
      harmlessHashUpdates: harmless,
    },
    agreement: {
      withFresh: share(agreements, hitAlerts),
      againstTruth: {
        checked,
        wrong,
        wrongRate: share(wrong, checked),
        falsePositiveRecordOnTruePositive,
      },
    },
  };
};

/** One sentence for the Notes column of the ledger row. */
export const cacheNote = (section: CacheSection): string => {
  const percent = (value: number | null): string =>
    value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
  const { records, taggedAlerts, agreement, writeStep, guards } = section;
  return `Verdict cache (shadow): ${records.total} records (${
    records.byState.active ?? 0
  } active, ${records.byState.unstable ?? 0} unstable), ${
    taggedAlerts.total
  } alerts tagged would-reuse (${percent(taggedAlerts.shareOfAnalyzed)} of the analyzed alerts), ${
    writeStep.hitAlerts
  } hits compared with fresh verdicts (${percent(agreement.withFresh)} agree), against the truth ${
    agreement.againstTruth.wrong
  } of ${agreement.againstTruth.checked} tagged alerts would get a wrong reused verdict (${
    agreement.againstTruth.falsePositiveRecordOnTruePositive
  } of them a true positive covered by a false positive record). Of the tagged alerts, ${
    taggedAlerts.buildingBlocks
  } are building blocks and ${percent(
    taggedAlerts.withinOneHourShare
  )} came within one hour of their record. The novelty guard fired on ${percent(
    guards.shareWithHit
  )} of the tagged alerts and caught ${guards.wrongReuse.caught} of ${
    guards.wrongReuse.total
  } wrong reuses (${guards.rightReuse.fired} of ${guards.rightReuse.total} right reuses fired).`;
};

interface Hit<T> {
  _source: T;
}

/** The cache steps of the run window and the records now in the decisions index. A missing index means no records. */
export const readCacheData = async (
  request: EsRequest,
  { from, to }: { from: string; to: string }
): Promise<{ steps: CacheStepRow[]; records: VerdictCacheRecord[] }> => {
  const stepPage = await request<{ hits: { hits: Array<Hit<CacheStepRow>> } }>(
    'POST',
    '/.workflows-step-executions/_search',
    {
      size: 10000,
      query: {
        bool: {
          filter: [
            { terms: { stepType: [WRITE_STEP_TYPE, MATCH_STEP_TYPE] } },
            { range: { startedAt: { gte: from, lte: to } } },
          ],
        },
      },
      _source: ['stepType', 'status', 'output'],
    }
  );
  const steps = stepPage.hits.hits.map((hit) => hit._source);

  let recordHits: Array<Hit<Record<string, unknown>>> = [];
  try {
    const page = await request<{ hits: { hits: Array<Hit<Record<string, unknown>>> } }>(
      'POST',
      `/${TRIAGE_DECISIONS_AI_INDEX_DEST.value}/_search`,
      { size: 10000, query: { term: { type: VERDICT_CACHE_KI_TYPE } } }
    );
    recordHits = page.hits.hits;
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('failed with 404'))) throw error;
  }
  const records = recordHits.flatMap((hit) => {
    const record = readCacheRecord(hit._source);
    return record === undefined ? [] : [record];
  });
  return { steps, records };
};
