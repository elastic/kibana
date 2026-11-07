/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActivityKind } from './event_context';
import type { AlertSeverity } from './hooks/use_entity_relationships';

/**
 * Pure model for the "significance-filtered causal timeline / waterfall".
 *
 * The goal is NOT to render an event log. Given a focus entity's detection
 * alerts and its raw `logs-*` events over a window, we keep only the events
 * that are *significant* — either close in time to an alert, or intrinsically
 * notable pivots (auth logons, notable process creation, outbound network to a
 * new destination, writes to sensitive file paths) — then order everything
 * chronologically and fold consecutive steps into causal chains (same
 * host/user, forward in time) so indentation conveys "this led to that".
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested exhaustively; the React hook/view feed it normalized inputs.
 */

/** Milliseconds an event may sit before/around an alert to count as correlated. */
export const CORRELATION_WINDOW_MS = 15 * 60 * 1000;

/**
 * Max gap between two consecutive significant steps (same host+user) that still
 * reads as the *same* causal chain. Larger gaps start a new chain / root.
 */
export const CHAIN_GAP_MS = 60 * 60 * 1000;

/** Default cap on rendered steps; the rest collapse behind a "show more". */
export const DEFAULT_STEP_CAP = 12;

/** Maximum indentation depth so deep chains stay readable. */
export const MAX_CHAIN_DEPTH = 4;

/** Score at/above which a raw event is considered significant on its own. */
export const SIGNIFICANCE_THRESHOLD = 2;

/** Process names that are notable pivots when created (case-insensitive match). */
export const NOTABLE_PROCESS_NAMES: readonly string[] = [
  'powershell.exe',
  'cmd.exe',
  'rundll32.exe',
  'mshta.exe',
  'wscript.exe',
  'cscript.exe',
  'regsvr32.exe',
  'mstsc.exe',
  'psexec.exe',
  'wmic.exe',
  'certutil.exe',
  'schtasks.exe',
  'net.exe',
  'sudo',
  'ssh',
  'scp',
  'bash',
  'sh',
  'docker',
  'dockerd',
  'nc',
  'ncat',
  'curl',
  'wget',
];

/** File path fragments that mark a write/access as sensitive. */
export const SENSITIVE_PATH_FRAGMENTS: readonly string[] = [
  'lsass',
  '.ssh',
  '.aws',
  '.docker',
  '/etc/shadow',
  '/etc/passwd',
  'sam',
  'ntds',
  'id_rsa',
  'credentials',
  'config.json',
];

/** Normalized alert used by the model. */
export interface TimelineAlertInput {
  id: string;
  /** ES index the document lives in (for raw-log / Discover jumps). */
  index: string | undefined;
  ruleName: string;
  severity: AlertSeverity | undefined;
  /** Epoch ms. */
  timestamp: number;
  host: string | undefined;
  user: string | undefined;
  /** MITRE technique / tactic labels for context, if available. */
  tacticName: string | undefined;
  riskScore: number | undefined;
  processName: string | undefined;
}

/** Normalized raw event used by the model. */
export interface TimelineEventInput {
  id: string;
  /** ES index the document lives in (for raw-log / Discover jumps). */
  index: string | undefined;
  category: ActivityKind;
  action: string | undefined;
  /** Epoch ms. */
  timestamp: number;
  host: string | undefined;
  user: string | undefined;
  processName: string | undefined;
  parentProcessName: string | undefined;
  destinationIp: string | undefined;
  destinationPort: number | undefined;
  destinationDomain: string | undefined;
  sourceIp: string | undefined;
  filePath: string | undefined;
  networkDirection: string | undefined;
}

/** Reason an event survived the significance filter (for UI tooltips / tests). */
export type SignificanceReason =
  | 'alert-correlated'
  | 'auth-logon'
  | 'notable-process'
  | 'outbound-network'
  | 'sensitive-file';

