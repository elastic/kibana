/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * HTTP monitor fixture used by the create-monitor spec. Ported from the FTR
 * fixture `apis/synthetics/fixtures/http_monitor.json` (read there via
 * `getFixtureJson`). Kept as a typed module so Scout specs can import it
 * directly without filesystem reads.
 *
 * Callers must supply their own `locations` (e.g. a private location resolved
 * at runtime); the fixture intentionally omits a default to avoid leaking a
 * hardcoded location into tests that forget to override it.
 */
export const httpMonitorFixture: Record<string, unknown> = {
  type: 'http',
  enabled: true,
  alert: {
    status: {
      enabled: true,
    },
  },
  tags: ['tag1', 'tag2'],
  schedule: {
    number: '5',
    unit: 'm',
  },
  'service.name': '',
  config_id: '',
  timeout: '180',
  __ui: {
    is_tls_enabled: false,
  },
  max_attempts: 2,
  max_redirects: '3',
  password: 'test',
  urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
  'url.port': null,
  proxy_url: 'http://proxy.com',
  proxy_headers: {},
  'check.response.body.negative': [],
  'check.response.body.positive': [],
  'check.response.json': [],
  'response.include_body': 'never',
  'response.include_body_max_bytes': '1024',
  'check.request.headers': {
    sampleHeader: 'sampleHeaderValue',
  },
  'response.include_headers': true,
  'check.response.status': ['200', '201'],
  'check.request.body': {
    value: 'testValue',
    type: 'json',
  },
  'check.response.headers': {},
  'check.request.method': '',
  username: 'test-username',
  'ssl.certificate_authorities': 't.string',
  'ssl.certificate': 't.string',
  'ssl.key': 't.string',
  'ssl.key_passphrase': 't.string',
  'ssl.verification_mode': 'certificate',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2'],
  name: 'test-monitor-name',
  namespace: 'testnamespace',
  revision: 1,
  origin: 'ui',
  form_monitor_type: 'http',
  journey_id: '',
  id: '',
  hash: '',
  mode: 'any',
  ipv4: true,
  ipv6: true,
  params: '',
  labels: {},
  maintenance_windows: [],
  spaces: ['default'],
};
