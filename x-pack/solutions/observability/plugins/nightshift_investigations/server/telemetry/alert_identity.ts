/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { RootSchema } from '@kbn/core/server';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';

const MAX_KEYWORD_LENGTH = 500;

export type AlertSourceKind = 'significant_events' | 'elastic_configured' | 'external';

export interface AlertIdentity {
  alert_version?: 'v1' | 'v2';
  alert_source?: string;
  source_kind?: AlertSourceKind;
  fingerprint?: string;
}

export const alertIdentitySchema: RootSchema<AlertIdentity> = {
  alert_version: {
    type: 'keyword',
    _meta: {
      description:
        'Alerting generation of the triggering alert: v1 (classic) or v2. Absent when no alert triggered the run.',
      optional: true,
    },
  },
  alert_source: {
    type: 'keyword',
    _meta: {
      description:
        'Origin of the triggering Alerting v2 alert: elastic.significant_events, internal for Elastic-configured rules, or the sender-provided integration identifier for external alerts.',
      optional: true,
    },
  },
  source_kind: {
    type: 'keyword',
    _meta: {
      description:
        'Whether the triggering Alerting v2 alert is a Significant Event (significant_events), came from an Elastic-configured rule (elastic_configured) or from an external integration (external).',
      optional: true,
    },
  },
  fingerprint: {
    type: 'keyword',
    _meta: {
      description:
        'Opaque stable identifier joining the run to the telemetry of the alert that triggered it: the event id for Significant Events, otherwise the hashed alert series.',
      optional: true,
    },
  },
};

/** Rule group hashes are only unique within a rule, and external alerts have no rule. */
export const toAlertFingerprint = ({
  spaceId,
  source,
  ruleId,
  groupHash,
}: {
  spaceId: string;
  source: string;
  ruleId?: string;
  groupHash: string;
}): string =>
  createHash('sha256')
    .update(`${spaceId}:${source}:${ruleId ?? ''}:${groupHash}`)
    .digest('hex');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const asKeyword = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_KEYWORD_LENGTH
    ? value
    : undefined;

/** The subject's snapshot, or the only alert the run carries. */
export const triggeringAlertOf = (subjectId: string, alerts: unknown): unknown => {
  if (!Array.isArray(alerts)) return undefined;
  const snapshots = alerts.filter(isPlainObject);
  return (
    snapshots.find(({ id }) => id === subjectId) ??
    (snapshots.length === 1 ? snapshots[0] : undefined)
  );
};

/** Untyped because stored subject snapshots are loose objects. */
export const alertIdentityOf = (spaceId: string, snapshot: unknown): AlertIdentity => {
  if (!isPlainObject(snapshot)) return {};

  const source = asKeyword(snapshot.source);
  // Only v2 alerts have a source, and stored snapshots may predate `alert_version`.
  if (snapshot.alert_version !== 'v2' && !source) return { alert_version: 'v1' };
  if (!source) return { alert_version: 'v2' };

  if (source === SIGNIFICANT_EVENTS_ALERT_SOURCE) {
    const eventId = isPlainObject(snapshot.data) ? asKeyword(snapshot.data.event_id) : undefined;
    return {
      alert_version: 'v2',
      alert_source: source,
      source_kind: 'significant_events',
      ...(eventId ? { fingerprint: eventId } : {}),
    };
  }

  const ruleId = asKeyword(snapshot.rule_id);
  const groupHash = asKeyword(snapshot.group_hash);
  return {
    alert_version: 'v2',
    alert_source: source,
    source_kind: ruleId ? 'elastic_configured' : 'external',
    ...(groupHash
      ? { fingerprint: toAlertFingerprint({ spaceId, source, ruleId, groupHash }) }
      : {}),
  };
};
