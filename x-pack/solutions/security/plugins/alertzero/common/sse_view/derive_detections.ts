/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HuntIocType,
  type HuntForThreatHit,
  type HuntForThreatPerIoc,
  type HuntResult,
} from '@kbn/alertzero-common';
import type { SignificantSecurityEventAttachmentData } from '../significant_security_event_schema';
import { classifyBasis, type ClassifyBasisIoc } from './classify_basis';

/** One entry of `SignificantSecurityEventAttachmentData['detections']`. */
export type SseDetection = NonNullable<
  SignificantSecurityEventAttachmentData['detections']
>[number];

/** One entry of `SignificantSecurityEventAttachmentData['events']`. */
export type SseEventRef = NonNullable<SignificantSecurityEventAttachmentData['events']>[number];

/** One Tier 2 behavior as carried on `hunt_result.tier2.behaviors`. */
export type SseTier2Behavior = NonNullable<HuntResult['tier2']>['behaviors'][number];

/**
 * Pragmatic hunt-result shape `deriveDetections` reads from. Not tied to one
 * zod schema: `tier1.hits` lives on the raw coordinator-side `HuntForThreatResult`
 * (the SSE-persisted `hunt_result.tier1` drops it), so this interface is the
 * union of what either side can supply.
 */
export interface DeriveDetectionsHuntResult {
  tier1: {
    counts?: { affected_hosts?: number; affected_users?: number };
    per_ioc?: readonly HuntForThreatPerIoc[];
    hits?: readonly HuntForThreatHit[];
    resolved_iocs?: readonly ClassifyBasisIoc[];
  };
  tier2?: {
    behaviors: readonly SseTier2Behavior[];
  };
}

export interface DeriveDetectionsOptions {
  /** When set, scopes behavior detections to this technique only. */
  techniqueId?: string;
}

/** Caps detections the way `detectionSchema` caps `detections[]`. */
const MAX_DETECTIONS = 30;
const MAX_NAMES = 50;
/** Matches the SSE schema's per-host/user string max. */
const MAX_NAME_LENGTH = 512;
/** Matches `detectionSchema.id` and `eventRefSchema.matched.detection` max. */
const MAX_DETECTION_ID_LENGTH = 256;

/**
 * Stable, dependency-free digest for an over-long id tail: a base-31 polynomial hash
 * reduced modulo 2^32, rendered as 8 hex characters. Only ids within one SSE compete,
 * so a 32-bit space is plenty.
 */
const HASH_MODULUS = 2 ** 32;
const shortHash = (value: string): string => {
  let hash = 7;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % HASH_MODULUS;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * Id of an IOC detection: `ioc:{type}:{value}` when that fits the schema's 256-char
 * cap, else `ioc:{type}:{fnv1a(value)}` so a long URL IOC (values run to 2048) still
 * gets a valid, stable id. Readers take the value from `matched_on[0].value`, never by
 * parsing the id, so the hashed form loses nothing.
 */
export const buildIocDetectionId = (type: string, value: string): string => {
  const plain = `ioc:${type}:${value}`;
  return plain.length <= MAX_DETECTION_ID_LENGTH ? plain : `ioc:${type}:${shortHash(value)}`;
};

/** Id of a behavior detection: `behavior:{technique_id}`. */
export const buildBehaviorDetectionId = (techniqueId: string): string => `behavior:${techniqueId}`;

/** Narrows a matched-record type string to the IOC type enum, else `undefined`. */
const asHuntIocType = (type: string): HuntIocType | undefined =>
  HuntIocType.options.includes(type as HuntIocType) ? (type as HuntIocType) : undefined;

/**
 * The IOC (type, value) an IOC detection stands for. Type is the stored `ioc_type`, else
 * (payloads written before that field) the id prefix; value is `matched_on[0].value`
 * (the id tail may be a hash). `undefined` for a behavior detection, or for an id not
 * built by {@link buildIocDetectionId} on a payload without `ioc_type`.
 */
export const iocOfDetection = (
  detection: Pick<SseDetection, 'id' | 'kind' | 'matched_on' | 'ioc_type'>
): { type: string; value: string } | undefined => {
  if (detection.kind !== 'ioc') return undefined;
  const match = /^ioc:([^:]+):(.*)$/.exec(detection.id);
  const type = detection.ioc_type ?? match?.[1];
  if (!type) return undefined;
  const value = detection.matched_on[0]?.value ?? match?.[2];
  return value ? { type, value } : undefined;
};

const dedupeDefined = (values: ReadonlyArray<string | undefined>): string[] => [
  ...new Set(
    values
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, MAX_NAME_LENGTH))
  ),
];

