/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

/** Shared alerts must be at least this fraction of the smaller set. */
export const ALERT_OVERLAP_RATIO = 0.5;
/** And at least this many alerts. One shared alert is not the same attack. */
export const ALERT_OVERLAP_MIN = 2;
/** A fingerprint matches only until this long after its newest alert. */
export const FINGERPRINT_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * A later phase or a repeat of the same host and user joins the chain while the
 * gap since the previous alerts is inside the fingerprint lifetime.
 */
export const ENTITY_GAP_MS = FINGERPRINT_TTL_MS;
/** `attributes` arrays on a knowledge indicator are capped at 100 values. */
export const STORED_ALERT_ID_CAP = 100;

const HANDED_OFF_VERDICT = 'Handed off';

export interface AttackMatchFields {
  alertIds: readonly string[];
  hostEntityIds: readonly string[];
  userEntityIds: readonly string[];
  tactics: readonly string[];
  firstAlertAt?: string;
  lastAlertAt?: string;
}

export interface AttackSignals extends AttackMatchFields {
  attackId: string;
  title: string;
  summaryMarkdown: string;
  /**
   * De-anonymized title and summary for the fingerprint. Reviews keep `title` and
   * `summaryMarkdown`, which stay anonymized.
   */
  fingerprintTitle?: string;
  fingerprintSummary?: string;
}

export interface StoredFingerprint extends AttackMatchFields {
  id: string;
  investigationId: string;
  expiresAt?: string;
}

export interface InvestigationMeta {
  status?: string;
  closeReason?: string;
  verdict?: string;
}

export type DispositionKind = 'review' | 'review_linked' | 'attach';

export interface Disposition {
  kind: DispositionKind;
  investigationId: string;
  relatedInvestigationId: string;
  tagCorrelatedAlerts: boolean;
  journalAlertsRetired: boolean;
}

const intersectionSize = (left: readonly string[], right: readonly string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const rightSet = new Set(right);
  let shared = 0;
  for (const value of new Set(left)) {
    if (rightSet.has(value)) {
      shared += 1;
    }
  }
  return shared;
};

export const uniqueSorted = (values: readonly string[]): string[] => [...new Set(values)].sort();

/**
 * True when the sets share at least two alerts and at least half of the smaller set.
 */
export const alertOverlap = (left: readonly string[], right: readonly string[]): boolean => {
  const shared = intersectionSize(left, right);
  const smaller = Math.min(new Set(left).size, new Set(right).size);
  return shared >= ALERT_OVERLAP_MIN && smaller > 0 && shared / smaller >= ALERT_OVERLAP_RATIO;
};

const timeRange = (
  first: string | undefined,
  last: string | undefined
): { start: number; end: number } | undefined => {
  const start = first === undefined ? Number.NaN : Date.parse(first);
  const end = last === undefined ? start : Date.parse(last);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return undefined;
  }
  return { start: Math.min(start, end), end: Math.max(start, end) };
};

/**
 * True when both attacks have timestamps and the ranges overlap or the gap is within
 * the fingerprint lifetime. A later phase can sit hours after the previous one.
 * Missing timestamps fail the entity rule only; alert overlap does not need them.
 */
export const timeClose = (left: AttackMatchFields, right: AttackMatchFields): boolean => {
  const leftRange = timeRange(left.firstAlertAt, left.lastAlertAt);
  const rightRange = timeRange(right.firstAlertAt, right.lastAlertAt);
  if (leftRange === undefined || rightRange === undefined) {
    return false;
  }
  const gap =
    leftRange.end < rightRange.start
      ? rightRange.start - leftRange.end
      : rightRange.end < leftRange.start
      ? leftRange.start - rightRange.end
      : 0;
  return gap <= ENTITY_GAP_MS;
};

/**
 * Host and user must both be shared, and the alerts must be within the chain window.
 * Tactics are allowed to differ: a later phase is a continuation, not a new attack.
 * A host with no user matches only inside the same worker run.
 */
export const entityMatch = (
  left: AttackMatchFields,
  right: AttackMatchFields,
  sameRun: boolean
): boolean => {
  const shareHost = intersectionSize(left.hostEntityIds, right.hostEntityIds) >= 1;
  const shareUser = intersectionSize(left.userEntityIds, right.userEntityIds) >= 1;
  if (!shareHost || !timeClose(left, right)) {
    return false;
  }
  if (shareUser) {
    return true;
  }
  return sameRun && (left.userEntityIds.length === 0 || right.userEntityIds.length === 0);
};

