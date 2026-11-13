/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, KibanaRequest, RootSchema } from '@kbn/core/server';

export const NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT = 'nightshift-detection-snapshot';

/** Counts owned by the Significant Events plugin, which this plugin cannot depend on. */
export interface DetectionSnapshotKnowledgeCounts {
  knowledge_indicators_features: number;
  knowledge_indicators_queries: number;
  significant_event_rules: number;
  significant_event_rules_active: number;
  significant_events_total: number;
  significant_events_open: number;
}

export type DetectionSnapshotContributor = (params: {
  spaceId: string;
  request: KibanaRequest;
}) => Promise<DetectionSnapshotKnowledgeCounts>;

export interface DetectionSnapshotEvent extends Partial<DetectionSnapshotKnowledgeCounts> {
  space_id: string;
  rules_eligible: number;
  rules_wired_in: number;
  rules_truncated: boolean;
  automations_total: number;
  automations_enabled: number;
  external_connectors_configured: number;
  external_connectors_active_24h: number;
  external_sources_active_24h: number;
  external_alerts_24h: number;
  significant_events_24h: number;
  memory_enabled: boolean;
  memory_pages?: number;
  custom_context_snippets: number;
  sandbox_allowlist_hosts: number;
}

const count = (description: string) => ({
  type: 'long' as const,
  _meta: { description },
});

const optionalCount = (description: string) => ({
  type: 'long' as const,
  _meta: { description, optional: true as const },
});

const detectionSnapshotSchema: RootSchema<DetectionSnapshotEvent> = {
  space_id: {
    type: 'keyword',
    _meta: { description: 'Kibana space the snapshot describes; one event per space per run.' },
  },
  rules_eligible: count(
    'Enabled Alerting v2 rules of kind `alert` in the space: the rules an automation could route to Nightshift.'
  ),
  rules_wired_in: count(
    'Eligible rules matched by the alert trigger of at least one enabled automation. Severity filters are ignored because they apply to alerts, not rules.'
  ),
  rules_truncated: {
    type: 'boolean',
    _meta: {
      description:
        'Whether the space has more eligible rules than one run scans; rules_wired_in then covers only the scanned rules.',
    },
  },
  automations_total: count('Automations in the space.'),
  automations_enabled: count('Enabled automations in the space.'),
  external_connectors_configured: count(
    'Connectors of a type that imports alerts from an external system.'
  ),
  external_connectors_active_24h: count(
    'Configured external connectors whose alert source wrote an alert event in the last 24 hours. Alerts do not name the connector that delivered them, so every connector of an active source counts.'
  ),
  external_sources_active_24h: count(
    'Distinct external alert sources (neither `internal` nor `elastic.*`) that wrote an alert event in the last 24 hours.'
  ),
  external_alerts_24h: count(
    'Distinct alerts from external sources with an alert event in the last 24 hours.'
  ),
  significant_events_24h: count(
    'Distinct Significant Events with an alert event in the last 24 hours.'
  ),
  memory_enabled: {
    type: 'boolean',
    _meta: { description: 'Whether Semantic Memory is enabled in this deployment.' },
  },
  memory_pages: optionalCount('Active Semantic Memory pages; absent when memory is disabled.'),
  custom_context_snippets: count('Custom context snippets configured in Settings.'),
  sandbox_allowlist_hosts: count('Sandbox egress allowlist entries configured in Settings.'),
  knowledge_indicators_features: optionalCount(
    'Feature Knowledge Indicators that are not deleted.'
  ),
  knowledge_indicators_queries: optionalCount('Query Knowledge Indicators that are not deleted.'),
  significant_event_rules: optionalCount(
    'Distinct Significant Event rules backing a Query Knowledge Indicator.'
  ),
  significant_event_rules_active: optionalCount(
    'Significant Event rules that exist and are enabled.'
  ),
  significant_events_total: optionalCount('Significant Events in the space, open or closed.'),
  significant_events_open: optionalCount(
    'Significant Events whose current status is `active` or `recovering`.'
  ),
};

export const detectionSnapshotEvent: EventTypeOpts<DetectionSnapshotEvent> = {
  eventType: NIGHTSHIFT_DETECTION_SNAPSHOT_EVENT,
  schema: detectionSnapshotSchema,
};