/** A single node in the causal waterfall. */
export interface TimelineStep {
  /** Stable id: `alert:<id>` or `event:<id>`. */
  id: string;
  kind: 'alert' | 'event';
  category: ActivityKind | undefined;
  /** Epoch ms. */
  timestamp: number;
  host: string | undefined;
  user: string | undefined;
  severity: AlertSeverity | undefined;
  /** Human, past-tense action phrase, e.g. "spawned process powershell.exe". */
  label: string;
  /** Concrete target detail (dest, process, file) for the secondary line. */
  detail: string | undefined;
  /** Rule name when this step is (or contributed to) an alert. */
  alertRuleName: string | undefined;
  /** Id of the alert this event contributed to, when correlated. */
  contributedToAlertId: string | undefined;
  /** MITRE tactic / kill-chain phase, when known (drives grouping headers). */
  tacticName: string | undefined;
  /** Why this event was kept (undefined for alerts, which are always kept). */
  reasons: readonly SignificanceReason[];
  significanceScore: number;
  /** Indentation depth in the waterfall (0 = chain root). */
  depth: number;
  /** Underlying document id for the evidence drawer / raw-log jump. */
  refId: string;
  /** ES index of the underlying document (for raw-log / Discover jumps). */
  refIndex: string | undefined;
}

export interface TimelineModel {
  steps: readonly TimelineStep[];
  /** Steps beyond the cap that were collapsed. */
  overflowCount: number;
  totalSignificant: number;
}

export interface BuildTimelineOptions {
  correlationWindowMs?: number;
  chainGapMs?: number;
  stepCap?: number;
  maxDepth?: number;
}

const lower = (value: string | undefined): string => (value ?? '').toLowerCase();

/** True when a process name is on the notable-pivot list. */
export const isNotableProcess = (name: string | undefined): boolean => {
  const normalized = lower(name);
  if (normalized === '') return false;
  return NOTABLE_PROCESS_NAMES.some((notable) => notable === normalized);
};

/** True when a file path touches a sensitive location. */
export const isSensitivePath = (path: string | undefined): boolean => {
  const normalized = lower(path);
  if (normalized === '') return false;
  return SENSITIVE_PATH_FRAGMENTS.some((fragment) => normalized.includes(fragment));
};

const isPrivateIp = (ip: string | undefined): boolean => {
  if (!ip) return false;
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === '::1'
  );
};

/**
 * True for outbound network to a routable (non-RFC1918) destination — a classic
 * "reached out to the internet" pivot. Internal-to-internal flows are common
 * and only kept when they land near an alert.
 */
export const isNotableOutbound = (event: TimelineEventInput): boolean => {
  if (event.category !== 'network') return false;
  const outbound = event.networkDirection === undefined || event.networkDirection === 'outbound';
  return outbound && !isPrivateIp(event.destinationIp) && event.destinationIp !== undefined;
};

/** Nearest alert (same host or user) within the correlation window, if any. */
const nearestCorrelatedAlert = (
  event: TimelineEventInput,
  alerts: readonly TimelineAlertInput[],
  windowMs: number
): TimelineAlertInput | undefined => {
  let best: TimelineAlertInput | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const alert of alerts) {
    const sameEntity =
      (event.host !== undefined && event.host === alert.host) ||
      (event.user !== undefined && event.user === alert.user);
    if (sameEntity) {
      const delta = Math.abs(alert.timestamp - event.timestamp);
      if (delta <= windowMs && delta < bestDelta) {
        best = alert;
        bestDelta = delta;
      }
    }
  }
  return best;
};

/**
 * Scores a raw event's significance and records why. Alert-correlation is the
 * strongest signal; intrinsic pivots stack so an outbound-network event that is
 * also alert-correlated ranks above a lone auth logon.
 */
export const scoreEvent = (
  event: TimelineEventInput,
  alerts: readonly TimelineAlertInput[],
  windowMs: number = CORRELATION_WINDOW_MS
): {
  score: number;
  reasons: SignificanceReason[];
  correlatedAlert: TimelineAlertInput | undefined;
} => {
  const reasons: SignificanceReason[] = [];
  let score = 0;

  const correlatedAlert = nearestCorrelatedAlert(event, alerts, windowMs);
  if (correlatedAlert) {
    reasons.push('alert-correlated');
    score += 3;
  }
  if (event.category === 'authentication' && lower(event.action).includes('logon')) {
    reasons.push('auth-logon');
    score += 2;
  }
  if (event.category === 'process' && isNotableProcess(event.processName)) {
    reasons.push('notable-process');
    score += 2;
  }
  if (isNotableOutbound(event)) {
    reasons.push('outbound-network');
    score += 2;
  }
  if (event.category === 'file' && isSensitivePath(event.filePath)) {
    reasons.push('sensitive-file');
    score += 2;
  }

  return { score, reasons, correlatedAlert };
};

