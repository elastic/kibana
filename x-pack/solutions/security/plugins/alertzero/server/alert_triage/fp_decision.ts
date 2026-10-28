/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { get } from 'lodash';
import {
  buildFpClosureSubjectKey,
  buildFpPatternKey,
  readRuleRevision,
} from './fp_pattern_key';
import {
  TRIAGE_FP_PATTERN_AI_INDEX_DEST,
  type FpPatternKiEsClient,
} from './fp_pattern_ki';

export const TRIAGE_FP_DECISION_KI_TYPE = 'security.fp_decision' as const;
export const TRIAGE_FP_DECISION_PRODUCER = 'alertzero.triage.fp_decision.v1' as const;

/** How long an approved pattern auto-closes matching alerts without a model call. */
export const FP_DECISION_APPROVED_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** How long a dismissed pattern suppresses raising the same closure proposal. */
export const FP_DECISION_DISMISSED_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** High/critical alerts are not auto-closed by an approved decision (Jon’s guard). */
const BLOCKED_AUTO_CLOSE_SEVERITIES = new Set(['high', 'critical']);

export type FpDecisionKind = 'approved' | 'dismissed';

export const buildFpDecisionKiId = ({
  spaceId,
  subjectKey,
}: {
  spaceId: string;
  subjectKey: string;
}): string => {
  const hash = createHash('sha256').update(`${spaceId}|decision|${subjectKey}`).digest('hex');
  return `ki-fp-decision-${hash}`;
};

export interface FpDecisionRecord {
  kiId: string;
  kind: FpDecisionKind;
  patternKey: string;
  ruleId: string;
  subjectKey: string;
  expiresAt: number;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const readErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  if ('statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: unknown } }).meta?.statusCode === 'number'
  ) {
    return (error as { meta: { statusCode: number } }).meta.statusCode;
  }
  return undefined;
};

export const writeFpDecisionKi = async ({
  esClient,
  spaceId,
  subjectKey,
  patternKey,
  ruleId,
  kind,
  now = Date.now(),
}: {
  esClient: FpPatternKiEsClient;
  spaceId: string;
  subjectKey: string;
  patternKey: string;
  ruleId: string;
  kind: FpDecisionKind;
  now?: number;
}): Promise<string> => {
  const kiId = buildFpDecisionKiId({ spaceId, subjectKey });
  const ttl = kind === 'approved' ? FP_DECISION_APPROVED_TTL_MS : FP_DECISION_DISMISSED_TTL_MS;
  const expiresAt = new Date(now + ttl).toISOString();
  const stamped = new Date(now).toISOString();
  const { value: index } = TRIAGE_FP_PATTERN_AI_INDEX_DEST;

  await esClient.index({
    index,
    id: kiId,
    document: {
      '@timestamp': stamped,
      id: kiId,
      updated_at: stamped,
      type: TRIAGE_FP_DECISION_KI_TYPE,
      title: `Alert Triage FP decision (${kind}) for ${ruleId}`,
      description: `${kind} pattern ${patternKey}`,
      content: patternKey,
      tags: ['consumer:alert_triage', `decision:${kind}`, 'watch:floor'],
      attributes: {
        status: kind,
        decision: kind,
        rule_id: ruleId,
        pattern_key: patternKey,
        subject_key: subjectKey,
        expires_at: expiresAt,
        producer: TRIAGE_FP_DECISION_PRODUCER,
        space_id: spaceId,
        watch_id: 'floor',
      },
    },
    refresh: 'wait_for',
  });
  return kiId;
};

