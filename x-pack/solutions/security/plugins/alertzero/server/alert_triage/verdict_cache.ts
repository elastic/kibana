/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hashKey } from './key_tags';
import { buildPatternKeys, describePatternKey } from './pattern_key';

/**
 * The verdict cache: a model verdict for one strict pattern key, kept so that a later alert of the same key can reuse it.
 * This module is pure: alert documents and verdicts in, records and Knowledge Item documents out. The steps do the reading
 * and the writing. This week the cache runs in `shadow` only: a hit is a tag, and the alert is analyzed as before.
 *
 * A record has two runs. Run 1 is the verdict of the first alert of a key that a batch analyzes. Run 2 is the verdict of
 * the first alert of that key in a LATER batch. No alert is analyzed twice. Two confident runs that agree make the record
 * `active`. Runs that disagree make the key `unstable` for a day, with no new record in that time.
 */

/** The switch of the cache. `on` is not built this week, so every value except `shadow` reads as `off`. */
export const VERDICT_CACHE_FLAG = 'alertzero.triageVerdictCache';

export type VerdictCacheMode = 'off' | 'shadow';

export const toVerdictCacheMode = (value: string): VerdictCacheMode =>
  value === 'shadow' ? 'shadow' : 'off';

export const VERDICT_CACHE_KI_TYPE = 'security.triage_verdict_cache';
export const VERDICT_CACHE_ID_PREFIX = 'verdict-cache-';
export const VERDICT_CACHE_PRODUCER = 'alertzero.triage.verdictCache.v1';

/** The tag of an alert that an `active` record covers. In shadow mode the alert is still analyzed. */
export const TRIAGE_WOULD_REUSE_TAG_PREFIX = 'az:would_reuse:';

const HOUR_MS = 60 * 60 * 1000;

/** How long a record lives. A setting in the design. The shadow run also reports what 1 hour would give. */
export const VERDICT_CACHE_TTL_MS = 24 * HOUR_MS;

/** How long a key gets no new record after its two runs disagreed. */
export const VERDICT_CACHE_UNSTABLE_BLOCK_MS = 24 * HOUR_MS;

/** Most values the record keeps per novelty field. Past this, the field is saturated. */
export const VERDICT_CACHE_NOVELTY_CAP = 50;

export const verdictCacheId = (keyHash: string): string => `${VERDICT_CACHE_ID_PREFIX}${keyHash}`;

export type CacheVerdict = 'false_positive' | 'true_positive';
export type CacheState = 'pending' | 'active' | 'unstable';

export interface CacheRun {
  alertId: string;
  /** The classification of the model. Run 2 can be `inconclusive`, which never agrees. */
  verdict: string;
  confidence: number;
}

export interface CacheHits {
  hits: number;
  agreements: number;
  disagreements: number;
  /** Guard hits by guard name. Filled by the guards. */
  guardHits: Readonly<Record<string, number>>;
}

export interface VerdictCacheRecord {
  keyHash: string;
  strictKey: string;
  state: CacheState;
  verdict: CacheVerdict;
  representativeId: string;
  run1: CacheRun;
  run2?: CacheRun;
  /** Jev's score of the representative. Absent when Jev was not used. Then `jevSkipReason` says why. */
  jevScore?: number;
  jevSkipReason?: string;
  /** Per novelty field, the values seen so far (at most `VERDICT_CACHE_NOVELTY_CAP`). */
  novelty: Readonly<Record<string, readonly string[]>>;
  createdAt: string;
  /** The end of the life of the record. For an `unstable` record it is the end of the block. */
  expiresAt: string;
  hits: CacheHits;
}

export interface FreshVerdict {
  alertId: string;
  classification: string;
  confidenceScore: number;
}

/** The verdict that can be cached: a false or true positive that reaches the confidence floor. Never `inconclusive`. */
export const toCacheVerdict = (
  { classification, confidenceScore }: FreshVerdict,
  floor: number
): CacheVerdict | undefined =>
  (classification === 'false_positive' || classification === 'true_positive') &&
  confidenceScore >= floor
    ? classification
    : undefined;

export interface JevInput {
  /** Jev contradicts the verdict at the extremes (0.05 and 0.98). Blocks the step to `active`. */
  contradicts?: boolean;
  score?: number;
  /** Why Jev was not used, for the record. */
  skipReason?: string;
}

export type CacheNoneReason = 'not_eligible' | 'blocked_unstable' | 'already_active' | 'same_alert';

export type CacheTransition = 'created' | 'activated' | 'made_unstable';

