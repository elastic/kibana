/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { ALERT_STATE_NAMESPACE } from '@kbn/rule-data-utils';

export const ALERT_STATE_META = `${ALERT_STATE_NAMESPACE}.meta` as const;
export const ALERT_STATE_FIRST_CHECKED_AT = `${ALERT_STATE_NAMESPACE}.first_checked_at` as const;
export const ALERT_STATE_FIRST_TRIGGERED_AT =
  `${ALERT_STATE_NAMESPACE}.first_triggered_at` as const;
export const ALERT_STATE_LAST_CHECKED_AT = `${ALERT_STATE_NAMESPACE}.last_checked_at` as const;
export const ALERT_STATE_LAST_TRIGGERED_AT = `${ALERT_STATE_NAMESPACE}.last_triggered_at` as const;
export const ALERT_STATE_LAST_RESOLVED_AT = `${ALERT_STATE_NAMESPACE}.last_resolved_at` as const;
export const ALERT_STATE_IS_TRIGGERED = `${ALERT_STATE_NAMESPACE}.is_triggered` as const;

export const syntheticsRuleFieldMap: FieldMap = {
  [ALERT_STATE_META]: {
    type: 'object',
    required: false,
  },
  [ALERT_STATE_FIRST_CHECKED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_FIRST_TRIGGERED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_CHECKED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_TRIGGERED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_LAST_RESOLVED_AT]: {
    type: 'date',
    required: false,
  },
  [ALERT_STATE_IS_TRIGGERED]: {
    type: 'boolean',
    required: false,
  },
  // common fields
  'monitor.id': {
    type: 'keyword',
    required: false,
  },
  'url.full': {
    type: 'keyword',
    required: false,
  },
  'observer.name': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'observer.geo.name': {
    type: 'keyword',
    array: true,
    required: false,
  },
  // monitor status alert fields
  'error.message': {
    type: 'text',
    required: false,
  },
  'error.stack_trace': {
    type: 'wildcard',
    required: false,
  },
  'agent.name': {
    type: 'keyword',
    required: false,
  },
  'monitor.name': {
    type: 'keyword',
    required: false,
  },
  'monitor.type': {
    type: 'keyword',
    required: false,
  },
  'monitor.tags': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'monitor.state.id': {
    type: 'keyword',
    required: false,
  },
  configId: {
    type: 'keyword',
    required: false,
  },
  'host.name': {
    type: 'keyword',
    required: false,
  },
  'location.id': {
    type: 'keyword',
    array: true,
    required: false,
  },
  'location.name': {
    type: 'keyword',
    array: true,
    required: false,
  },
  // tls alert fields
  'tls.server.x509.issuer.common_name': {
    type: 'keyword',
    required: false,
  },
  'tls.server.x509.subject.common_name': {
    type: 'keyword',
    required: false,
  },
  'tls.server.x509.not_after': {
    type: 'date',
    required: false,
  },
  'tls.server.x509.not_before': {
    type: 'date',
    required: false,
  },
  'tls.server.hash.sha256': {
    type: 'keyword',
    required: false,
  },
  // anomaly alert fields
  'anomaly.start': {
    type: 'date',
    required: false,
  },
  'anomaly.bucket_span.minutes': {
    type: 'keyword',
    required: false,
  },
  'service.name': {
    type: 'keyword',
    required: false,
  },
  labels: {
    type: 'object',
    required: false,
  },
} as const;
