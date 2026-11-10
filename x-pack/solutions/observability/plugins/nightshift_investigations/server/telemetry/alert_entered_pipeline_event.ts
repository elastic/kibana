/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { EventTypeOpts, RootSchema } from '@kbn/core/server';
import type { AlertStatusChangedOptIn } from '@kbn/alerting-v2-plugin/server';
import { SIGNIFICANT_EVENTS_ALERT_SOURCE } from '@kbn/significant-events-schema';

export const NIGHTSHIFT_ALERT_ENTERED_PIPELINE_EVENT = 'nightshift-alert-entered-pipeline';
export const ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY = 0.1;

export interface AlertEnteredPipelineEvent {
  alert_source: string;
  fingerprint: string;
  group_hash: string;
  space_id: string;
  source_kind: 'elastic_configured' | 'external';
  sampling_probability: number;
}

type AlertStatusChangedPayload = Parameters<
  NonNullable<AlertStatusChangedOptIn['onStatusChanges']>
>[0][number];

interface AlertStatusChange {
  spaceId: string;
  source: string;
  alert: Pick<AlertStatusChangedPayload['alert'], 'groupHash' | 'status' | 'previousStatus'>;
  rule: Pick<NonNullable<AlertStatusChangedPayload['rule']>, 'id'> | null;
}

interface AlertEnteredPipelineReporter {
  reportAlertEnteredPipeline(event: AlertEnteredPipelineEvent): void;
}

const alertEnteredPipelineSchema: RootSchema<AlertEnteredPipelineEvent> = {
  alert_source: {
    type: 'keyword',
    _meta: {
      description:
        'Alert origin: internal for Elastic-configured rules, or the sender-provided integration identifier for external alerts; use source_kind to disambiguate an external sender that also uses internal.',
    },
  },
  fingerprint: {
    type: 'keyword',
    _meta: {
      description: 'Opaque stable identifier used to join telemetry for the same alert series.',
    },
  },
  group_hash: {
    type: 'keyword',
    _meta: {
      description: 'Alerting v2 series key of the alert, joining the event back to `.rule-events`.',
    },
  },
  space_id: {
    type: 'keyword',
    _meta: { description: 'Kibana space in which the alert entered Nightshift.' },
  },
  source_kind: {
    type: 'keyword',
    _meta: {
      description:
        'Whether the alert came from an Elastic-configured rule or an external integration.',
    },
  },
  sampling_probability: {
    type: 'double',
    _meta: { description: 'Probability used for deterministic fingerprint sampling.' },
  },
};

export const alertEnteredPipelineEvent: EventTypeOpts<AlertEnteredPipelineEvent> = {
  eventType: NIGHTSHIFT_ALERT_ENTERED_PIPELINE_EVENT,
  schema: alertEnteredPipelineSchema,
};

export const isAlertEnteredPipelineSampled = (
  fingerprint: string,
  probability = ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY
): boolean => {
  const sample = Number.parseInt(fingerprint.slice(0, 8), 16) / 0x100000000;
  return sample < probability;
};

// Rule group hashes are only unique within a rule; hashing every path keeps the sampler input hex.
export const toAlertFingerprint = ({ spaceId, source, alert, rule }: AlertStatusChange): string =>
  createHash('sha256')
    .update(`${spaceId}:${source}:${rule?.id ?? ''}:${alert.groupHash}`)
    .digest('hex');

export const reportAlertsEnteredPipeline = (
  payloads: readonly AlertStatusChange[],
  telemetry: AlertEnteredPipelineReporter
): void => {
  for (const payload of payloads) {
    const { spaceId, source, alert } = payload;
    const isNewEpisode =
      (alert.previousStatus === null || alert.previousStatus === 'inactive') &&
      (alert.status === 'pending' || alert.status === 'active');

    if (!isNewEpisode || source === SIGNIFICANT_EVENTS_ALERT_SOURCE) {
      continue;
    }

    const fingerprint = toAlertFingerprint(payload);
    if (!isAlertEnteredPipelineSampled(fingerprint)) {
      continue;
    }

    telemetry.reportAlertEnteredPipeline({
      alert_source: source,
      fingerprint,
      group_hash: alert.groupHash,
      space_id: spaceId,
      source_kind: payload.rule === null ? 'external' : 'elastic_configured',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
  }
};