interface MatchedIoc {
  type: string;
  value: string;
  field: string;
}

/** Shared matched shape on Tier 1 hits and cited SSE events. */
interface MatchedRecord {
  ioc?: { type?: string; value?: string };
  iocs?: ReadonlyArray<{ type: string; value: string; field: string }>;
  field?: string;
}

/** Every IOC named on a hit/event (`matched.iocs`, else legacy `matched.ioc` + `field`). */
const matchedIocsFromRecord = (matched: MatchedRecord | undefined): MatchedIoc[] => {
  if (matched?.iocs && matched.iocs.length > 0) {
    return [...matched.iocs];
  }
  if (matched?.ioc?.type && matched.ioc.value) {
    return [
      {
        type: matched.ioc.type,
        value: matched.ioc.value,
        field: matched.field ?? '',
      },
    ];
  }
  return [];
};

/** Matched IOC entries on one event that name `value` (prefer `matched.iocs`). */
const matchedIocsForValue = (event: SseEventRef, value: string): MatchedIoc[] =>
  matchedIocsFromRecord(event.matched).filter((ioc) => ioc.value === value && Boolean(ioc.field));

/** Every event whose `matched.ioc`/`matched.iocs` names `value`, for borrowing host/user names. */
const hostsAndUsersForIocValue = (
  events: readonly SseEventRef[],
  value: string
): { hosts: string[]; users: string[] } => {
  const matching = events.filter((event) => matchedIocsForValue(event, value).length > 0);
  return {
    hosts: dedupeDefined(matching.map((event) => event.host)).slice(0, MAX_NAMES),
    users: dedupeDefined(matching.map((event) => event.user)).slice(0, MAX_NAMES),
  };
};

/**
 * Field (and source indices) observed on cited events for an IOC value. Tier 1's
 * `per_ioc.field` is the first searched slot for that IOC type, which can disagree
 * with the ECS field that actually matched (`source.ip` vs `destination.ip`,
 * `file.hash.sha256` vs `process.hash.sha256`). Discover pivots need the observed
 * field or they return empty / Unknown column.
 */
export const observedIocMatchFromEvents = (
  events: readonly SseEventRef[],
  value: string
): { field: string; indices: string[] } | undefined => {
  const fieldCounts = new Map<string, number>();
  const indices: string[] = [];
  for (const event of events) {
    const matched = matchedIocsForValue(event, value);
    if (matched.length === 0) {
      continue;
    }
    for (const ioc of matched) {
      fieldCounts.set(ioc.field, (fieldCounts.get(ioc.field) ?? 0) + 1);
    }
    if (event.source_index) {
      indices.push(event.source_index);
    }
  }
  if (fieldCounts.size === 0) {
    return undefined;
  }
  let field = '';
  let bestCount = -1;
  for (const [candidate, count] of fieldCounts) {
    if (count > bestCount) {
      field = candidate;
      bestCount = count;
    }
  }
  return { field, indices: dedupeDefined(indices) };
};

/**
 * Prefer cited-event matched fields over Tier 1 `per_ioc.field` when they disagree,
 * so stored and freshly derived detections pivot Discover on a real hit field.
 */
export const reconcileIocDetectionFields = (
  detections: readonly SseDetection[],
  events: readonly SseEventRef[]
): SseDetection[] => {
  if (events.length === 0) {
    return [...detections];
  }
  return detections.map((detection) => {
    if (detection.kind !== 'ioc') {
      return detection;
    }
    const value = detection.matched_on[0]?.value;
    if (!value) {
      return detection;
    }
    const observed = observedIocMatchFromEvents(events, value);
    if (!observed || observed.field === detection.field) {
      return detection;
    }
    return {
      ...detection,
      field: observed.field,
      matched_on: [{ field: observed.field, value }],
    };
  });
};