export const sameAttack = (
  left: AttackMatchFields,
  right: AttackMatchFields,
  sameRun: boolean
): boolean => alertOverlap(left.alertIds, right.alertIds) || entityMatch(left, right, sameRun);

const byTimeThenId = (left: AttackSignals, right: AttackSignals): number => {
  const leftTime =
    left.firstAlertAt === undefined ? Number.POSITIVE_INFINITY : Date.parse(left.firstAlertAt);
  const rightTime =
    right.firstAlertAt === undefined ? Number.POSITIVE_INFINITY : Date.parse(right.firstAlertAt);
  const leftSort = Number.isNaN(leftTime) ? Number.POSITIVE_INFINITY : leftTime;
  const rightSort = Number.isNaN(rightTime) ? Number.POSITIVE_INFINITY : rightTime;
  if (leftSort !== rightSort) {
    return leftSort - rightSort;
  }
  if (left.attackId < right.attackId) {
    return -1;
  }
  if (left.attackId > right.attackId) {
    return 1;
  }
  return 0;
};

/**
 * Groups attacks from one worker run. The earliest attack in a group is canonical.
 * A phase joins when it continues any member of the group, so A then B then C chain
 * even when C is no longer close to A. Comparison uses `sameRun: true`, so a host
 * with no user can join inside this run.
 */
export const clusterNewAttacks = (attacks: readonly AttackSignals[]): AttackSignals[][] => {
  const groups: AttackSignals[][] = [];
  for (const attack of [...attacks].sort(byTimeThenId)) {
    const group = groups.find((candidate) =>
      candidate.some((member) => sameAttack(member, attack, true))
    );
    if (group) {
      group.push(attack);
    } else {
      groups.push([attack]);
    }
  }
  return groups;
};

const earlierIso = (left: string | undefined, right: string | undefined): string | undefined => {
  const leftTime = left === undefined ? Number.NaN : Date.parse(left);
  const rightTime = right === undefined ? Number.NaN : Date.parse(right);
  if (Number.isNaN(leftTime)) {
    return Number.isNaN(rightTime) ? undefined : right;
  }
  if (Number.isNaN(rightTime)) {
    return left;
  }
  return leftTime <= rightTime ? left : right;
};

const laterIso = (left: string | undefined, right: string | undefined): string | undefined => {
  const leftTime = left === undefined ? Number.NaN : Date.parse(left);
  const rightTime = right === undefined ? Number.NaN : Date.parse(right);
  if (Number.isNaN(leftTime)) {
    return Number.isNaN(rightTime) ? undefined : right;
  }
  if (Number.isNaN(rightTime)) {
    return left;
  }
  return leftTime >= rightTime ? left : right;
};

/**
 * One description of a chain: the canonical attack's identity, and the hosts, users,
 * tactics, alerts, and time span of every phase in the group.
 */
export const chainSpan = (group: readonly AttackSignals[]): AttackSignals => {
  const canonical = group[0];
  return {
    ...canonical,
    alertIds: uniqueSorted(group.flatMap((attack) => attack.alertIds)),
    hostEntityIds: uniqueSorted(group.flatMap((attack) => attack.hostEntityIds)),
    userEntityIds: uniqueSorted(group.flatMap((attack) => attack.userEntityIds)),
    tactics: uniqueSorted(group.flatMap((attack) => attack.tactics)),
    firstAlertAt: group.reduce<string | undefined>(
      (earliest, attack) => earlierIso(earliest, attack.firstAlertAt ?? attack.lastAlertAt),
      undefined
    ),
    lastAlertAt: group.reduce<string | undefined>(
      (latest, attack) => laterIso(latest, attack.lastAlertAt ?? attack.firstAlertAt),
      undefined
    ),
  };
};

/**
 * The review workflow derives the Investigation id with this slice of the attack id.
 * Kept here so a same-run sibling addresses the conversation the canonical review creates.
 */
export const investigationIdFromAttackId = (attackId: string): string =>
  `${attackId.slice(0, 8)}-${attackId.slice(8, 12)}-8${attackId.slice(12, 15)}-8${attackId.slice(
    15,
    18
  )}-${attackId.slice(18, 30)}`;

