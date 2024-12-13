/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import {
  ConfigKey,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../../common/runtime_types';

export type SyntheticsSavedObjectUnsanitizedDoc850 = SavedObjectUnsanitizedDoc<
  Omit<SyntheticsMonitorWithSecretsAttributes, ConfigKey.MAX_ATTEMPTS>
>;

export const httpUI = {
  type: 'synthetics-monitor',
  id: '500c38b6-525f-4af8-b001-25ce28d8f9e5',
  attributes: {
    type: 'http',
    form_monitor_type: 'http',
    enabled: true,
    schedule: { number: '3', unit: 'm' },
    'service.name': '',
    config_id: '500c38b6-525f-4af8-b001-25ce28d8f9e5',
    tags: [],
    timeout: '16',
    name: 'Test monitor',
    locations: [{ id: 'us_central', isServiceManaged: true }] as any,
    namespace: 'default',
    origin: 'ui',
    journey_id: '',
    id: '500c38b6-525f-4af8-b001-25ce28d8f9e5',
    __ui: { is_tls_enabled: false, is_zip_url_tls_enabled: false },
    urls: 'https://elastic.co',
    max_redirects: '0',
    'url.port': null,
    proxy_url: '',
    'response.include_body': 'on_error',
    'response.include_headers': true,
    'check.response.status': [],
    'check.request.method': 'GET',
    'ssl.certificate_authorities': '',
    'ssl.certificate': '',
    'ssl.verification_mode': 'full',
    'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
    revision: 1,
    secrets:
      '{"password":"","check.request.body":{"type":"text","value":""},"check.request.headers":{},"check.response.body.negative":[],"check.response.body.positive":[],"check.response.headers":{},"ssl.key":"","ssl.key_passphrase":"","username":""}',
  },
  references: [],
  coreMigrationVersion: '8.8.0',
  updated_at: '2023-04-11T17:42:11.734Z',
  typeMigrationVersion: '8.6.0',
} as SyntheticsSavedObjectUnsanitizedDoc850;
