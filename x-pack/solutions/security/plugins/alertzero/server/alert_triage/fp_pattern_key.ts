/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { get } from 'lodash';

/** Caps how many alerts one converged FP-closure proposal may hold. */
export const TRIAGE_FP_MAX_ALERT_IDS = 1000;

/** Caps automatic revisions when growing a live FP-closure proposal. */
export const TRIAGE_FP_MAX_AUTOMATIC_REVISION = 20;

/** Must stay aligned with `system-alertzero-action-close-alerts-fp`. */
const FP_CLOSE_ACTION_WORKFLOW_ID = 'system-alertzero-action-close-alerts-fp';

const HOST_PATHS = ['host.name', 'host.hostname', 'agent.hostname'] as const;
const USER_PATHS = ['user.name', 'user.id', 'source.user.name'] as const;

/**
 * Normalises entity values so casing / whitespace does not split the same host or user.
 */
export const normalizePatternValue = (value: string): string => value.trim().toLowerCase();

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim() !== '') {
    return value[0];
  }
  return undefined;
};

const readEntity = (
  alert: Record<string, unknown>,
  paths: readonly string[]
): string | undefined => {
  for (const path of paths) {
    const raw = asString(get(alert, path));
    if (raw !== undefined && raw !== '__missing__') {
      return normalizePatternValue(raw);
    }
  }
  return undefined;
};

/**
 * Deterministic pattern material for one alert: host + user. `undefined` when neither is
 * present (caller pools those under the rule alone).
 */
export const buildFpPatternMaterial = (alert: Record<string, unknown>): string | undefined => {
  const host = readEntity(alert, HOST_PATHS);
  const user = readEntity(alert, USER_PATHS);
  if (host === undefined && user === undefined) {
    return undefined;
  }
  const parts: string[] = [];
  if (host !== undefined) {
    parts.push(`host=${host}`);
  }
  if (user !== undefined) {
    parts.push(`user=${user}`);
  }
  return parts.join('|');
};

export const buildFpPatternKey = ({
  ruleId,
  alert,
}: {
  ruleId: string;
  alert: Record<string, unknown>;
}): string => {
  const material = buildFpPatternMaterial(alert);
  if (material === undefined) {
    return `rule:${ruleId}`;
  }
  return `rule:${ruleId}|${material}`;
};

export const readRuleRevision = (alert: Record<string, unknown>): string | undefined => {
  const version =
    asString(get(alert, 'kibana.alert.rule.version')) ??
    asString(get(alert, 'kibana.alert.rule.revision'));
  return version;
};

/**
 * Subject key for FP-closure proposals: same rule + host/user pattern (+ optional rule
 * revision) always lands on the same Proposals slot, independent of Investigation.
 */
export const buildFpClosureSubjectKey = ({
  ruleId,
  ruleRevision,
  patternKey,
}: {
  ruleId: string;
  ruleRevision?: string;
  patternKey: string;
}): string => {
  const material = ruleRevision
    ? `${ruleId}|${ruleRevision}|${patternKey}|${FP_CLOSE_ACTION_WORKFLOW_ID}`
    : `${ruleId}|${patternKey}|${FP_CLOSE_ACTION_WORKFLOW_ID}`;
  // Stable string subject for buildProposalId; need not be a UUID itself.
  return createHash('sha256').update(material).digest('hex');
};

export interface FpPatternGroup {
  patternKey: string;
  subjectKey: string;
  alertIds: string[];
  /** Hosts/users for proposal title copy; may be empty. */
  entitySummary: string;
}

const entityName = (alert: Record<string, unknown>, path: string): string | undefined => {
  const raw = asString(get(alert, path));
  return raw && raw !== '__missing__' ? raw : undefined;
};

const buildEntitySummary = (alerts: Record<string, unknown>[]): string => {
  const hosts = new Set<string>();
  const users = new Set<string>();
  for (const alert of alerts) {
    const host =
      entityName(alert, 'host.name') ??
      entityName(alert, 'host.hostname') ??
      entityName(alert, 'agent.hostname');
    const user =
      entityName(alert, 'user.name') ??
      entityName(alert, 'user.id') ??
      entityName(alert, 'source.user.name');
    if (host) hosts.add(host);
    if (user) users.add(user);
  }
  const hostList = [...hosts].slice(0, 2);
  const userList = [...users].slice(0, 2);
  if (hostList.length === 0 && userList.length === 0) {
    return '';
  }
  const hostPart =
    hostList.length === 0
      ? ''
      : hosts.size > 2
      ? `on ${hostList.join(', ')} +${hosts.size - 2}`
      : `on ${hostList.join(', ')}`;
  const userPart =
    userList.length === 0
      ? ''
      : users.size > 2
      ? `(${userList.join(', ')} +${users.size - 2})`
      : `(${userList.join(', ')})`;
  return [hostPart, userPart].filter(Boolean).join(' ');
};

/**
 * Groups confident-FP alert ids by rule + host + user. Alerts missing host and user (or
 * missing from `alertsById`) are pooled under the rule-only key so they still close together.
 */
export const groupFpAlertsByPattern = ({
  ruleId,
  alertIds,
  alertsById,
}: {
  ruleId: string;
  alertIds: readonly string[];
  alertsById: ReadonlyMap<string, Record<string, unknown>>;
}): FpPatternGroup[] => {
  const buckets = new Map<
    string,
    { patternKey: string; subjectKey: string; alerts: Record<string, unknown>[]; alertIds: string[] }
  >();

  for (const alertId of alertIds) {
    const alert = alertsById.get(alertId) ?? {};
    const patternKey = buildFpPatternKey({ ruleId, alert });
    const subjectKey = buildFpClosureSubjectKey({
      ruleId,
      ruleRevision: readRuleRevision(alert),
      patternKey,
    });
    const existing = buckets.get(subjectKey);
    if (existing) {
      existing.alertIds.push(alertId);
      existing.alerts.push(alert);
    } else {
      buckets.set(subjectKey, {
        patternKey,
        subjectKey,
        alertIds: [alertId],
        alerts: [alert],
      });
    }
  }

  return [...buckets.values()].map(({ patternKey, subjectKey, alertIds: ids, alerts }) => ({
    patternKey,
    subjectKey,
    alertIds: ids,
    entitySummary: buildEntitySummary(alerts),
  }));
};