const hourBucket = (iso: string | undefined): string => {
  if (iso === undefined) {
    return 'unknown';
  }
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return 'unknown';
  }
  return new Date(Math.floor(time / 3_600_000) * 3_600_000).toISOString();
};

/**
 * Create-only document id. Attacks with no host and no user include the attack id so
 * unrelated entity-less attacks do not share one document.
 */
export const fingerprintId = (spaceId: string, attack: AttackSignals): string => {
  const hosts = uniqueSorted(attack.hostEntityIds);
  const users = uniqueSorted(attack.userEntityIds);
  const material =
    hosts.length === 0 && users.length === 0
      ? `${spaceId}|${attack.attackId}`
      : `${spaceId}|${hosts.join(',')}|${users.join(',')}|${uniqueSorted(attack.tactics).join(
          ','
        )}|${hourBucket(attack.firstAlertAt)}`;
  return createHash('sha256').update(material).digest('hex');
};

export const tagCorrelatedAlerts = (investigation: InvestigationMeta | undefined): boolean => {
  if (investigation === undefined) {
    return false;
  }
  if ((investigation.verdict ?? '').includes(HANDED_OFF_VERDICT)) {
    return true;
  }
  return investigation.status === 'closed' && investigation.closeReason !== 'false_positive';
};

/**
 * The review journals alert retirement only for a true-positive or inconclusive
 * verdict. The record of that on the Investigation is the handed-off verdict,
 * written when that escalation is approved. A declined or other close still tags.
 */
export const journalAlertsRetired = (investigation: InvestigationMeta | undefined): boolean =>
  (investigation?.verdict ?? '').includes(HANDED_OFF_VERDICT);

/**
 * `review` opens a new Investigation and runs FP/TP. `review_linked` does that and
 * journals the closed false-positive it did not join. `attach` skips FP/TP.
 */
export const disposition = (
  canonical: AttackSignals,
  stored: StoredFingerprint | undefined,
  investigation: InvestigationMeta | undefined
): Disposition => {
  const freshInvestigationId = investigationIdFromAttackId(canonical.attackId);
  if (stored === undefined || !sameAttack(canonical, stored, false)) {
    return {
      kind: 'review',
      investigationId: freshInvestigationId,
      relatedInvestigationId: '',
      tagCorrelatedAlerts: false,
      journalAlertsRetired: false,
    };
  }

  const closedFalsePositive =
    investigation?.status === 'closed' && investigation.closeReason === 'false_positive';
  if (closedFalsePositive && !alertOverlap(canonical.alertIds, stored.alertIds)) {
    return {
      kind: 'review_linked',
      investigationId: freshInvestigationId,
      relatedInvestigationId: stored.investigationId,
      tagCorrelatedAlerts: false,
      journalAlertsRetired: false,
    };
  }

  return {
    kind: 'attach',
    investigationId: stored.investigationId,
    relatedInvestigationId: '',
    tagCorrelatedAlerts: tagCorrelatedAlerts(investigation),
    journalAlertsRetired: journalAlertsRetired(investigation),
  };
};

export const bestStoredFingerprint = (
  canonical: AttackMatchFields,
  stored: readonly StoredFingerprint[]
): StoredFingerprint | undefined => {
  const matches = stored.filter((item) => sameAttack(canonical, item, false));
  return rankStoredFingerprints(canonical.alertIds, matches);
};

/**
 * A stored fingerprint continues the group when any phase matches it. Phases of one
 * chain can sit further apart than the window between the first phase and the last.
 */
export const bestStoredForGroup = (
  group: readonly AttackMatchFields[],
  stored: readonly StoredFingerprint[]
): StoredFingerprint | undefined => {
  const matches = stored.filter((item) => group.some((member) => sameAttack(member, item, false)));
  const alertIds = uniqueSorted(group.flatMap((member) => member.alertIds));
  return rankStoredFingerprints(alertIds, matches);
};

const rankStoredFingerprints = (
  alertIds: readonly string[],
  matches: StoredFingerprint[]
): StoredFingerprint | undefined => {
  matches.sort((left, right) => {
    const overlap =
      intersectionSize(right.alertIds, alertIds) - intersectionSize(left.alertIds, alertIds);
    if (overlap !== 0) {
      return overlap;
    }
    return (right.expiresAt ?? '').localeCompare(left.expiresAt ?? '');
  });
  return matches[0];
};