/** Builds the human action phrase + concrete detail for an event step. */
const describeEvent = (
  event: TimelineEventInput
): { label: string; detail: string | undefined } => {
  switch (event.category) {
    case 'authentication':
      return {
        label: 'logged in',
        detail: event.destinationDomain ?? event.host ?? event.sourceIp,
      };
    case 'process':
      return {
        label: event.processName ? `spawned process ${event.processName}` : 'started a process',
        detail: event.parentProcessName ? `parent ${event.parentProcessName}` : event.processName,
      };
    case 'network': {
      const target = event.destinationDomain ?? event.destinationIp;
      const withPort =
        target && event.destinationPort ? `${target}:${event.destinationPort}` : target;
      return { label: withPort ? `reached ${withPort}` : 'network activity', detail: withPort };
    }
    case 'file':
      return {
        label: event.filePath ? `wrote to ${event.filePath}` : 'file activity',
        detail: event.filePath,
      };
    default:
      return { label: 'activity', detail: undefined };
  }
};

const alertToStep = (alert: TimelineAlertInput): TimelineStep => ({
  id: `alert:${alert.id}`,
  kind: 'alert',
  category: undefined,
  timestamp: alert.timestamp,
  host: alert.host,
  user: alert.user,
  severity: alert.severity,
  label: alert.ruleName,
  detail: alert.tacticName ?? alert.processName,
  alertRuleName: alert.ruleName,
  contributedToAlertId: undefined,
  tacticName: alert.tacticName,
  reasons: [],
  significanceScore: 10 + (alert.riskScore ?? 0) / 10,
  depth: 0,
  refId: alert.id,
  refIndex: alert.index,
});

const eventToStep = (
  event: TimelineEventInput,
  score: number,
  reasons: readonly SignificanceReason[],
  correlatedAlert: TimelineAlertInput | undefined
): TimelineStep => {
  const { label, detail } = describeEvent(event);
  return {
    id: `event:${event.id}`,
    kind: 'event',
    category: event.category,
    timestamp: event.timestamp,
    host: event.host,
    user: event.user,
    severity: correlatedAlert?.severity,
    label,
    detail,
    alertRuleName: undefined,
    contributedToAlertId: correlatedAlert?.id,
    tacticName: correlatedAlert?.tacticName,
    reasons,
    significanceScore: score,
    depth: 0,
    refId: event.id,
    refIndex: event.index,
  };
};

/**
 * Window within which two alerts of the same rule on the same entity are
 * treated as one occurrence (detection engines commonly re-fire the same rule).
 */
export const ALERT_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Collapses repeated firings of the same rule for the same entity within
 * {@link ALERT_DEDUPE_WINDOW_MS}, keeping the earliest occurrence so the
 * waterfall shows one node per distinct detection instead of N identical rows.
 */
export const dedupeAlerts = (
  alerts: readonly TimelineAlertInput[],
  windowMs: number = ALERT_DEDUPE_WINDOW_MS
): TimelineAlertInput[] => {
  const ordered = [...alerts].sort((left, right) => left.timestamp - right.timestamp);
  const kept: TimelineAlertInput[] = [];
  const lastSeen = new Map<string, number>();
  for (const candidate of ordered) {
    const key = `${candidate.ruleName}|${candidate.host ?? ''}|${candidate.user ?? ''}`;
    const previous = lastSeen.get(key);
    const isDuplicate = previous !== undefined && candidate.timestamp - previous <= windowMs;
    if (!isDuplicate) {
      lastSeen.set(key, candidate.timestamp);
      kept.push(candidate);
    }
  }
  return kept;
};

/**
 * Window within which repeated identical significant events (same entity,
 * category, and action label) collapse into one — telemetry commonly re-emits
 * the same pivot, and seed data triplicates each. Keeps the earliest so the
 * chain reflects when the behavior first occurred.
 */