export type CacheAction =
  | { type: 'none'; reason: CacheNoneReason }
  | { type: 'write'; transition: CacheTransition; record: VerdictCacheRecord };

const NO_HITS: CacheHits = { hits: 0, agreements: 0, disagreements: 0, guardHits: {} };

const toRun = ({ alertId, classification, confidenceScore }: FreshVerdict): CacheRun => ({
  alertId,
  verdict: classification,
  confidence: confidenceScore,
});

/**
 * What the write step does with the verdict of the first alert of a key in a batch.
 * - No live record: a confident false or true positive starts a `pending` record (run 1). Anything else writes nothing.
 * - A `pending` record: run 2. The same verdict at the floor, and no Jev contradiction, make it `active`. Anything else
 *   (another verdict, `inconclusive`, a confidence under the floor, or a contradiction) makes it `unstable`.
 * - An `unstable` record blocks the key until it expires. An `active` record is left alone.
 * A record past `expiresAt` counts as no record. The run of the alert that made the record is ignored.
 */
export const nextCacheAction = ({
  existing,
  fresh,
  keyHash,
  strictKey,
  floor,
  now,
  jev,
}: {
  existing: VerdictCacheRecord | undefined;
  fresh: FreshVerdict;
  keyHash: string;
  strictKey: string;
  floor: number;
  now: Date;
  jev?: JevInput;
}): CacheAction => {
  const nowMs = now.getTime();
  const verdict = toCacheVerdict(fresh, floor);
  const live =
    existing !== undefined && Date.parse(existing.expiresAt) > nowMs ? existing : undefined;

  if (live?.state === 'unstable') return { type: 'none', reason: 'blocked_unstable' };
  if (live?.state === 'active') return { type: 'none', reason: 'already_active' };

  if (live?.state === 'pending') {
    if (fresh.alertId === live.representativeId) return { type: 'none', reason: 'same_alert' };
    const run2 = toRun(fresh);
    if (verdict === live.verdict && jev?.contradicts !== true) {
      return {
        type: 'write',
        transition: 'activated',
        record: { ...live, state: 'active', run2 },
      };
    }
    return {
      type: 'write',
      transition: 'made_unstable',
      record: {
        ...live,
        state: 'unstable',
        run2,
        expiresAt: new Date(nowMs + VERDICT_CACHE_UNSTABLE_BLOCK_MS).toISOString(),
      },
    };
  }

  if (verdict === undefined) return { type: 'none', reason: 'not_eligible' };
  return {
    type: 'write',
    transition: 'created',
    record: {
      keyHash,
      strictKey,
      state: 'pending',
      verdict,
      representativeId: fresh.alertId,
      run1: toRun(fresh),
      ...(jev?.score === undefined
        ? { jevSkipReason: jev?.skipReason ?? 'not_used' }
        : { jevScore: jev.score }),
      novelty: {},
      createdAt: now.toISOString(),
      expiresAt: new Date(nowMs + VERDICT_CACHE_TTL_MS).toISOString(),
      hits: NO_HITS,
    },
  };
};

/** A record that a later alert can be tagged against: `active` and not expired. */
export const isReusable = (record: VerdictCacheRecord, now: Date): boolean =>
  record.state === 'active' && Date.parse(record.expiresAt) > now.getTime();

/** Adds values to the lists of a record, without duplicates and up to `cap` values per field. */
export const mergeNovelty = (
  lists: Readonly<Record<string, readonly string[]>>,
  values: Readonly<Record<string, readonly string[]>>,
  cap: number = VERDICT_CACHE_NOVELTY_CAP
): Record<string, readonly string[]> => {
  const merged: Record<string, readonly string[]> = { ...lists };
  for (const [field, fieldValues] of Object.entries(values)) {
    const known = new Set(merged[field] ?? []);
    for (const value of fieldValues) {
      if (known.size >= cap) break;
      known.add(value);
    }
    merged[field] = [...known];
  }
  return merged;
};

/**
 * The record after a later alert of its key was analyzed in shadow mode. It counts the hit, says whether the fresh
 * verdict agrees with the record (the same classification, whatever the confidence), and, when it agrees, adds the values
 * of the alert to the novelty lists. A disagreeing alert adds nothing, so a bad variant that the model marks as a true
 * positive does not widen the lists of a false positive key.
 */
