/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type EventStatus = 'open' | 'acknowledged' | 'resolved';
export type EventSource = 'prometheus' | 'datadog' | 'sentry' | 'pagerduty' | 'custom';

export interface ExternalEvent {
  id: string;
  title: string;
  message: string;
  severity: EventSeverity;
  source: EventSource | string;
  timestamp: string;
  status: EventStatus;
  tags: string[];
  links?: Array<{ label: string; url: string }>;
  raw_payload?: Record<string, unknown>;
  connector_id?: string;
  fingerprint?: string; // Unique identifier for deduplication (source:monitor_id:group)
}

export interface ExternalEventInput {
  title: string;
  message: string;
  severity: EventSeverity;
  source: EventSource | string;
  timestamp?: string;
  status?: EventStatus;
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
  raw_payload?: Record<string, unknown>;
  connector_id?: string;
  fingerprint?: string; // Unique identifier for deduplication (source:monitor_id:group)
}

export interface GetEventsParams {
  from?: string;
  to?: string;
  source?: string;
  severity?: EventSeverity;
  status?: EventStatus;
  size?: number;
}

export interface GetEventsResponse {
  events: ExternalEvent[];
  total: number;
}

export interface CreateEventResponse {
  event: ExternalEvent;
}

export interface CreateMockEventsParams {
  provider: EventSource;
  count?: number;
}

export interface CreateMockEventsResponse {
  events: ExternalEvent[];
  count: number;
}

// Index for external events following Kibana alert schema
export const EXTERNAL_ALERTS_INDEX = '.alerts-external.alerts-default';

// Legacy index (for backward compatibility during migration)
export const EXTERNAL_EVENTS_INDEX = '.external-events';

export const EVENTS_API_URLS = {
  EVENTS: '/api/observability/events',
  EVENTS_RAW: '/api/observability/events/raw', // Bypasses strict validation
  EVENTS_MOCK: '/api/observability/events/mock',
  EVENTS_WEBHOOK: '/api/observability/events/webhook',
} as const;

/**
 * Kibana Alert field names for external events
 * These match the standard Kibana alert schema so external events
 * can be displayed in the same table as native alerts
 */
export const EXTERNAL_ALERT_FIELDS = {
  // Standard Kibana alert fields
  UUID: 'kibana.alert.uuid',
  RULE_NAME: 'kibana.alert.rule.name',
  REASON: 'kibana.alert.reason',
  STATUS: 'kibana.alert.status',
  SEVERITY: 'kibana.alert.severity',
  START: 'kibana.alert.start',

  // Custom fields for external events
  SOURCE: 'kibana.alert.source',
  CONNECTOR_ID: 'kibana.alert.connector_id',
  RAW_PAYLOAD: 'kibana.alert.raw_payload',
  EXTERNAL_URL: 'kibana.alert.external_url',

  // Standard fields
  TIMESTAMP: '@timestamp',
  TAGS: 'tags',
} as const;

/**
 * Maps EventStatus to Kibana alert status
 */
export const STATUS_MAPPING: Record<EventStatus, string> = {
  open: 'active',
  acknowledged: 'active',
  resolved: 'recovered',
};

/**
 * Maps EventSeverity to Kibana alert severity
 */
export const SEVERITY_MAPPING: Record<EventSeverity, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
};

/**
 * Document structure for external alerts in Kibana alert format
 */
export interface ExternalAlertDocument {
  '@timestamp': string;
  'kibana.alert.uuid': string;
  'kibana.alert.rule.name': string;
  'kibana.alert.reason': string;
  'kibana.alert.status': string;
  'kibana.alert.severity'?: string;
  'kibana.alert.start': string;
  'kibana.alert.end'?: string;
  'kibana.alert.source': string;
  'kibana.alert.connector_id'?: string;
  'kibana.alert.raw_payload'?: Record<string, unknown>;
  'kibana.alert.external_url'?: string;
  'kibana.alert.fingerprint'?: string; // Unique identifier for deduplication
  'kibana.alert.rule.uuid': string;
  'kibana.alert.rule.category': string;
  'kibana.alert.rule.producer': string;
  'kibana.alert.rule.consumer': string;
  'kibana.alert.rule.type_id': string;
  'kibana.alert.instance.id': string;
  'kibana.space_ids': string[];
  tags: string[];
  'event.action': string;
  'event.kind': string;
}

/**
 * Converts an ExternalEvent to a Kibana alert document format
 */
export function externalEventToAlertDocument(event: ExternalEvent): ExternalAlertDocument {
  const primaryLink = event.links?.[0]?.url;

  return {
    '@timestamp': event.timestamp,
    'kibana.alert.uuid': event.id,
    'kibana.alert.rule.name': event.title,
    'kibana.alert.reason': event.message,
    'kibana.alert.status': STATUS_MAPPING[event.status] || 'active',
    'kibana.alert.severity': SEVERITY_MAPPING[event.severity] || event.severity,
    'kibana.alert.start': event.timestamp,
    'kibana.alert.source': event.source,
    'kibana.alert.connector_id': event.connector_id,
    'kibana.alert.raw_payload': event.raw_payload,
    'kibana.alert.external_url': primaryLink,
    'kibana.alert.fingerprint': event.fingerprint,
    // Required fields for alert table compatibility
    'kibana.alert.rule.uuid': `external-${event.source}-${event.id}`,
    'kibana.alert.rule.category': 'External Alert',
    'kibana.alert.rule.producer': 'observability',
    'kibana.alert.rule.consumer': 'logs',
    'kibana.alert.rule.type_id': 'external.alert',
    'kibana.alert.instance.id': event.fingerprint || event.id, // Use fingerprint as instance ID for deduplication
    'kibana.space_ids': ['default'],
    tags: event.tags || [],
    'event.action': 'open',
    'event.kind': 'signal',
  };
}

/**
 * Converts a Kibana alert document back to ExternalEvent format
 */
export function alertDocumentToExternalEvent(doc: ExternalAlertDocument): ExternalEvent {
  const status = doc['kibana.alert.status'];
  let eventStatus: EventStatus = 'open';
  if (status === 'recovered') {
    eventStatus = 'resolved';
  } else if (status === 'active') {
    eventStatus = 'open';
  }

  const severity = doc['kibana.alert.severity'] as EventSeverity;

  return {
    id: doc['kibana.alert.uuid'],
    title: doc['kibana.alert.rule.name'],
    message: doc['kibana.alert.reason'],
    severity: severity || 'medium',
    source: doc['kibana.alert.source'] as EventSource,
    timestamp: doc['@timestamp'],
    status: eventStatus,
    tags: doc.tags || [],
    links: doc['kibana.alert.external_url']
      ? [{ label: 'View in Source', url: doc['kibana.alert.external_url'] }]
      : undefined,
    raw_payload: doc['kibana.alert.raw_payload'],
    connector_id: doc['kibana.alert.connector_id'],
    fingerprint: doc['kibana.alert.fingerprint'],
  };
}