export const EVENT_DEDUPE_WINDOW_MS = 20 * 60 * 1000;

/**
 * Collapses repeated identical significant events within
 * {@link EVENT_DEDUPE_WINDOW_MS}, keeping the earliest occurrence (and the
 * strongest correlated-alert linkage seen among the duplicates).
 */
const dedupeEventSteps = (
  steps: readonly TimelineStep[],
  windowMs: number = EVENT_DEDUPE_WINDOW_MS
): TimelineStep[] => {
  const ordered = [...steps].sort((left, right) => left.timestamp - right.timestamp);
  const kept: TimelineStep[] = [];
  const lastSeen = new Map<string, TimelineStep>();
  for (const step of ordered) {
    const key = `${step.host ?? ''}|${step.user ?? ''}|${step.category ?? ''}|${step.label}`;
    const previous = lastSeen.get(key);
    const isDuplicate = !!previous && step.timestamp - previous.timestamp <= windowMs;
    if (isDuplicate) {
      // Fold into the earlier occurrence; prefer keeping an alert linkage.
      if (!previous.contributedToAlertId && step.contributedToAlertId) {
        previous.contributedToAlertId = step.contributedToAlertId;
        previous.severity = step.severity;
      }
    } else {
      const copy = { ...step };
      lastSeen.set(key, copy);
      kept.push(copy);
    }
  }
  return kept;
};

/**
 * Assigns causal indentation depth. Walking chronologically, a step deepens
 * under the previous step when it plausibly *follows* it: same host+user and
 * within `chainGapMs`. A larger gap or an entity switch resets to a new root.
 * Alerts act as chain anchors (depth stays where it is) so contributing events
 * cluster around them. Depth is clamped to `maxDepth`.
 */
export const assignChainDepth = (
  ordered: readonly TimelineStep[],
  chainGapMs: number,
  maxDepth: number
): TimelineStep[] => {
  const result: TimelineStep[] = [];
  let previous: TimelineStep | undefined;
  let currentDepth = 0;
  for (const step of ordered) {
    if (!previous) {
      currentDepth = 0;
    } else {
      const sameEntity = previous.host === step.host && previous.user === step.user;
      const withinGap = step.timestamp - previous.timestamp <= chainGapMs;
      if (sameEntity && withinGap) {
        currentDepth = Math.min(maxDepth, currentDepth + 1);
      } else {
        currentDepth = 0;
      }
    }
    result.push({ ...step, depth: currentDepth });
    previous = { ...step, depth: currentDepth };
  }
  return result;
};

/**
 * Core entry point. Merges alerts (always significant) with the significant
 * subset of raw events, orders chronologically, folds into causal chains, and
 * caps the result. Resilient to empty inputs.
 */
export const buildTimelineModel = (
  alerts: readonly TimelineAlertInput[],
  events: readonly TimelineEventInput[],
  options: BuildTimelineOptions = {}
): TimelineModel => {
  const windowMs = options.correlationWindowMs ?? CORRELATION_WINDOW_MS;
  const chainGapMs = options.chainGapMs ?? CHAIN_GAP_MS;
  const stepCap = options.stepCap ?? DEFAULT_STEP_CAP;
  const maxDepth = options.maxDepth ?? MAX_CHAIN_DEPTH;

  const dedupedAlerts = dedupeAlerts(alerts);
  const alertSteps = dedupedAlerts.map(alertToStep);

  const significantEventSteps: TimelineStep[] = [];
  for (const event of events) {
    const { score, reasons, correlatedAlert } = scoreEvent(event, dedupedAlerts, windowMs);
    if (score >= SIGNIFICANCE_THRESHOLD) {
      significantEventSteps.push(eventToStep(event, score, reasons, correlatedAlert));
    }
  }

  const dedupedEvents = dedupeEventSteps(significantEventSteps);

  const merged = [...alertSteps, ...dedupedEvents].sort((left, right) =>
    left.timestamp !== right.timestamp
      ? left.timestamp - right.timestamp
      : // Alerts sort after their contributing events at the same instant.
        (left.kind === 'alert' ? 1 : 0) - (right.kind === 'alert' ? 1 : 0)
  );

  const withDepth = assignChainDepth(merged, chainGapMs, maxDepth);
  const totalSignificant = withDepth.length;
  const steps = withDepth.slice(0, Math.max(0, stepCap));
  const overflowCount = Math.max(0, totalSignificant - steps.length);

  return { steps, overflowCount, totalSignificant };
};

