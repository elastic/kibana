/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, sortBy } from 'lodash';
import expect from '@kbn/expect';
import { PackagePolicy, PackagePolicyConfigRecord } from '@kbn/fleet-plugin/common';
import { INSTALLED_VERSION } from '../services/private_location_test_service';
import { commonVars } from './test_project_monitor_policy';

interface PolicyProps {
  name?: string;
  id: string;
  configId?: string;
  projectId?: string;
  location: { name?: string; id?: string };
  namespace?: string;
  isTLSEnabled?: boolean;
  proxyUrl?: string;
  params?: Record<string, any>;
  isBrowser?: boolean;
  spaceId?: string;
}

export const getTestSyntheticsPolicy = (props: PolicyProps): PackagePolicy => {
  const { namespace } = props;
  return {
    id: '2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
    version: 'WzE2MjYsMV0=',
    name: 'test-monitor-name-Test private location 0-default',
    namespace: namespace ?? 'testnamespace',
    package: { name: 'synthetics', title: 'Elastic Synthetics', version: INSTALLED_VERSION },
    enabled: true,
    policy_id: '5347cd10-0368-11ed-8df7-a7424c6f5167',
    policy_ids: ['5347cd10-0368-11ed-8df7-a7424c6f5167'],
    inputs: [
      getHttpInput(props),
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
              processors: { type: 'yaml' },
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
              origin: { type: 'text' },
              ipv4: { type: 'bool', value: true },
              ipv6: { type: 'bool', value: true },
              mode: { type: 'text' },
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
              origin: { type: 'text' },
              ipv4: { type: 'bool', value: true },
              ipv6: { type: 'bool', value: true },
              mode: { type: 'text' },
            },
            id: 'synthetics/icmp-icmp-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
          },
        ],
      },
      getBrowserInput(props),
    ],
    is_managed: true,
    revision: 1,
    created_at: '2022-08-23T14:09:17.176Z',
    created_by: 'system',
    updated_at: '2022-08-23T14:09:17.176Z',
    updated_by: 'system',
  };
};

