/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, sortBy } from 'lodash';
import expect from '@kbn/expect';
import { PackagePolicy } from '@kbn/fleet-plugin/common';

export const getTestSyntheticsPolicy = (
  name: string,
  id: string,
  locationName?: string,
  namespace?: string,
  isTLSEnabled?: boolean
): PackagePolicy => ({
  id: '2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
  version: 'WzE2MjYsMV0=',
  name: 'test-monitor-name-Test private location 0-default',
  namespace: namespace || 'testnamespace',
  package: { name: 'synthetics', title: 'Elastic Synthetics', version: '0.11.4' },
  enabled: true,
  policy_id: '5347cd10-0368-11ed-8df7-a7424c6f5167',
  inputs: [
    {
      type: 'synthetics/http',
      policy_template: 'synthetics',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'http',
            elasticsearch: {
              privileges: {
                indices: ['auto_configure', 'create_doc', 'read'],
              },
            },
          },
          vars: {
            __ui: {
              value: `{"is_tls_enabled":${isTLSEnabled || false}}`,
              type: 'yaml',
            },
            enabled: { value: true, type: 'bool' },
            type: { value: 'http', type: 'text' },
            name: { value: name, type: 'text' },
            schedule: { value: '"@every 5m"', type: 'text' },
            urls: { value: 'https://nextjs-test-synthetics.vercel.app/api/users', type: 'text' },
            'service.name': { value: '', type: 'text' },
            timeout: { value: '3ms', type: 'text' },
            max_redirects: { value: '3', type: 'integer' },
            proxy_url: { value: 'http://proxy.com', type: 'text' },
            tags: { value: '["tag1","tag2"]', type: 'yaml' },
            username: { value: 'test-username', type: 'text' },
            password: { value: 'test', type: 'password' },
            'response.include_headers': { value: true, type: 'bool' },
            'response.include_body': { value: 'never', type: 'text' },
            'check.request.method': { value: '', type: 'text' },
            'check.request.headers': {
              value: '{"sampleHeader":"sampleHeaderValue"}',
              type: 'yaml',
            },
            'check.request.body': { value: '"testValue"', type: 'yaml' },
            'check.response.status': { value: '["200","201"]', type: 'yaml' },
            'check.response.headers': { value: null, type: 'yaml' },
            'check.response.body.positive': { value: null, type: 'yaml' },
            'check.response.body.negative': { value: null, type: 'yaml' },
            'ssl.certificate_authorities': {
              value: isTLSEnabled ? '"t.string"' : null,
              type: 'yaml',
            },
            'ssl.certificate': { value: isTLSEnabled ? '"t.string"' : null, type: 'yaml' },
            'ssl.key': { value: isTLSEnabled ? '"t.string"' : null, type: 'yaml' },
            'ssl.key_passphrase': { value: isTLSEnabled ? 't.string' : null, type: 'text' },
            'ssl.verification_mode': { value: isTLSEnabled ? 'certificate' : null, type: 'text' },
            'ssl.supported_protocols': {
              value: isTLSEnabled ? '["TLSv1.1","TLSv1.2"]' : null,
              type: 'yaml',
            },
            location_name: { value: locationName ?? 'Test private location 0', type: 'text' },
            id: { value: id, type: 'text' },
            config_id: { value: id, type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { value: 'ui', type: 'text' },
            'monitor.project.id': { type: 'text', value: null },
            'monitor.project.name': { type: 'text', value: null },
          },
          id: 'synthetics/http-http-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
          compiled_stream: {
            __ui: {
              is_tls_enabled: isTLSEnabled || false,
            },
            type: 'http',
            name,
            id,
            origin: 'ui',
            enabled: true,
            urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
            schedule: '@every 5m',
            timeout: '3ms',
            max_redirects: 3,
            proxy_url: 'http://proxy.com',
            tags: ['tag1', 'tag2'],
            username: 'test-username',
            password: 'test',
            'run_from.geo.name': locationName ?? 'Test private location 0',
            'run_from.id': locationName ?? 'Test private location 0',
            'response.include_headers': true,
            'response.include_body': 'never',
            'check.request.method': null,
            'check.request.headers': { sampleHeader: 'sampleHeaderValue' },
            'check.request.body': 'testValue',
            'check.response.status': ['200', '201'],
            ...(isTLSEnabled
              ? {
                'ssl.certificate': 't.string',
                'ssl.certificate_authorities': 't.string',
                'ssl.key': 't.string',
                'ssl.key_passphrase': 't.string',
                'ssl.verification_mode': 'certificate',
                'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2'],
              }
              : {}),
            processors: [
              {
                add_fields: {
                  target: '',
                  fields: {
                    'monitor.fleet_managed': true,
                    config_id: id,
                  },
                },
              },
            ],
          },
        },
      ],
    },
    {
      type: 'synthetics/tcp',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'tcp',
          },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'tcp', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            hosts: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            proxy_url: { type: 'text' },
            proxy_use_local_resolver: { value: false, type: 'bool' },
            tags: { type: 'yaml' },
            'check.send': { type: 'text' },
            'check.receive': { type: 'text' },
            'ssl.certificate_authorities': { type: 'yaml' },
            'ssl.certificate': { type: 'yaml' },
            'ssl.key': { type: 'yaml' },
            'ssl.key_passphrase': { type: 'text' },
            'ssl.verification_mode': { type: 'text' },
            'ssl.supported_protocols': { type: 'yaml' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
          id: 'synthetics/tcp-tcp-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        },
      ],
    },
    {
      type: 'synthetics/icmp',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'icmp',
          },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'icmp', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            wait: { value: '1s', type: 'text' },
            hosts: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            tags: { type: 'yaml' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
          id: 'synthetics/icmp-icmp-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        },
      ],
    },
    {
      type: 'synthetics/browser',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'browser',
            elasticsearch: {
              privileges: {
                indices: ['auto_configure', 'create_doc', 'read'],
              },
            },
          },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'browser', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            tags: { type: 'yaml' },
            'source.zip_url.url': { type: 'text' },
            'source.zip_url.username': { type: 'text' },
            'source.zip_url.folder': { type: 'text' },
            'source.zip_url.password': { type: 'password' },
            'source.inline.script': { type: 'yaml' },
            'source.project.content': { type: 'text' },
            params: { type: 'yaml' },
            playwright_options: { type: 'yaml' },
            screenshots: { type: 'text' },
            synthetics_args: { type: 'text' },
            ignore_https_errors: { type: 'bool' },
            'throttling.config': { type: 'text' },
            'filter_journeys.tags': { type: 'yaml' },
            'filter_journeys.match': { type: 'text' },
            'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
            'source.zip_url.ssl.certificate': { type: 'yaml' },
            'source.zip_url.ssl.key': { type: 'yaml' },
            'source.zip_url.ssl.key_passphrase': { type: 'text' },
            'source.zip_url.ssl.verification_mode': { type: 'text' },
            'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
            'source.zip_url.proxy_url': { type: 'text' },
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
          },
          id: 'synthetics/browser-browser-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
          compiled_stream: {
            __ui: null,
            type: 'browser',
            name: null,
            enabled: true,
            schedule: '@every 3m',
            'run_from.id': 'Fleet managed',
            'run_from.geo.name': 'Fleet managed',
            timeout: null,
            throttling: null,
            processors: [{ add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } }],
          },
        },
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'browser.network',
            elasticsearch: {
              privileges: {
                indices: ['auto_configure', 'create_doc', 'read'],
              },
            },
          },
          id: 'synthetics/browser-browser.network-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
          compiled_stream: {
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
          },
        },
        {
          enabled: true,
          data_stream: {
            type: 'synthetics',
            dataset: 'browser.screenshot',
            elasticsearch: {
              privileges: {
                indices: ['auto_configure', 'create_doc', 'read'],
              },
            },
          },
          id: 'synthetics/browser-browser.screenshot-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
          compiled_stream: {
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
          },
        },
      ],
    },
  ],
  is_managed: true,
  revision: 1,
  created_at: '2022-08-23T14:09:17.176Z',
  created_by: 'system',
  updated_at: '2022-08-23T14:09:17.176Z',
  updated_by: 'system',
});

export const omitIds = (policy: PackagePolicy) => {
  policy.inputs = sortBy(policy.inputs, 'type');

  policy.inputs.forEach((input) => {
    input.streams = sortBy(input.streams, 'data_stream.dataset');
    input.streams.forEach((stream) => {
      stream.id = '';
    });
  });

  return omit(policy, ignoreTestFields);
};

export const comparePolicies = (aPolicy: PackagePolicy, bPolicy: PackagePolicy) => {
  expect(omitIds(aPolicy)).eql(omitIds(bPolicy));
};

export const ignoreTestFields = [
  'id',
  'name',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'policy_id',
  'version',
  'revision',
];