/**
 * A gap (ms) between consecutive steps large enough to start a new *session*
 * group in the grouped view. Sessions read as "a burst of related activity",
 * so a multi-hour lull (or a new day) begins a fresh header.
 */
export const SESSION_GAP_MS = 3 * 60 * 60 * 1000;

const SEVERITY_ORDER: readonly AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

/** A contiguous session of causally-related steps, with summary metadata. */
export interface TimelineGroup {
  /** Stable id derived from the first step + session start. */
  id: string;
  /** Epoch ms of the earliest and latest step in the group. */
  startTimestamp: number;
  endTimestamp: number;
  /** Worst alert severity observed across the group's steps. */
  worstSeverity: AlertSeverity | undefined;
  /** Dominant MITRE tactic / kill-chain phase in the group, if any. */
  dominantTactic: string | undefined;
  /** Number of alert steps in the group. */
  alertCount: number;
  steps: readonly TimelineStep[];
}

const worseSeverity = (
  a: AlertSeverity | undefined,
  b: AlertSeverity | undefined
): AlertSeverity | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
};

/** Picks the most frequent tactic among steps (first-seen breaks ties). */
const dominantTacticOf = (steps: readonly TimelineStep[]): string | undefined => {
  const counts = new Map<string, number>();
  for (const step of steps) {
    if (step.tacticName) {
      counts.set(step.tacticName, (counts.get(step.tacticName) ?? 0) + 1);
    }
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [tactic, count] of counts) {
    if (count > bestCount) {
      best = tactic;
      bestCount = count;
    }
  }
  return best;
};

const summarizeGroup = (steps: readonly TimelineStep[]): TimelineGroup => {
  const startTimestamp = steps[0].timestamp;
  const endTimestamp = steps[steps.length - 1].timestamp;
  let worstSeverity: AlertSeverity | undefined;
  let alertCount = 0;
  for (const step of steps) {
    worstSeverity = worseSeverity(worstSeverity, step.severity);
    if (step.kind === 'alert') alertCount += 1;
  }
  return {
    id: `session:${steps[0].id}:${startTimestamp}`,
    startTimestamp,
    endTimestamp,
    worstSeverity,
    dominantTactic: dominantTacticOf(steps),
    alertCount,
    steps,
  };
};

/**
 * Groups an ordered list of timeline steps into *sessions*: a new group begins
 * on a large temporal gap ({@link SESSION_GAP_MS}) or a calendar-day boundary,
 * so the flat waterfall becomes scannable clusters with their own time span,
 * worst severity, and dominant tactic. Pure and order-preserving; resilient to
 * an empty input. `dayBoundary` maps a timestamp to a stable day key (injected
 * so the caller controls the timezone / locale).
 */
export const groupTimelineSteps = (
  steps: readonly TimelineStep[],
  options: { sessionGapMs?: number; dayKey?: (timestamp: number) => string } = {}
): TimelineGroup[] => {
  if (steps.length === 0) return [];
  const sessionGapMs = options.sessionGapMs ?? SESSION_GAP_MS;
  const dayKey = options.dayKey ?? ((ts) => new Date(ts).toISOString().slice(0, 10));

  const groups: TimelineGroup[] = [];
  let current: TimelineStep[] = [];
  let previous: TimelineStep | undefined;
  for (const step of steps) {
    const startsNewSession =
      previous !== undefined &&
      (step.timestamp - previous.timestamp > sessionGapMs ||
        dayKey(step.timestamp) !== dayKey(previous.timestamp));
    if (startsNewSession && current.length > 0) {
      groups.push(summarizeGroup(current));
      current = [];
    }
    current.push(step);
    previous = step;
  }
  if (current.length > 0) {
    groups.push(summarizeGroup(current));
  }
  return groups;
};