export const getHttpInput = ({
  projectId,
  id,
  location,
  proxyUrl,
  isTLSEnabled,
  isBrowser,
  spaceId,
  namespace,
  name = 'check if title is present-Test private location 0',
}: PolicyProps) => {
  const enabled = !isBrowser;
  const baseVars: PackagePolicyConfigRecord = {
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
    processors: { type: 'yaml' },
    proxy_headers: { type: 'yaml' },
    tags: { type: 'yaml' },
    username: { type: 'text' },
    password: { type: 'password' },
    'response.include_headers': { type: 'bool' },
    'response.include_body': { type: 'text' },
    'response.include_body_max_bytes': { type: 'text' },
    'check.request.method': { type: 'text' },
    'check.request.headers': { type: 'yaml' },
    'check.request.body': { type: 'yaml' },
    'check.response.status': { type: 'yaml' },
    'check.response.headers': { type: 'yaml' },
    'check.response.body.positive': { type: 'yaml' },
    'check.response.body.negative': { type: 'yaml' },
    'check.response.json': { type: 'yaml' },
    'ssl.certificate_authorities': { type: 'yaml' },
    'ssl.certificate': { type: 'yaml' },
    'ssl.key': { type: 'yaml' },
    'ssl.key_passphrase': { type: 'text' },
    'ssl.verification_mode': { type: 'text' },
    'ssl.supported_protocols': { type: 'yaml' },
    location_id: { value: 'fleet_managed', type: 'text' },
    location_name: { value: 'Fleet managed', type: 'text' },
    ...commonVars,
    id: { type: 'text' },
    origin: { type: 'text' },
    ipv4: { type: 'bool', value: true },
    ipv6: { type: 'bool', value: true },
    mode: { type: 'text' },
  };

  const enabledVars = {
    __ui: {
      value: `{"is_tls_enabled":${isTLSEnabled || false}}`,
      type: 'yaml',
    },
    enabled: { value: true, type: 'bool' },
    type: { value: 'http', type: 'text' },
    name: { value: JSON.stringify(name), type: 'text' },
    schedule: { value: '"@every 5m"', type: 'text' },
    urls: { value: '"https://nextjs-test-synthetics.vercel.app/api/users"', type: 'text' },
    'service.name': { value: null, type: 'text' },
    timeout: { value: '180s', type: 'text' },
    max_redirects: { value: '3', type: 'integer' },
    processors: {
      type: 'yaml',
      value: JSON.stringify([
        {
          add_fields: {
            fields: {
              'monitor.fleet_managed': true,
              config_id: id,
              meta: { space_id: spaceId ?? 'default' },
              'monitor.project.name': projectId,
              'monitor.project.id': projectId,
            },
            target: '',
          },
        },
      ]),
    },
    proxy_url: { value: proxyUrl ?? '"http://proxy.com"', type: 'text' },
    proxy_headers: { value: null, type: 'yaml' },
    tags: { value: '["tag1","tag2"]', type: 'yaml' },
    username: { value: '"test-username"', type: 'text' },
    password: { value: '"test"', type: 'password' },
    'response.include_headers': { value: true, type: 'bool' },
    'response.include_body': { value: 'never', type: 'text' },
    'response.include_body_max_bytes': { value: '1024', type: 'text' },
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
    'check.response.json': { value: null, type: 'yaml' },
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
    location_id: {
      type: 'text',
      value: location.id ?? 'aaa3c150-f94d-11ed-9895-d36d5472fafd',
    },
    location_name: {
      value: JSON.stringify(location.name) ?? '"Test private location 0"',
      type: 'text',
    },
    ...commonVars,
    id: { value: JSON.stringify(id), type: 'text' },
    origin: { value: projectId ? 'project' : 'ui', type: 'text' },
    ipv4: { type: 'bool', value: true },
    ipv6: { type: 'bool', value: true },
    mode: { type: 'text', value: 'any' },
  };

  const compiledHttpStream = {
    __ui: {
      is_tls_enabled: isTLSEnabled || false,
    },
    type: 'http',
    name,
    id,
    origin: projectId ? 'project' : 'ui',
    enabled: true,
    urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
    schedule: '@every 5m',
    timeout: '180s',
    max_redirects: 3,
    max_attempts: 2,
    proxy_url: proxyUrl ?? 'http://proxy.com',
    tags: ['tag1', 'tag2'],
    username: 'test-username',
    password: 'test',
    'run_from.geo.name': location?.name ?? 'Test private location 0',
    'run_from.id': location?.id ?? 'Test private location 0',
    'response.include_headers': true,
    'response.include_body': 'never',
    'response.include_body_max_bytes': 1024,
    'check.request.method': null,
    'check.request.headers': { sampleHeader: 'sampleHeaderValue' },
    'check.request.body': 'testValue',
    'check.response.status': ['200', '201'],
    ipv4: true,
    ipv6: true,
    mode: 'any',
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
          fields: {
            config_id: id,
            meta: {
              space_id: spaceId ?? 'default',
            },
            'monitor.fleet_managed': true,
            ...(projectId
              ? { 'monitor.project.id': projectId, 'monitor.project.name': projectId }
              : {}),
          },
          target: '',
        },
      },
    ],
  };

  return {
    type: 'synthetics/http',
    policy_template: 'synthetics',
    enabled,
    streams: [
      {
        enabled,
        data_stream: {
          type: 'synthetics',
          dataset: 'http',
          ...(enabled
            ? {
                elasticsearch: {
                  privileges: {
                    indices: ['auto_configure', 'create_doc', 'read'],
                  },
                },
              }
            : {}),
        },
        vars: enabled ? enabledVars : baseVars,
        id: 'synthetics/http-http-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        ...(enabled ? { compiled_stream: compiledHttpStream } : {}),
      },
    ],
  };
};

