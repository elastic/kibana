/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TCP monitor fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/tcp_monitor.json`.
 */
export const tcpMonitorFixture: Record<string, unknown> = {
  type: 'tcp',
  locations: ['dev'],
  enabled: true,
  config_id: '',
  schedule: {
    number: '3',
    unit: 'm',
  },
  'service.name': '',
  tags: [],
  timeout: '16',
  __ui: {
    is_tls_enabled: true,
  },
  hosts: 'example-host:40',
  urls: 'example-host:40',
  'url.port': null,
  proxy_url: '',
  proxy_use_local_resolver: false,
  'check.receive': '',
  'check.send': '',
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.key': '',
  'ssl.key_passphrase': 'examplepassphrase',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.3'],
  name: 'Test HTTP Monitor 04',
  namespace: 'testnamespace',
  origin: 'ui',
  form_monitor_type: 'tcp',
  id: '',
  hash: '',
  mode: 'any',
  ipv4: true,
  ipv6: true,
  params: '',
  max_attempts: 2,
  maintenance_windows: [],
};