export const readFpDecisionKi = async ({
  esClient,
  spaceId,
  subjectKey,
  now = Date.now(),
}: {
  esClient: FpPatternKiEsClient;
  spaceId: string;
  subjectKey: string;
  now?: number;
}): Promise<FpDecisionRecord | undefined> => {
  const kiId = buildFpDecisionKiId({ spaceId, subjectKey });
  const { value: index } = TRIAGE_FP_PATTERN_AI_INDEX_DEST;
  try {
    const existing = await esClient.get({ index, id: kiId });
    const attributes = (existing._source?.attributes ?? {}) as Record<string, unknown>;
    if (asString(attributes.space_id) !== spaceId) {
      return undefined;
    }
    const kind = attributes.decision === 'dismissed' ? 'dismissed' : 'approved';
    if (attributes.decision !== 'approved' && attributes.decision !== 'dismissed') {
      return undefined;
    }
    const expiresAtRaw = asString(attributes.expires_at);
    const expiresAt = expiresAtRaw ? Date.parse(expiresAtRaw) : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      return undefined;
    }
    const patternKey = asString(attributes.pattern_key);
    const ruleId = asString(attributes.rule_id);
    if (!patternKey || !ruleId) {
      return undefined;
    }
    return { kiId, kind, patternKey, ruleId, subjectKey, expiresAt };
  } catch (error) {
    if (readErrorStatusCode(error) === 404) {
      return undefined;
    }
    throw error;
  }
};

const alertSeverity = (alert: Record<string, unknown>): string | undefined => {
  const raw =
    asString(get(alert, 'kibana.alert.severity')) ??
    asString(get(alert, 'kibana.alert.rule.severity')) ??
    asString(get(alert, 'severity'));
  return raw?.toLowerCase();
};

export interface ApplyFpDecisionsResult {
  /** Still need Alert Analysis. */
  remainingAlertIds: string[];
  remainingAlerts: Array<Record<string, unknown> & { _id?: string }>;
  /** Matched an approved decision and are safe to auto-close (not high/critical). */
  closeAlertIds: string[];
  /** Matched a dismissed decision — still analysed, but resolve should not mint that pattern. */
  suppressedSubjectKeys: string[];
}

/**
 * Matches loaded alerts against active FP decisions before analysis spends the model budget.
 */
export const applyFpDecisions = async ({
  spaceId,
  ruleId,
  alerts,
  esClient,
  now = Date.now(),
}: {
  spaceId: string;
  ruleId: string;
  alerts: ReadonlyArray<Record<string, unknown> & { _id?: string }>;
  esClient: FpPatternKiEsClient;
  now?: number;
}): Promise<ApplyFpDecisionsResult> => {
  const remainingAlerts: Array<Record<string, unknown> & { _id?: string }> = [];
  const remainingAlertIds: string[] = [];
  const closeAlertIds: string[] = [];
  const suppressedSubjectKeys = new Set<string>();
  const decisionCache = new Map<string, FpDecisionRecord | undefined>();

  for (const alert of alerts) {
    const alertId = typeof alert._id === 'string' ? alert._id : undefined;
    if (!alertId) {
      continue;
    }
    const patternKey = buildFpPatternKey({ ruleId, alert });
    const subjectKey = buildFpClosureSubjectKey({
      ruleId,
      ruleRevision: readRuleRevision(alert),
      patternKey,
    });

    let decision = decisionCache.get(subjectKey);
    if (!decisionCache.has(subjectKey)) {
      decision = await readFpDecisionKi({ esClient, spaceId, subjectKey, now });
      decisionCache.set(subjectKey, decision);
    }

    if (decision?.kind === 'approved') {
      const severity = alertSeverity(alert);
      if (severity && BLOCKED_AUTO_CLOSE_SEVERITIES.has(severity)) {
        remainingAlerts.push(alert);
        remainingAlertIds.push(alertId);
        continue;
      }
      closeAlertIds.push(alertId);
      continue;
    }

    if (decision?.kind === 'dismissed') {
      suppressedSubjectKeys.add(subjectKey);
    }

    remainingAlerts.push(alert);
    remainingAlertIds.push(alertId);
  }

  return {
    remainingAlertIds,
    remainingAlerts,
    closeAlertIds,
    suppressedSubjectKeys: [...suppressedSubjectKeys],
  };
};