export const recordShadowOutcome = ({
  record,
  fresh,
  noveltyValues = {},
}: {
  record: VerdictCacheRecord;
  fresh: FreshVerdict;
  noveltyValues?: Readonly<Record<string, readonly string[]>>;
}): VerdictCacheRecord => {
  const agrees = fresh.classification === record.verdict;
  return {
    ...record,
    novelty: agrees ? mergeNovelty(record.novelty, noveltyValues) : record.novelty,
    hits: {
      ...record.hits,
      hits: record.hits.hits + 1,
      agreements: record.hits.agreements + (agrees ? 1 : 0),
      disagreements: record.hits.disagreements + (agrees ? 0 : 1),
    },
  };
};

// ---------------------------------------------------------------------------
// The first alert of each key in a batch
// ---------------------------------------------------------------------------

export interface BatchAlert {
  id: string;
  riskScore: number;
  /** Alert creation time, epoch milliseconds. */
  timestamp: number;
  doc: Readonly<Record<string, unknown>>;
  classification: string;
  confidenceScore: number;
}

export interface KeyRepresentative {
  keyHash: string;
  strictKey: string;
  alert: BatchAlert;
}

/** The order of `allocateBudget`: risk score high first, then the oldest alert, then the lowest id. */
const compareAlerts = (a: BatchAlert, b: BatchAlert): number =>
  b.riskScore - a.riskScore || a.timestamp - b.timestamp || a.id.localeCompare(b.id);

/**
 * The representative of each strict key in a batch: the alert that the batch analyzes first for that key. One batch gives
 * a key one run only, so run 2 always comes from a later batch. An alert without a strict key has no cache.
 */
export const pickKeyRepresentatives = ({
  alerts,
  spaceId,
}: {
  alerts: readonly BatchAlert[];
  spaceId: string;
}): KeyRepresentative[] => {
  const byKey = new Map<string, KeyRepresentative>();
  for (const alert of [...alerts].sort(compareAlerts)) {
    const { strict } = buildPatternKeys(alert.doc as Record<string, unknown>);
    if (strict === undefined) continue;
    const keyHash = hashKey(spaceId, strict);
    if (!byKey.has(keyHash)) byKey.set(keyHash, { keyHash, strictKey: strict, alert });
  }
  return [...byKey.values()];
};

// ---------------------------------------------------------------------------
// The Knowledge Item document and its reader
// ---------------------------------------------------------------------------

type Source = Record<string, unknown>;

const MAX_TITLE_LENGTH = 256;

const toRunAttributes = ({ alertId, verdict, confidence }: CacheRun) => ({
  alert_id: alertId,
  verdict,
  confidence,
});

/**
 * The Knowledge Item document of a record, for the same index as the decisions. `content` is for humans: reuse reads
 * `attributes`. Novelty lists are an array of `{ field, values }` and not an object keyed by field name, because the
 * field names contain dots, and Elasticsearch would turn each dot into a nested object.
 */
export const buildCacheDocument = ({
  record,
  spaceId,
  now,
}: {
  record: VerdictCacheRecord;
  spaceId: string;
  now: Date;
}): Record<string, unknown> => {
  const key = describePatternKey(record.strictKey);
  const ruleLabel = key.ruleId;
  const updatedAt = now.toISOString();
  return {
    '@timestamp': updatedAt,
    id: verdictCacheId(record.keyHash),
    updated_at: updatedAt,
    type: VERDICT_CACHE_KI_TYPE,
    title: `Verdict cache (${record.state}): ${ruleLabel}`.slice(0, MAX_TITLE_LENGTH),
    description: `Verdict of rule ${ruleLabel}${
      key.kind ? ` (${key.kind})` : ''
    } for one exact pattern`,
    content: [
      `The model said ${record.verdict} for this exact pattern of rule ${ruleLabel} in alert ${record.representativeId}. State: ${record.state}.`,
      ...key.values.map(([field, value]) => `- ${field}=${value.slice(0, 1000)}`),
    ].join('\n'),
    tags: ['watch:alert_triage', 'triage_verdict_cache'],
    // Same rule as for decisions: no `count` or `name`, so Elasticsearch hides the document from users.
    permissions: { kibana: { privileges: [{ space: spaceId }] } },
    attributes: {
      key_hash: record.keyHash,
      space_id: spaceId,
      strict_key: record.strictKey,
      rule_id: key.ruleId,
      ...(key.ruleRevision === undefined ? {} : { rule_revision: key.ruleRevision }),
      state: record.state,
      verdict: record.verdict,
      representative_id: record.representativeId,
      run1: toRunAttributes(record.run1),
      ...(record.run2 ? { run2: toRunAttributes(record.run2) } : {}),
      // Two fields and not one that is a number or an object, so that a mapping never sees two types.
      ...(record.jevScore === undefined ? {} : { jev_score: record.jevScore }),
      ...(record.jevSkipReason === undefined ? {} : { jev_skip_reason: record.jevSkipReason }),
      novelty: Object.entries(record.novelty).map(([field, values]) => ({ field, values })),
      hits: {
        hits: record.hits.hits,
        agreements: record.hits.agreements,
        disagreements: record.hits.disagreements,
        guard_hits: Object.entries(record.hits.guardHits).map(([guard, count]) => ({
          guard,
          count,
        })),
      },
      created_at: record.createdAt,
      producer: VERDICT_CACHE_PRODUCER,
    },
    expires_at: record.expiresAt,
  };
};

