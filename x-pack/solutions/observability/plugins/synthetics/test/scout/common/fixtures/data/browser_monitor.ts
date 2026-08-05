/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Browser monitor fixture. Ported from the FTR fixture
 * `apis/synthetics/fixtures/browser_monitor.json`. The `source.inline.script`
 * value preserves the literal `\n` sequences from the original JSON.
 */
export const browserMonitorFixture: Record<string, unknown> = {
  type: 'browser',
  enabled: true,
  alert: {
    status: {
      enabled: true,
    },
  },
  journey_id: '',
  project_id: '',
  schedule: {
    number: '3',
    unit: 'm',
  },
  'service.name': '',
  config_id: '',
  tags: ['cookie-test', 'browser'],
  timeout: '30',
  __ui: {
    script_source: {
      is_generated_script: false,
      file_name: '',
    },
    is_tls_enabled: false,
  },
  'source.inline.script':
    'step("Visit /users api route", async () => {\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\n  expect(response.status()).toEqual(200);\\n});',
  'source.project.content': '',
  params: '',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  throttling: {
    value: {
      download: '5',
      latency: '20',
      upload: '3',
    },
    id: 'default',
    label: 'Default',
  },
  locations: ['dev'],
  name: 'Test HTTP Monitor 03',
  namespace: 'testnamespace',
  origin: 'ui',
  form_monitor_type: 'multistep',
  'url.port': null,
  id: '',
  hash: '',
  playwright_options: '',
  playwright_text_assertion: '',
  'ssl.certificate': '',
  'ssl.certificate_authorities': '',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
  'ssl.verification_mode': 'full',
  revision: 1,
  max_attempts: 2,
  labels: {},
  maintenance_windows: [],
};
