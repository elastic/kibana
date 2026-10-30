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
 * How long a fingerprint may point at an Investigation that does not exist yet.
 * The review is dispatched after the fingerprint is written, so a competing run
 * can observe that gap. Older than this, the Investigation was never created.
 */
export const INVESTIGATION_PENDING_MS = 15 * 60 * 1000;
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
  /**
   * `user@host` for a host and user seen on the same alert. Absent on a fingerprint
   * written before pairs were stored.
   */
  entityPairs?: readonly string[];
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
  /**
   * Alerts the review judged. Frozen at creation. Absent on a fingerprint written
   * before the field existed; those fall back to `alertIds`.
   */
  analyzedAlertIds?: readonly string[];
  /** Uncapped count. `alertIds` itself stops at `STORED_ALERT_ID_CAP`. */
  alertCount?: number;
  /** When the fingerprint document was written. Absent on a record read without `@timestamp`. */
  writtenAt?: string;
  expiresAt?: string;
  seqNo?: number;
  primaryTerm?: number;
}

export interface InvestigationMeta {
  status?: string;
  closeReason?: string;
  verdict?: string;
  /** The conversation API failed. A 404 leaves this unset and the meta absent. */
  unreadable?: boolean;
}

export type DispositionKind = 'review' | 'review_linked' | 'attach';

/** Why a new review is journaled against an earlier Investigation. */
export type RelatedLinkReason =
  | ''
  | 'false_positive'
  | 'closed'
  | 'builtin_account'
  | 'proposal_expired'
  | 'analysis_failed'
  | 'investigation_missing';

