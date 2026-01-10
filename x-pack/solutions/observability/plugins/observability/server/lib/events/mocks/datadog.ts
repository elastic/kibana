/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEventInput } from '../../../../common/types/events';

export const DATADOG_MOCKS: ExternalEventInput[] = [
  {
    title: 'APM: High Error Rate',
    message:
      'Error rate for service payment-service exceeded threshold. Current: 5.2%, Threshold: 1%. Environment: production.',
    severity: 'critical',
    source: 'datadog',
    status: 'open',
    tags: ['apm', 'error-rate', 'payment-service', 'production'],
    links: [
      {
        label: 'View in Datadog',
        url: 'https://app.datadoghq.com/apm/services/payment-service',
      },
    ],
    raw_payload: {
      alert_type: 'apm',
      service: 'payment-service',
      env: 'production',
      metric: 'error_rate',
      value: 5.2,
      threshold: 1,
      monitor_id: 12345678,
    },
  },
  {
    title: 'Infrastructure: Host Unreachable',
    message:
      'Host web-server-03.us-east-1 is not reporting metrics. Last seen: 5 minutes ago.',
    severity: 'critical',
    source: 'datadog',
    status: 'open',
    tags: ['infrastructure', 'host', 'connectivity', 'us-east-1'],
    raw_payload: {
      alert_type: 'infrastructure',
      host: 'web-server-03.us-east-1',
      last_seen: '5 minutes ago',
      monitor_id: 23456789,
    },
  },
  {
    title: 'Log Alert: Authentication Failures',
    message:
      'Detected 150 authentication failures in the last 5 minutes from IP 192.168.1.100. Possible brute force attack.',
    severity: 'high',
    source: 'datadog',
    status: 'open',
    tags: ['logs', 'security', 'authentication', 'brute-force'],
    raw_payload: {
      alert_type: 'log_alert',
      query: 'status:error @auth.result:failure',
      count: 150,
      source_ip: '192.168.1.100',
      monitor_id: 34567890,
    },
  },
  {
    title: 'Synthetics: API Check Failed',
    message:
      'Synthetic test "Checkout API Health" failed from location Frankfurt. Response time: timeout after 30s.',
    severity: 'high',
    source: 'datadog',
    status: 'open',
    tags: ['synthetics', 'api', 'checkout', 'frankfurt'],
    links: [
      {
        label: 'View Test Results',
        url: 'https://app.datadoghq.com/synthetics/details/abc-123',
      },
    ],
    raw_payload: {
      alert_type: 'synthetics',
      test_name: 'Checkout API Health',
      test_id: 'abc-123',
      location: 'Frankfurt',
      status: 'timeout',
    },
  },
  {
    title: 'RUM: High Page Load Time',
    message:
      'Average page load time for /checkout exceeded 4s. Current: 6.2s. Affected users: 1,234.',
    severity: 'medium',
    source: 'datadog',
    status: 'open',
    tags: ['rum', 'performance', 'checkout', 'frontend'],
    raw_payload: {
      alert_type: 'rum',
      page: '/checkout',
      metric: 'page_load_time',
      value: 6.2,
      threshold: 4,
      affected_users: 1234,
    },
  },
];

