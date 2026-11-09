/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntForThreatHit, HuntForThreatPerIoc, HuntResult } from '@kbn/alertzero-common';
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

const dedupeDefined = (values: ReadonlyArray<string | undefined>): string[] => [
  ...new Set(
    values
      .filter((value): value is string => Boolean(value))
      .map((value) => value.slice(0, MAX_NAME_LENGTH))
  ),
];

/** Matched IOC entries on one event that name `value` (prefer `matched.iocs`). */
const matchedIocsForValue = (
  event: SseEventRef,
  value: string
): Array<{ type: string; value: string; field: string }> => {
  if (event.matched?.iocs && event.matched.iocs.length > 0) {
    return event.matched.iocs.filter((ioc) => ioc.value === value && Boolean(ioc.field));
  }
  if (event.matched?.ioc?.value === value && event.matched.field) {
    return [
      {
        type: event.matched.ioc.type,
        value: event.matched.ioc.value,
        field: event.matched.field,
      },
    ];
  }
  return [];
};

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

interface IocHitGroup {
  type: string;
  value: string;
  field: string;
  hits: HuntForThreatHit[];
}

/**
 * Groups Tier 1 hits by every IOC each one matched (`matched.iocs`, falling
 * back to the single `matched.ioc`/`matched.field` pair for older hits). One
 * hit can land in more than one group when it matched several IOCs.
 */
const groupHitsByIoc = (hits: readonly HuntForThreatHit[]): IocHitGroup[] => {
  const groups = new Map<string, IocHitGroup>();
  for (const hit of hits) {
    const matchedIocs =
      hit.matched?.iocs && hit.matched.iocs.length > 0
        ? hit.matched.iocs
        : hit.matched?.ioc?.type && hit.matched.ioc.value
        ? [
            {
              type: hit.matched.ioc.type,
              value: hit.matched.ioc.value,
              field: hit.matched.field ?? '',
            },
          ]
        : [];
    for (const ioc of matchedIocs) {
      const key = `${ioc.type}:${ioc.value}`;
      const group = groups.get(key);
      if (group) {
        group.hits.push(hit);
      } else {
        groups.set(key, { type: ioc.type, value: ioc.value, field: ioc.field, hits: [hit] });
      }
    }
  }
  return [...groups.values()];
};

const firstAndLastTimestamp = (
  hits: readonly HuntForThreatHit[]
): { first?: string; last?: string } => {
  const timestamps = dedupeDefined(hits.map((hit) => hit.timestamp)).sort();
  return timestamps.length > 0
    ? { first: timestamps[0], last: timestamps[timestamps.length - 1] }
    : {};
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
    return {
      id: `ioc:${entry.type}:${entry.value}`,
      kind: 'ioc',
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

interface IocEventGroup {
  type: string;
  value: string;
  field: string;
  events: SseEventRef[];
}

/**
 * Groups cited SSE events by every IOC each one matched (`matched.iocs`, else
 * the single `matched.ioc`/`matched.field` pair). Used for old stored SSEs that
 * carry neither `per_ioc` nor Tier 1 `hits` on the persisted hunt_result (D13).
 */
const groupEventsByIoc = (events: readonly SseEventRef[]): IocEventGroup[] => {
  const groups = new Map<string, IocEventGroup>();
  for (const event of events) {
    const matchedIocs =
      event.matched?.iocs && event.matched.iocs.length > 0
        ? event.matched.iocs
        : event.matched?.ioc?.type && event.matched.ioc.value
        ? [
            {
              type: event.matched.ioc.type,
              value: event.matched.ioc.value,
              field: event.matched.field ?? '',
            },
          ]
        : [];
    for (const ioc of matchedIocs) {
      const key = `${ioc.type}:${ioc.value}`;
      const group = groups.get(key);
      if (group) {
        group.events.push(event);
      } else {
        groups.set(key, {
          type: ioc.type,
          value: ioc.value,
          field: ioc.field,
          events: [event],
        });
      }
    }
  }
  return [...groups.values()];
};

const firstAndLastEventTimestamp = (
  events: readonly SseEventRef[]
): { first?: string; last?: string } => {
  const timestamps = dedupeDefined(events.map((event) => event.timestamp)).sort();
  return timestamps.length > 0
    ? { first: timestamps[0], last: timestamps[timestamps.length - 1] }
    : {};
};

/** One IOC detection built from a group of sampled Tier 1 hits sharing an IOC. */
const detectionFromHitGroup = (group: IocHitGroup, hasBehaviorHit: boolean): SseDetection => {
  const { first, last } = firstAndLastTimestamp(group.hits);
  const hosts = dedupeDefined(group.hits.map((hit) => hit.host)).slice(0, MAX_NAMES);
  const users = dedupeDefined(group.hits.map((hit) => hit.user)).slice(0, MAX_NAMES);
  return {
    id: `ioc:${group.type}:${group.value}`,
    kind: 'ioc',
    field: group.field,
    basis: classifyBasis([{ type: group.type, value: group.value }], hasBehaviorHit),
    matched_on: [{ field: group.field, value: group.value }],
    ...(hosts.length > 0 ? { hosts, host_count: hosts.length } : {}),
    ...(users.length > 0 ? { users, user_count: users.length } : {}),
    total: group.hits.length,
    ...(first ? { first_seen: first } : {}),
    ...(last ? { last_seen: last } : {}),
    from_sample: true,
  };
};

/** One IOC detection built from cited SSE events sharing an IOC (old-payload path). */
const detectionFromEventGroup = (group: IocEventGroup, hasBehaviorHit: boolean): SseDetection => {
  const { first, last } = firstAndLastEventTimestamp(group.events);
  const hosts = dedupeDefined(group.events.map((event) => event.host)).slice(0, MAX_NAMES);
  const users = dedupeDefined(group.events.map((event) => event.user)).slice(0, MAX_NAMES);
  return {
    id: `ioc:${group.type}:${group.value}`,
    kind: 'ioc',
    field: group.field,
    basis: classifyBasis([{ type: group.type, value: group.value }], hasBehaviorHit),
    matched_on: [{ field: group.field, value: group.value }],
    ...(hosts.length > 0 ? { hosts, host_count: hosts.length } : {}),
    ...(users.length > 0 ? { users, user_count: users.length } : {}),
    total: group.events.length,
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
    const groups = groupHitsByIoc(hits);
    return {
      detections: groups.map((group) => detectionFromHitGroup(group, hasBehaviorHit)),
      iocPairs: groups.map((group) => ({ type: group.type, value: group.value })),
    };
  }
  const eventGroups = groupEventsByIoc(events);
  return {
    detections: eventGroups.map((group) => detectionFromEventGroup(group, hasBehaviorHit)),
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
        id: `behavior:${behavior.technique_id}`,
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
 * Builds the SSE's `detections[]` from a hunt result and its event refs
 * (plan D9): one IOC detection per `tier1.per_ioc` bucket, falling back to
 * grouping sampled hits by matched IOC when Tier 1 has no aggregation, plus
 * one behavior detection per Tier 2 behavior whose execution hit. Capped at
 * {@link MAX_DETECTIONS}, matching `detectionSchema`'s own cap.
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

  return [...iocDetections, ...behaviorDetections].slice(0, MAX_DETECTIONS);
};
