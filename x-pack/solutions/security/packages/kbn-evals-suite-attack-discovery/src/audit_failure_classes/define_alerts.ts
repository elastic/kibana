/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createHash } from 'crypto';
import type { AuditAlert } from './types';

export interface AlertDraft {
  /** Stable local name, used only to derive the opaque id. */
  key: string;
  /** Gold group the alert belongs to. */
  group: string;
  fields: AuditAlert['fields'];
}

/**
 * Alert ids are opaque hashes, like the real `_id`, so an id never leaks its gold group
 * to the model.
 */
export const toAlertId = (scenarioId: string, key: string): string =>
  createHash('sha256').update(`${scenarioId}:${key}`).digest('hex').slice(0, 16);

export const defineAlerts = (
  scenarioId: string,
  drafts: readonly AlertDraft[]
): { alerts: AuditAlert[]; alertGroups: Record<string, string[]> } => {
  const alerts: AuditAlert[] = [];
  const alertGroups: Record<string, string[]> = {};
  for (const { key, group, fields } of drafts) {
    const id = toAlertId(scenarioId, key);
    alerts.push({ id, fields });
    (alertGroups[group] ??= []).push(id);
  }
  return { alerts, alertGroups };
};
