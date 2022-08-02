/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, sortBy } from 'lodash';
import expect from '@kbn/expect';
import { PackagePolicy } from '@kbn/fleet-plugin/common';

export const getTestSyntheticsPolicy = (name: string): PackagePolicy => ({
  id: '5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
  version: 'WzMyNTcsMV0=',
  name: '5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
  namespace: 'default',
  package: { name: 'synthetics', title: 'Elastic Synthetics', version: '0.9.4' },
  enabled: true,
  policy_id: '5347cd10-0368-11ed-8df7-a7424c6f5167',
  output_id: '',
  inputs: [
    {
      type: 'synthetics/http',
      policy_template: 'synthetics',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'http' },
          vars: {
            __ui: {
              value:
                '{"is_tls_enabled":false,"is_zip_url_tls_enabled":false,"script_source":{"is_generated_script":false,"file_name":"test-file.name"}}',
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
            'check.request.headers': { value: null, type: 'yaml' },
            'check.request.body': { value: '"testValue"', type: 'yaml' },
            'check.response.status': { value: '["200","201"]', type: 'yaml' },
            'check.response.headers': { value: null, type: 'yaml' },
            'check.response.body.positive': { value: null, type: 'yaml' },
            'check.response.body.negative': { value: null, type: 'yaml' },
            'ssl.certificate_authorities': { value: '"t.string"', type: 'yaml' },
            'ssl.certificate': { value: '"t.string"', type: 'yaml' },
            'ssl.key': { value: '"t.string"', type: 'yaml' },
            'ssl.key_passphrase': { value: 't.string', type: 'text' },
            'ssl.verification_mode': { value: 'certificate', type: 'text' },
            'ssl.supported_protocols': { value: '["TLSv1.1","TLSv1.2"]', type: 'yaml' },
          },
          id: 'synthetics/http-http-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
          compiled_stream: {
            __ui: {
              is_tls_enabled: false,
              is_zip_url_tls_enabled: false,
              script_source: { is_generated_script: false, file_name: 'test-file.name' },
            },
            type: 'http',
            name,
            enabled: true,
            urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
            schedule: '@every 5m',
            timeout: '3ms',
            max_redirects: 3,
            proxy_url: 'http://proxy.com',
            tags: ['tag1', 'tag2'],
            username: 'test-username',
            password: 'test',
            'response.include_headers': true,
            'response.include_body': 'never',
            'check.request.method': null,
            'check.request.body': 'testValue',
            'check.response.status': ['200', '201'],
            'ssl.certificate': 't.string',
            'ssl.certificate_authorities': 't.string',
            'ssl.key': 't.string',
            'ssl.key_passphrase': 't.string',
            'ssl.verification_mode': 'certificate',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2'],
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
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
          data_stream: { type: 'synthetics', dataset: 'tcp' },
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
          },
          id: 'synthetics/tcp-tcp-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
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
          data_stream: { type: 'synthetics', dataset: 'icmp' },
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
          },
          id: 'synthetics/icmp-icmp-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
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
          data_stream: { type: 'synthetics', dataset: 'browser' },
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
            params: { type: 'yaml' },
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
          },
          id: 'synthetics/browser-browser-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
          compiled_stream: {
            __ui: null,
            type: 'browser',
            name: null,
            enabled: true,
            schedule: '@every 3m',
            timeout: null,
            throttling: null,
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
          },
        },
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser.network' },
          id: 'synthetics/browser-browser.network-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
          compiled_stream: {
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
          },
        },
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser.screenshot' },
          id: 'synthetics/browser-browser.screenshot-5863efe0-0368-11ed-8df7-a7424c6f5167-5347cd10-0368-11ed-8df7-a7424c6f5167',
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
  created_at: '2022-07-14T11:30:23.034Z',
  created_by: 'system',
  updated_at: '2022-07-14T11:30:23.034Z',
  updated_by: 'system',
});