export const getBrowserInput = ({ id, params, isBrowser, projectId }: PolicyProps) => {
  const compiledBrowser = isBrowser
    ? {
        __ui: {
          script_source: { is_generated_script: false, file_name: '' },
          is_tls_enabled: false,
        },
        type: 'browser',
        name: 'Test HTTP Monitor 03',
        id,
        origin: 'ui',
        'run_from.id': 'Test private location 0',
        'run_from.geo.name': 'Test private location 0',
        enabled: true,
        schedule: '@every 3m',
        timeout: '16s',
        throttling: { download: 5, upload: 3, latency: 20 },
        tags: ['cookie-test', 'browser'],
        'source.inline.script':
          'step("Visit /users api route", async () => {\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\n  expect(response.status()).toEqual(200);\\n});',
        ...(params ? { params } : {}),
        screenshots: 'on',
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
      }
    : {
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
      };

  const browserVars = isBrowser
    ? {
        __ui: {
          value:
            '{"script_source":{"is_generated_script":false,"file_name":""},"is_tls_enabled":false}',
          type: 'yaml',
        },
        enabled: { value: true, type: 'bool' },
        type: { value: 'browser', type: 'text' },
        name: { value: 'Test HTTP Monitor 03', type: 'text' },
        schedule: { value: '"@every 3m"', type: 'text' },
        'service.name': { value: '', type: 'text' },
        timeout: { value: '16s', type: 'text' },
        tags: { value: '["cookie-test","browser"]', type: 'yaml' },
        'source.zip_url.url': { type: 'text' },
        'source.zip_url.username': { type: 'text' },
        'source.zip_url.folder': { type: 'text' },
        'source.zip_url.password': { type: 'password' },
        'source.inline.script': {
          value:
            '"step(\\"Visit /users api route\\", async () => {\\\\n  const response = await page.goto(\'https://nextjs-test-synthetics.vercel.app/api/users\');\\\\n  expect(response.status()).toEqual(200);\\\\n});"',
          type: 'yaml',
        },
        'source.project.content': { value: '', type: 'text' },
        params: { value: params ? JSON.stringify(params) : '', type: 'yaml' },
        playwright_options: { value: '', type: 'yaml' },
        screenshots: { value: 'on', type: 'text' },
        synthetics_args: { value: null, type: 'text' },
        ignore_https_errors: { value: false, type: 'bool' },
        'throttling.config': {
          value: JSON.stringify({ download: 5, upload: 3, latency: 20 }),
          type: 'text',
        },
        'filter_journeys.tags': { value: null, type: 'yaml' },
        'filter_journeys.match': { value: null, type: 'text' },
        'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
        'source.zip_url.ssl.certificate': { type: 'yaml' },
        'source.zip_url.ssl.key': { type: 'yaml' },
        'source.zip_url.ssl.key_passphrase': { type: 'text' },
        'source.zip_url.ssl.verification_mode': { type: 'text' },
        'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
        'source.zip_url.proxy_url': { type: 'text' },
        location_id: {
          type: 'text',
          value: 'fleet_managed',
        },
        location_name: { value: 'Test private location 0', type: 'text' },
        id: { value: id, type: 'text' },
        origin: { value: 'ui', type: 'text' },
      }
    : {
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
        location_id: { value: 'Fleet managed', type: 'text' },
        id: { type: 'text' },
        origin: { type: 'text' },
      };

  return {
    type: 'synthetics/browser',
    policy_template: 'synthetics',
    enabled: false,
    streams: [
      {
        enabled: true,
        data_stream: getDataStream('browser'),
        vars: browserVars,
        id: 'synthetics/browser-browser-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        compiled_stream: compiledBrowser,
      },
      {
        enabled: true,
        data_stream: getDataStream('browser.network'),
        id: 'synthetics/browser-browser.network-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        compiled_stream: {
          processors: [{ add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } }],
        },
      },
      {
        enabled: true,
        data_stream: getDataStream('browser.screenshot'),
        id: 'synthetics/browser-browser.screenshot-2bfd7da0-22ed-11ed-8c6b-09a2d21dfbc3-27337270-22ed-11ed-8c6b-09a2d21dfbc3-default',
        compiled_stream: {
          processors: [{ add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } }],
        },
      },
    ],
  };
};

export const getDataStream = (dataset: string) => ({
  dataset,
  type: 'synthetics',
  elasticsearch: {
    privileges: {
      indices: ['auto_configure', 'create_doc', 'read'],
    },
  },
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
  const a = omitIds(aPolicy);
  const b = omitIds(bPolicy);

  const aHttpInput = a.inputs?.find((input) => input.type === 'synthetics/http');
  const aTcpInput = b.inputs?.find((input) => input.type === 'synthetics/tcp');
  const aIcmpInput = b.inputs?.find((input) => input.type === 'synthetics/icmp');
  const aBrowserInput = b.inputs?.find((input) => input.type === 'synthetics/browser');

  const bHttpInput = b.inputs?.find((input) => input.type === 'synthetics/http');
  const bTcpInput = b.inputs?.find((input) => input.type === 'synthetics/tcp');
  const bIcmpInput = b.inputs?.find((input) => input.type === 'synthetics/icmp');
  const bBrowserInput = b.inputs?.find((input) => input.type === 'synthetics/browser');

  expect(aHttpInput).eql(bHttpInput);
  expect(aTcpInput).eql(bTcpInput);
  expect(aIcmpInput).eql(bIcmpInput);
  expect(aBrowserInput).eql(bBrowserInput);

  // delete inputs to compare rest of policy
  delete a.inputs;
  delete b.inputs;

  expect(a).eql(b);
};

export const ignoreTestFields = [
  'id',
  'name',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
  'policy_id',
  'policy_ids',
  'version',
  'revision',
];