export interface Disposition {
  kind: DispositionKind;
  investigationId: string;
  relatedInvestigationId: string;
  relatedLinkReason: RelatedLinkReason;
  tagCorrelatedAlerts: boolean;
  /** Tag `az:ad_fp_chain` instead of `az:ad_correlated`. Closed false-positive attach only. */
  tagFpChainAlerts: boolean;
  journalAlertsRetired: boolean;
  /**
   * Rewrite the matched fingerprint onto this attack, and only while it still
   * points at the earlier Investigation. Set when that Investigation is missing
   * and the fingerprint is already older than the pending window.
   */
  retargetFingerprint?: boolean;
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
 * Alerts a false-positive continuation may retire. A missing field is a fingerprint
 * from before the field existed, whose `alertIds` had not yet been extended.
 */
export const analyzedIdsOf = (stored: StoredFingerprint): readonly string[] =>
  stored.analyzedAlertIds ?? stored.alertIds;

/** Ids present in both lists, in sorted order. */
export const sharedIds = (left: readonly string[], right: readonly string[]): string[] => {
  const allowed = new Set(right);
  return uniqueSorted(left).filter((id) => allowed.has(id));
};

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

/** The user as seen on that host. Service accounts stay qualified, so `root` on two hosts is not one user. */
export const hostUserPair = (host: string, user: string): string => `${user}@${host}`;

const sharedValues = (left: readonly string[], right: readonly string[]): string[] => {
  const rightSet = new Set(right);
  return [...new Set(left)].filter((value) => rightSet.has(value));
};

/**
 * A directory user id is `user.name`. A local user id is `user.name@host.name`, the same
 * string as the pair. The host is the segment after the last `@`.
 */
const userInPair = (userId: string, pair: string): boolean => {
  if (userId === pair) {
    return true;
  }
  const splitAt = pair.lastIndexOf('@');
  return splitAt > 0 && pair.slice(0, splitAt) === userId;
};

/**
 * Accounts that appear on almost every alert from a host. A pair of one of these
 * and a host is the host alone, so it does not identify an attack across runs.
 */
const BUILTIN_ACCOUNT_NAMES = new Set([
  'system',
  'local service',
  'network service',
  'administrator',
  'root',
  's-1-5-18', // Local System
  's-1-5-19', // Local Service
  's-1-5-20', // Network Service
]);

/** `NT AUTHORITY\\SYSTEM@host` and `SYSTEM@host` both reduce to `system`. */
const accountName = (value: string): string => {
  const trimmed = value.trim();
  const at = trimmed.lastIndexOf('@');
  const withoutHost = at > 0 ? trimmed.slice(0, at) : trimmed;
  const leaf = withoutHost.split('\\').pop() ?? withoutHost;
  return leaf.trim().toLowerCase();
};

const builtinAccount = (value: string): boolean => BUILTIN_ACCOUNT_NAMES.has(accountName(value));

/**
 * True when the attacks match across runs only because they share a built-in
 * account on the same host. Shared alerts or a named user are a real link.
 */
export const linksOnlyByBuiltinAccount = (
  left: AttackMatchFields,
  right: AttackMatchFields
): boolean => {
  if (alertOverlap(left.alertIds, right.alertIds) || !entityMatch(left, right, false)) {
    return false;
  }
  const leftPairs = left.entityPairs ?? [];
  const rightPairs = right.entityPairs ?? [];
  if (leftPairs.length > 0 && rightPairs.length > 0) {
    const pairs = sharedValues(leftPairs, rightPairs);
    // A local `bob@host` and a directory `bob` build the same raw pair. That pair
    // is a named user only when a user id shared by both attacks belongs to it.
    const sharedUsers = sharedValues(left.userEntityIds, right.userEntityIds);
    const linkedPairs =
      left.userEntityIds.length > 0 && right.userEntityIds.length > 0
        ? pairs.filter((pair) => sharedUsers.some((userId) => userInPair(userId, pair)))
        : pairs;
    return linkedPairs.length > 0 && linkedPairs.every((pair) => builtinAccount(pair));
  }
  const users = sharedValues(left.userEntityIds, right.userEntityIds);
  return users.length > 0 && users.every((user) => builtinAccount(user));
};

/**
 * A shared host and the user seen on that host, within the chain window.
 * Tactics are allowed to differ: a later phase is a continuation, not a new attack.
 * A host with no user matches only inside the same worker run. A fingerprint that
 * has no pairs yet still matches on a shared host and a shared user.
 */
export const entityMatch = (
  left: AttackMatchFields,
  right: AttackMatchFields,
  sameRun: boolean
): boolean => {
  const leftPairs = left.entityPairs ?? [];
  const rightPairs = right.entityPairs ?? [];
  if (leftPairs.length > 0 && rightPairs.length > 0) {
    if (!timeClose(left, right)) {
      return false;
    }
    const pairs = sharedValues(leftPairs, rightPairs);
    if (pairs.length === 0) {
      return false;
    }
    // A local `Administrator@host` and a directory `Administrator` build the same
    // raw pair. The shared normalized user has to be one of those pair's users.
    // Another user who appears somewhere in both attacks does not vouch for the pair.
    if (left.userEntityIds.length > 0 && right.userEntityIds.length > 0) {
      return sharedValues(left.userEntityIds, right.userEntityIds).some((userId) =>
        pairs.some((pair) => userInPair(userId, pair))
      );
    }
    return true;
  }
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
 * even when C is no longer close to A. An attack that matches more than one group
 * merges those groups. Comparison uses `sameRun: true`, so a host with no user can
 * join inside this run.
 */
export const clusterNewAttacks = (attacks: readonly AttackSignals[]): AttackSignals[][] => {
  const groups: AttackSignals[][] = [];
  for (const attack of [...attacks].sort(byTimeThenId)) {
    const hitIndexes = groups.flatMap((candidate, index) =>
      candidate.some((member) => sameAttack(member, attack, true)) ? [index] : []
    );
    if (hitIndexes.length === 0) {
      groups.push([attack]);
    } else {
      const [keep, ...rest] = hitIndexes;
      const merged = [...groups[keep], ...rest.flatMap((index) => groups[index]), attack];
      merged.sort(byTimeThenId);
      groups[keep] = merged;
      for (const index of [...rest].sort((left, right) => right - left)) {
        groups.splice(index, 1);
      }
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
    entityPairs: uniqueSorted(group.flatMap((attack) => attack.entityPairs ?? [])),
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
 * unrelated entity-less attacks do not share one document. `distinctKey` is the new
 * Investigation id when that canonical key already belongs to a fingerprint this run
 * must not join.
 */
export const fingerprintId = (
  spaceId: string,
  attack: AttackSignals,
  distinctKey?: string
): string => {
  const hosts = uniqueSorted(attack.hostEntityIds);
  const users = uniqueSorted(attack.userEntityIds);
  const material =
    hosts.length === 0 && users.length === 0
      ? `${spaceId}|${attack.attackId}`
      : `${spaceId}|${hosts.join(',')}|${users.join(',')}|${uniqueSorted(attack.tactics).join(
          ','
        )}|${hourBucket(attack.firstAlertAt)}`;
  const keyed =
    distinctKey === undefined || distinctKey.length === 0 ? material : `${material}|${distinctKey}`;
  return createHash('sha256').update(keyed).digest('hex');
};

const NO_CLASSIFICATION_VERDICT = 'NO CLASSIFICATION';
const GATE_FAILED_VERDICT = 'GATE FAILED';
const EXPIRED_PROPOSAL_VERDICT = 'expired with no decision';

const analysisFailed = (investigation: InvestigationMeta): boolean => {
  const verdict = investigation.verdict ?? '';
  return verdict.includes(NO_CLASSIFICATION_VERDICT) || verdict.includes(GATE_FAILED_VERDICT);
};

const proposalExpired = (investigation: InvestigationMeta): boolean =>
  (investigation.verdict ?? '').includes(EXPIRED_PROPOSAL_VERDICT);

/**
 * An open Investigation that was already handed to forensics tags a continuation
 * `az:ad_correlated`. A review still waiting, and a gate still open, do not:
 * the decision has not been made. Closed, expired, and failed Investigations
 * are not attached, so they never reach this.
 */
export const tagCorrelatedAlerts = (investigation: InvestigationMeta | undefined): boolean =>
  (investigation?.verdict ?? '').includes(HANDED_OFF_VERDICT);

/**
 * The attach journals alert retirement only when the Investigation was already
 * handed off. That verdict is the record that the escalation was approved.
 */
export const journalAlertsRetired = (investigation: InvestigationMeta | undefined): boolean =>
  (investigation?.verdict ?? '').includes(HANDED_OFF_VERDICT);

/**
 * True while the review that wrote this fingerprint may not have created the
 * Investigation yet. A missing Investigation older than that is not in flight.
 */
export const investigationStillPending = (stored: StoredFingerprint, now: Date): boolean => {
  if (stored.writtenAt === undefined) {
    return false;
  }
  const written = Date.parse(stored.writtenAt);
  if (Number.isNaN(written)) {
    return false;
  }
  const age = Math.abs(now.getTime() - written);
  return age <= INVESTIGATION_PENDING_MS;
};

/**
 * `review` opens a new Investigation and runs FP/TP. `review_linked` does that and
 * journals the earlier Investigation it did not join. `attach` skips FP/TP.
 */
export const disposition = (
  canonical: AttackSignals,
  stored: StoredFingerprint | undefined,
  investigation: InvestigationMeta | undefined,
  // Members of the same-run group. A match on any member stands: the union of their
  // alerts can fall under the overlap ratio even though one phase already matched.
  group: readonly AttackMatchFields[] = [canonical],
  now: Date = new Date()
): Disposition => {
  const freshInvestigationId = investigationIdFromAttackId(canonical.attackId);
  const matched = stored !== undefined && group.some((member) => sameAttack(member, stored, false));
  const review = {
    kind: 'review' as const,
    investigationId: freshInvestigationId,
    relatedInvestigationId: '',
    relatedLinkReason: '' as const,
    tagCorrelatedAlerts: false,
    tagFpChainAlerts: false,
    journalAlertsRetired: false,
  };
  // A missing Investigation is not a match to attach to, unless this fingerprint
  // was just written and its review has not created the conversation yet.
  if (!matched || stored === undefined) {
    return review;
  }

  // A 5xx, a timeout, or a privilege error is not a missing Investigation.
  // Retargeting here would rewrite a fingerprint that may still be live.
  if (investigation?.unreadable === true) {
    return review;
  }

  const sharesAlerts = group.some((member) => alertOverlap(member.alertIds, stored.alertIds));
  const onlyBuiltin =
    !sharesAlerts &&
    group.every(
      (member) => !sameAttack(member, stored, false) || linksOnlyByBuiltinAccount(member, stored)
    );
  const closedFalsePositive =
    investigation?.status === 'closed' && investigation.closeReason === 'false_positive';
  const linkable = investigation !== undefined || investigationStillPending(stored, now);
  if (onlyBuiltin && linkable) {
    return {
      kind: 'review_linked',
      investigationId: freshInvestigationId,
      relatedInvestigationId: stored.investigationId,
      relatedLinkReason: closedFalsePositive ? 'false_positive' : 'builtin_account',
      tagCorrelatedAlerts: false,
      tagFpChainAlerts: false,
      journalAlertsRetired: false,
    };
  }

  if (investigation === undefined) {
    if (!investigationStillPending(stored, now)) {
      // A built-in account still does not join. Retargeting would hand it this chain.
      if (onlyBuiltin) {
        return review;
      }
      return {
        kind: 'review_linked',
        investigationId: freshInvestigationId,
        relatedInvestigationId: stored.investigationId,
        relatedLinkReason: 'investigation_missing',
        tagCorrelatedAlerts: false,
        tagFpChainAlerts: false,
        journalAlertsRetired: false,
        retargetFingerprint: true,
      };
    }
    return {
      kind: 'attach',
      investigationId: stored.investigationId,
      relatedInvestigationId: '',
      relatedLinkReason: '',
      tagCorrelatedAlerts: false,
      tagFpChainAlerts: false,
      journalAlertsRetired: false,
    };
  }

  // A closed Investigation takes no more attachments. The later attack is reviewed
  // on its own, with a note naming this one. An expiry and a failed analysis stay
  // open, and a later attack is reviewed the same way: nobody is waiting on them.
  if (investigation.status === 'closed') {
    return {
      kind: 'review_linked',
      investigationId: freshInvestigationId,
      relatedInvestigationId: stored.investigationId,
      relatedLinkReason: closedFalsePositive ? 'false_positive' : 'closed',
      tagCorrelatedAlerts: false,
      tagFpChainAlerts: false,
      journalAlertsRetired: false,
    };
  }
  if (analysisFailed(investigation) || proposalExpired(investigation)) {
    return {
      kind: 'review_linked',
      investigationId: freshInvestigationId,
      relatedInvestigationId: stored.investigationId,
      relatedLinkReason: analysisFailed(investigation) ? 'analysis_failed' : 'proposal_expired',
      tagCorrelatedAlerts: false,
      tagFpChainAlerts: false,
      journalAlertsRetired: false,
    };
  }

  return {
    kind: 'attach',
    investigationId: stored.investigationId,
    relatedInvestigationId: '',
    relatedLinkReason: '',
    tagCorrelatedAlerts: tagCorrelatedAlerts(investigation),
    tagFpChainAlerts: false,
    journalAlertsRetired: journalAlertsRetired(investigation),
  };
};

/** Stored fingerprints this group matches. The caller ranks them. */
export const matchedFingerprints = (
  group: readonly AttackMatchFields[],
  stored: readonly StoredFingerprint[]
): StoredFingerprint[] =>
  stored.filter((item) => group.some((member) => sameAttack(member, item, false)));

export const bestStoredFingerprint = (
  canonical: AttackMatchFields,
  stored: readonly StoredFingerprint[],
  investigations?: ReadonlyMap<string, InvestigationMeta | undefined>,
  now: Date = new Date()
): StoredFingerprint | undefined => {
  const matches = stored.filter((item) => sameAttack(canonical, item, false));
  return rankStoredFingerprints(canonical.alertIds, matches, investigations, now);
};

/**
 * A stored fingerprint continues the group when any phase matches it. Phases of one
 * chain can sit further apart than the window between the first phase and the last.
 * With Investigation state, a fingerprint you can still join ranks ahead of a
 * closed, expired, or failed one, and ahead of one whose Investigation never appeared.
 */
export const bestStoredForGroup = (
  group: readonly AttackMatchFields[],
  stored: readonly StoredFingerprint[],
  investigations?: ReadonlyMap<string, InvestigationMeta | undefined>,
  now: Date = new Date()
): StoredFingerprint | undefined => {
  const matches = matchedFingerprints(group, stored);
  const alertIds = uniqueSorted(group.flatMap((member) => member.alertIds));
  return rankStoredFingerprints(alertIds, matches, investigations, now);
};

/**
 * Lower ranks first. `joinable` is a missing Investigation still inside 15 minutes,
 * or an open one that is not finished. `retarget` is missing and already older than
 * that. `finished` is closed, expired, analysis failed, gate failed, or unreadable.
 */
const JOIN_TIER = {
  joinable: 0,
  retarget: 1,
  finished: 2,
} as const;

const joinTier = (
  stored: StoredFingerprint,
  investigations: ReadonlyMap<string, InvestigationMeta | undefined> | undefined,
  now: Date
): number => {
  // No Investigation state to compare, so every fingerprint shares one rank and
  // alert overlap keeps the previous order.
  if (investigations === undefined) {
    return JOIN_TIER.joinable;
  }
  const investigation = investigations.get(stored.investigationId);
  // An unread Investigation is not a candidate to join or to retarget. A
  // fingerprint that can still be joined ranks ahead of it.
  if (investigation?.unreadable === true) {
    return JOIN_TIER.finished;
  }
  if (investigation === undefined) {
    return investigationStillPending(stored, now) ? JOIN_TIER.joinable : JOIN_TIER.retarget;
  }
  if (
    investigation.status === 'closed' ||
    analysisFailed(investigation) ||
    proposalExpired(investigation)
  ) {
    return JOIN_TIER.finished;
  }
  return JOIN_TIER.joinable;
};

const rankStoredFingerprints = (
  alertIds: readonly string[],
  matches: StoredFingerprint[],
  investigations: ReadonlyMap<string, InvestigationMeta | undefined> | undefined,
  now: Date
): StoredFingerprint | undefined => {
  matches.sort((left, right) => {
    const tier = joinTier(left, investigations, now) - joinTier(right, investigations, now);
    if (tier !== 0) {
      return tier;
    }
    const overlap =
      intersectionSize(right.alertIds, alertIds) - intersectionSize(left.alertIds, alertIds);
    if (overlap !== 0) {
      return overlap;
    }
    return (right.expiresAt ?? '').localeCompare(left.expiresAt ?? '');
  });
  return matches[0];
};