export const getTestProjectSyntheticsPolicy = (
  {
    name,
    inputs = {},
  }: {
    name?: string;
    inputs: Record<string, { value: string | boolean; type: string }>;
  } = {
    name: 'check if title is present-Test private location 0',
    inputs: {},
  }
): PackagePolicy => ({
  id: 'cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
  version: 'WzMwNTMsMV0=',
  name: 'check if title is present-Test private location 0',
  namespace: 'default',
  package: { name: 'synthetics', title: 'Elastic Synthetics', version: '0.9.4' },
  enabled: true,
  policy_id: '46034710-0ba6-11ed-ba04-5f123b9faa8b',
  output_id: '',
  inputs: [
    {
      type: 'synthetics/http',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: { type: 'synthetics', dataset: 'http' },
          vars: {
            __ui: { type: 'yaml' },
            enabled: { value: true, type: 'bool' },
            type: { value: 'http', type: 'text' },
            name: { type: 'text' },
            schedule: { value: '"@every 3m"', type: 'text' },
            urls: { type: 'text' },
            'service.name': { type: 'text' },
            timeout: { type: 'text' },
            max_redirects: { type: 'integer' },
            proxy_url: { type: 'text' },
            tags: { type: 'yaml' },
            username: { type: 'text' },
            password: { type: 'password' },
            'response.include_headers': { type: 'bool' },
            'response.include_body': { type: 'text' },
            'check.request.method': { type: 'text' },
            'check.request.headers': { type: 'yaml' },
            'check.request.body': { type: 'yaml' },
            'check.response.status': { type: 'yaml' },
            'check.response.headers': { type: 'yaml' },
            'check.response.body.positive': { type: 'yaml' },
            'check.response.body.negative': { type: 'yaml' },
            'ssl.certificate_authorities': { type: 'yaml' },
            'ssl.certificate': { type: 'yaml' },
            'ssl.key': { type: 'yaml' },
            'ssl.key_passphrase': { type: 'text' },
            'ssl.verification_mode': { type: 'text' },
            'ssl.supported_protocols': { type: 'yaml' },
          },
          id: 'synthetics/http-http-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
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
          data_stream: { type: 'synthetics', dataset: 'tcp' },
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
          },
          id: 'synthetics/tcp-tcp-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
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
          data_stream: { type: 'synthetics', dataset: 'icmp' },
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
          },
          id: 'synthetics/icmp-icmp-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
        },
      ],
    },
    {
      type: 'synthetics/browser',
      policy_template: 'synthetics',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser' },
          vars: {
            __ui: {
              value:
                '{"script_source":{"is_generated_script":false,"file_name":""},"is_zip_url_tls_enabled":false}',
              type: 'yaml',
            },
            enabled: { value: true, type: 'bool' },
            type: { value: 'browser', type: 'text' },
            name: { value: 'check if title is present', type: 'text' },
            schedule: { value: '"@every 10m"', type: 'text' },
            'service.name': { value: '', type: 'text' },
            timeout: { value: null, type: 'text' },
            tags: { value: null, type: 'yaml' },
            'source.zip_url.url': { value: '', type: 'text' },
            'source.zip_url.username': { value: '', type: 'text' },
            'source.zip_url.folder': { value: '', type: 'text' },
            'source.zip_url.password': { value: '', type: 'password' },
            'source.inline.script': { value: null, type: 'yaml' },
            params: { value: '', type: 'yaml' },
            screenshots: { value: 'on', type: 'text' },
            synthetics_args: { value: null, type: 'text' },
            ignore_https_errors: { value: false, type: 'bool' },
            'throttling.config': { value: '5d/3u/20l', type: 'text' },
            'filter_journeys.tags': { value: null, type: 'yaml' },
            'filter_journeys.match': { value: '"check if title is present"', type: 'text' },
            'source.zip_url.ssl.certificate_authorities': { value: null, type: 'yaml' },
            'source.zip_url.ssl.certificate': { value: null, type: 'yaml' },
            'source.zip_url.ssl.key': { value: null, type: 'yaml' },
            'source.zip_url.ssl.key_passphrase': { value: null, type: 'text' },
            'source.zip_url.ssl.verification_mode': { value: null, type: 'text' },
            'source.zip_url.ssl.supported_protocols': { value: null, type: 'yaml' },
            'source.zip_url.proxy_url': { value: '', type: 'text' },
            ...inputs,
          },
          id: 'synthetics/browser-browser-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
          compiled_stream: {
            __ui: {
              script_source: { is_generated_script: false, file_name: '' },
              is_zip_url_tls_enabled: false,
            },
            type: 'browser',
            name: 'check if title is present',
            enabled: true,
            schedule: '@every 10m',
            timeout: null,
            throttling: '5d/3u/20l',
            screenshots: 'on',
            'filter_journeys.match': 'check if title is present',
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
            ...Object.keys(inputs).reduce((acc: Record<string, unknown>, key) => {
              acc[key] = inputs[key].value;
              return acc;
            }, {}),
          },
        },
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser.network' },
          id: 'synthetics/browser-browser.network-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
          compiled_stream: {
            processors: [
              { add_observer_metadata: { geo: { name: 'Fleet managed' } } },
              { add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } },
            ],
          },
        },
        {
          enabled: true,
          data_stream: { type: 'synthetics', dataset: 'browser.screenshot' },
          id: 'synthetics/browser-browser.screenshot-cccec568-e488-4049-a399-def8b6a31f34-test-suite-default-46034710-0ba6-11ed-ba04-5f123b9faa8b',
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
  created_at: '2022-07-24T23:13:55.606Z',
  created_by: 'system',
  updated_at: '2022-07-24T23:13:55.606Z',
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
