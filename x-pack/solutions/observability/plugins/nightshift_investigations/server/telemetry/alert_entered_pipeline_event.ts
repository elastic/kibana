/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_ALERT_ENTERED_PIPELINE_EVENT = 'nightshift-alert-entered-pipeline';
export const ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY = 0.1;

export interface AlertEnteredPipelineEvent {
  alert_source: string;
  fingerprint: string;
  space_id: string;
  source_kind: 'elastic_configured' | 'external';
  sampling_probability: number;
}

interface AlertStatusChange {
  spaceId: string;
  source: string;
  alert: {
    fingerprint?: string;
    status: string;
    previousStatus: string | null;
  };
}

interface AlertEnteredPipelineReporter {
  reportAlertEnteredPipeline(event: AlertEnteredPipelineEvent): void;
}

const alertEnteredPipelineSchema: RootSchema<AlertEnteredPipelineEvent> = {
  alert_source: {
    type: 'keyword',
    _meta: {
      description:
        'Alert origin: internal for Elastic-configured rules, or the sender-provided integration identifier for external alerts.',
    },
  },
  fingerprint: {
    type: 'keyword',
    _meta: {
      description: 'Opaque stable identifier used to join telemetry for the same alert series.',
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
  return Number.isFinite(sample) && sample < probability;
};

export const reportAlertsEnteredPipeline = (
  payloads: readonly AlertStatusChange[],
  telemetry: AlertEnteredPipelineReporter
): void => {
  for (const { spaceId, source, alert } of payloads) {
    const isNewEpisode =
      (alert.previousStatus === null || alert.previousStatus === 'inactive') &&
      (alert.status === 'pending' || alert.status === 'active');

    if (
      !isNewEpisode ||
      !alert.fingerprint ||
      source === 'elastic.significant_events' ||
      !isAlertEnteredPipelineSampled(alert.fingerprint)
    ) {
      continue;
    }

    telemetry.reportAlertEnteredPipeline({
      alert_source: source,
      fingerprint: alert.fingerprint,
      space_id: spaceId,
      source_kind: source === 'internal' ? 'elastic_configured' : 'external',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
  }
};