const asRecord = (value: unknown): Source | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Source)
    : undefined;

const asText = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const readRun = (value: unknown): CacheRun | undefined => {
  const run = asRecord(value);
  const [alertId, verdict, confidence] = [
    asText(run?.alert_id),
    asText(run?.verdict),
    asNumber(run?.confidence),
  ];
  return alertId === undefined || verdict === undefined || confidence === undefined
    ? undefined
    : { alertId, verdict, confidence };
};

const isCacheState = (value: unknown): value is CacheState =>
  value === 'pending' || value === 'active' || value === 'unstable';

const isCacheVerdict = (value: unknown): value is CacheVerdict =>
  value === 'false_positive' || value === 'true_positive';

/**
 * A stored record, or undefined when the document is not a verdict cache record that this code wrote: another type, a
 * lifecycle that is not `active`, or a missing or mistyped field. It does not look at the time: the caller decides what
 * an expired record means (`nextCacheAction` and `isReusable` do). Only a mistyped record is dropped here, so it can
 * be written again.
 */
export const readCacheRecord = (source: Source | undefined): VerdictCacheRecord | undefined => {
  if (source === undefined || source.type !== VERDICT_CACHE_KI_TYPE) return undefined;
  const lifecycle = asRecord(asRecord(source.governance)?.lifecycle)?.status;
  if (lifecycle !== undefined && lifecycle !== 'active') return undefined;
  const attributes = asRecord(source.attributes);
  if (attributes === undefined) return undefined;
  const [keyHash, strictKey, representativeId, createdAt, expiresAt] = [
    asText(attributes.key_hash),
    asText(attributes.strict_key),
    asText(attributes.representative_id),
    asText(attributes.created_at),
    asText(source.expires_at),
  ];
  const run1 = readRun(attributes.run1);
  const hits = asRecord(attributes.hits);
  const [hitCount, agreements, disagreements] = [
    asNumber(hits?.hits),
    asNumber(hits?.agreements),
    asNumber(hits?.disagreements),
  ];
  if (
    keyHash === undefined ||
    strictKey === undefined ||
    representativeId === undefined ||
    createdAt === undefined ||
    expiresAt === undefined ||
    run1 === undefined ||
    !isCacheState(attributes.state) ||
    !isCacheVerdict(attributes.verdict) ||
    hitCount === undefined ||
    agreements === undefined ||
    disagreements === undefined
  ) {
    return undefined;
  }
  const novelty: Record<string, readonly string[]> = {};
  for (const entry of Array.isArray(attributes.novelty) ? attributes.novelty : []) {
    const item = asRecord(entry);
    const field = asText(item?.field);
    if (field !== undefined && Array.isArray(item?.values)) {
      novelty[field] = item.values.filter((v): v is string => typeof v === 'string');
    }
  }
  const guardHits: Record<string, number> = {};
  for (const entry of Array.isArray(hits?.guard_hits) ? hits.guard_hits : []) {
    const item = asRecord(entry);
    const [guard, count] = [asText(item?.guard), asNumber(item?.count)];
    if (guard !== undefined && count !== undefined) guardHits[guard] = count;
  }
  const run2 = readRun(attributes.run2);
  const [jevScore, jevSkipReason] = [
    asNumber(attributes.jev_score),
    asText(attributes.jev_skip_reason),
  ];
  return {
    keyHash,
    strictKey,
    state: attributes.state,
    verdict: attributes.verdict,
    representativeId,
    run1,
    ...(run2 ? { run2 } : {}),
    ...(jevScore === undefined ? {} : { jevScore }),
    ...(jevSkipReason === undefined ? {} : { jevSkipReason }),
    novelty,
    createdAt,
    expiresAt,
    hits: { hits: hitCount, agreements, disagreements, guardHits },
  };
};