interface IocGroup<T> {
  type: string;
  value: string;
  field: string;
  items: T[];
}

/**
 * Groups records by every IOC each one matched. One record can land in more than
 * one group when it matched several IOCs.
 */
const groupByMatchedIoc = <T>(
  records: readonly T[],
  getMatched: (record: T) => MatchedRecord | undefined
): Array<IocGroup<T>> => {
  const groups = new Map<string, IocGroup<T>>();
  for (const record of records) {
    for (const ioc of matchedIocsFromRecord(getMatched(record))) {
      const key = `${ioc.type}:${ioc.value}`;
      const group = groups.get(key);
      if (group) {
        group.items.push(record);
      } else {
        groups.set(key, {
          type: ioc.type,
          value: ioc.value,
          field: ioc.field,
          items: [record],
        });
      }
    }
  }
  return [...groups.values()];
};

const firstAndLastTimestamp = (
  timestamps: ReadonlyArray<string | undefined>
): { first?: string; last?: string } => {
  const sorted = dedupeDefined(timestamps).sort();
  return sorted.length > 0 ? { first: sorted[0], last: sorted[sorted.length - 1] } : {};
};

/** IOC detections built from Tier 1's aggregated `per_ioc` buckets, when present. */
const detectionsFromPerIoc = (
  perIoc: readonly HuntForThreatPerIoc[],
  events: readonly SseEventRef[],
  hasBehaviorHit: boolean
): SseDetection[] =>
  perIoc.map((entry) => {
    const { hosts, users } = hostsAndUsersForIocValue(events, entry.value);
    const hostCount = entry.host_count ?? (hosts.length > 0 ? hosts.length : undefined);
    const userCount = entry.user_count ?? (users.length > 0 ? users.length : undefined);
    // Prefer the ECS field cited events actually matched; `per_ioc.field` is only the
    // first searched slot for the IOC type and can miss the hit (see observedIocMatchFromEvents).
    const field = observedIocMatchFromEvents(events, entry.value)?.field ?? entry.field;
    const iocType = asHuntIocType(entry.type);
    return {
      id: buildIocDetectionId(entry.type, entry.value),
      kind: 'ioc',
      ...(iocType ? { ioc_type: iocType } : {}),
      field,
      basis: classifyBasis([{ type: entry.type, value: entry.value }], hasBehaviorHit),
      matched_on: [{ field, value: entry.value }],
      ...(hosts.length > 0 ? { hosts } : {}),
      ...(users.length > 0 ? { users } : {}),
      ...(hostCount !== undefined ? { host_count: hostCount } : {}),
      ...(userCount !== undefined ? { user_count: userCount } : {}),
      total: entry.count,
      ...(entry.first_seen ? { first_seen: entry.first_seen } : {}),
      ...(entry.last_seen ? { last_seen: entry.last_seen } : {}),
    };
  });

/** One sample-based IOC detection from a hit or cited-event group. */
const detectionFromIocGroup = <T extends { host?: string; user?: string; timestamp?: string }>(
  group: IocGroup<T>,
  hasBehaviorHit: boolean
): SseDetection => {
  const { first, last } = firstAndLastTimestamp(group.items.map((item) => item.timestamp));
  const hosts = dedupeDefined(group.items.map((item) => item.host)).slice(0, MAX_NAMES);
  const users = dedupeDefined(group.items.map((item) => item.user)).slice(0, MAX_NAMES);
  const iocType = asHuntIocType(group.type);
  return {
    id: buildIocDetectionId(group.type, group.value),
    kind: 'ioc',
    ...(iocType ? { ioc_type: iocType } : {}),
    field: group.field,
    basis: classifyBasis([{ type: group.type, value: group.value }], hasBehaviorHit),
    matched_on: [{ field: group.field, value: group.value }],
    ...(hosts.length > 0 ? { hosts, host_count: hosts.length } : {}),
    ...(users.length > 0 ? { users, user_count: users.length } : {}),
    total: group.items.length,
    ...(first ? { first_seen: first } : {}),
    ...(last ? { last_seen: last } : {}),
    from_sample: true,
  };
};

interface IocDetectionsResult {
  detections: SseDetection[];
  /** The (type, value) pairs behind every IOC detection, for grading a behavior's basis. */
  iocPairs: ClassifyBasisIoc[];
}

