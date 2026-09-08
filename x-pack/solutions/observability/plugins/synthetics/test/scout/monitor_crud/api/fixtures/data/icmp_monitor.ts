/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ICMP monitor fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/icmp_monitor.json`.
 */
export const icmpMonitorFixture: Record<string, unknown> = {
  type: 'icmp',
  locations: ['dev'],
  journey_id: '',
  enabled: true,
  alert: {
    status: {
      enabled: true,
    },
  },
  schedule: {
    number: '3',
    unit: 'm',
  },
  config_id: '',
  'service.name': 'example-service-name',
  tags: ['tagT1', 'tagT2'],
  timeout: '16',
  hosts: '192.33.22.111:3333',
  wait: '1',
  name: 'Test HTTP Monitor 04',
  namespace: 'testnamespace',
  origin: 'ui',
  form_monitor_type: 'icmp',
  id: '',
  hash: '',
  mode: 'any',
  ipv4: true,
  ipv6: true,
  params: '',
  max_attempts: 2,
  maintenance_windows: [],
};