/**
 * IOC detections from Tier 1's `per_ioc` aggregation when present, else from
 * grouping sampled hits by matched IOC, else from grouping cited SSE events
 * (old payloads with neither `per_ioc` nor `hits` on the stored hunt_result).
 * Returns the underlying (type, value) pairs alongside the detections so a
 * behavior detection can be graded against "was any IOC seen at all" without
 * re-deriving them.
 */
const buildIocDetections = (
  huntResult: DeriveDetectionsHuntResult,
  events: readonly SseEventRef[],
  hasBehaviorHit: boolean
): IocDetectionsResult => {
  const perIoc = huntResult.tier1.per_ioc ?? [];
  if (perIoc.length > 0) {
    return {
      detections: detectionsFromPerIoc(perIoc, events, hasBehaviorHit),
      iocPairs: perIoc.map((entry) => ({ type: entry.type, value: entry.value })),
    };
  }
  const hits = huntResult.tier1.hits ?? [];
  if (hits.length > 0) {
    const groups = groupByMatchedIoc(hits, (hit) => hit.matched);
    return {
      detections: groups.map((group) => detectionFromIocGroup(group, hasBehaviorHit)),
      iocPairs: groups.map((group) => ({ type: group.type, value: group.value })),
    };
  }
  const eventGroups = groupByMatchedIoc(events, (event) => event.matched);
  return {
    detections: eventGroups.map((group) => detectionFromIocGroup(group, hasBehaviorHit)),
    iocPairs: eventGroups.map((group) => ({ type: group.type, value: group.value })),
  };
};

/** One behavior detection per Tier 2 behavior whose execution actually hit. */
const detectionsFromBehaviors = (
  behaviors: readonly SseTier2Behavior[],
  iocsForBasis: readonly ClassifyBasisIoc[],
  techniqueId: string | undefined
): SseDetection[] => {
  const scoped = techniqueId ? behaviors.filter((b) => b.technique_id === techniqueId) : behaviors;
  return scoped
    .filter((behavior) => behavior.execution?.hit === true)
    .map((behavior) => {
      const hosts = dedupeDefined(behavior.affected_hosts ?? []).slice(0, MAX_NAMES);
      const users = dedupeDefined(behavior.affected_users ?? []).slice(0, MAX_NAMES);
      return {
        id: buildBehaviorDetectionId(behavior.technique_id),
        kind: 'behavior',
        technique_id: behavior.technique_id,
        ...(behavior.technique_name ? { technique_name: behavior.technique_name } : {}),
        basis: classifyBasis(iocsForBasis, true),
        matched_on: [],
        ...(hosts.length > 0 ? { hosts, host_count: hosts.length } : {}),
        ...(users.length > 0 ? { users, user_count: users.length } : {}),
        total: behavior.execution?.row_count ?? 0,
      };
    });
};

/**
 * Builds the SSE's `detections[]` from a hunt result and its event refs:
 * one IOC detection per `tier1.per_ioc` bucket, falling back to grouping
 * sampled hits by matched IOC when Tier 1 has no aggregation, plus one
 * behavior detection per Tier 2 behavior whose execution hit. Capped at
 * {@link MAX_DETECTIONS}, matching `detectionSchema`'s own cap. Behavior
 * detections go first so the cap trims IOC buckets (which Tier 1 already caps
 * at 30 and can fill on its own), never the technique this entry exists for.
 */
export const deriveDetections = (
  huntResult: DeriveDetectionsHuntResult | undefined,
  events: readonly SseEventRef[],
  options: DeriveDetectionsOptions = {}
): SseDetection[] => {
  if (!huntResult) return [];

  const hasBehaviorHit = (huntResult.tier2?.behaviors ?? []).some(
    (behavior) => behavior.execution?.hit === true
  );

  const { detections: iocDetections, iocPairs } = buildIocDetections(
    huntResult,
    events,
    hasBehaviorHit
  );

  const behaviorDetections = detectionsFromBehaviors(
    huntResult.tier2?.behaviors ?? [],
    iocPairs,
    options.techniqueId
  );

  return [...behaviorDetections, ...iocDetections].slice(0, MAX_DETECTIONS);
};
