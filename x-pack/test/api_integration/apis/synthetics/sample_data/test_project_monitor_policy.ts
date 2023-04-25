/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicy } from '@kbn/fleet-plugin/common';

export const getTestProjectSyntheticsPolicy = (
  {
    name,
    inputs = {},
    configId,
    id,
    projectId = 'test-suite',
    locationName = 'Fleet Managed',
  }: {
    name?: string;
    inputs: Record<string, { value: string | boolean; type: string }>;
    configId: string;
    id: string;
    projectId?: string;
    locationName?: string;
  } = {
    name: 'check if title is present-Test private location 0',
    inputs: {},
    configId: '',
    id: '',
    locationName: 'Fleet Managed',
  }
): PackagePolicy => ({
  id: `4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
  version: 'WzEzMDksMV0=',
  name: `4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-Test private location 0`,
  namespace: 'default',
  package: { name: 'synthetics', title: 'Elastic Synthetics', version: '0.12.0' },
  enabled: true,
  policy_id: '46034710-0ba6-11ed-ba04-5f123b9faa8b',
  inputs: [
    {
      type: 'synthetics/http',
      policy_template: 'synthetics',
      enabled: false,
      streams: [
        {
          enabled: false,
          data_stream: {
            type: 'synthetics',
            dataset: 'http',
          },
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
            location_name: { value: 'Fleet managed', type: 'text' },
            id: { type: 'text' },
            config_id: { type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { type: 'text' },
            'monitor.project.id': { type: 'text' },
            'monitor.project.name': { type: 'text' },
            ipv4: { type: 'bool', value: true },
            ipv6: { type: 'bool', value: true },
            mode: { type: 'text' },
          },
          id: `synthetics/http-http-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
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
            ipv4: { type: 'bool', value: true },
            ipv6: { type: 'bool', value: true },
            mode: { type: 'text' },
          },
          id: `synthetics/tcp-tcp-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
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
            ipv4: { type: 'bool', value: true },
            ipv6: { type: 'bool', value: true },
            mode: { type: 'text' },
          },
          id: `synthetics/icmp-icmp-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
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
            __ui: {
              value: '{"script_source":{"is_generated_script":false,"file_name":""}}',
              type: 'yaml',
            },
            enabled: { value: true, type: 'bool' },
            type: { value: 'browser', type: 'text' },
            name: { value: 'check if title is present', type: 'text' },
            schedule: { value: '"@every 10m"', type: 'text' },
            'service.name': { value: '', type: 'text' },
            timeout: { value: null, type: 'text' },
            tags: { value: null, type: 'yaml' },
            'source.zip_url.url': { type: 'text' },
            'source.zip_url.username': { type: 'text' },
            'source.zip_url.folder': { type: 'text' },
            'source.zip_url.password': { type: 'password' },
            'source.inline.script': { value: null, type: 'yaml' },
            'source.project.content': {
              value:
                'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
              type: 'text',
            },
            params: { value: '', type: 'yaml' },
            playwright_options: {
              value: '{"headless":true,"chromiumSandbox":false}',
              type: 'yaml',
            },
            screenshots: { value: 'on', type: 'text' },
            synthetics_args: { value: null, type: 'text' },
            ignore_https_errors: { value: false, type: 'bool' },
            'throttling.config': {
              value: JSON.stringify({ download: 5, upload: 3, latency: 20 }),
              type: 'text',
            },
            'filter_journeys.tags': { value: null, type: 'yaml' },
            'filter_journeys.match': { value: '"check if title is present"', type: 'text' },
            'source.zip_url.ssl.certificate_authorities': { type: 'yaml' },
            'source.zip_url.ssl.certificate': { type: 'yaml' },
            'source.zip_url.ssl.key': { type: 'yaml' },
            'source.zip_url.ssl.key_passphrase': { type: 'text' },
            'source.zip_url.ssl.verification_mode': { type: 'text' },
            'source.zip_url.ssl.supported_protocols': { type: 'yaml' },
            'source.zip_url.proxy_url': { type: 'text' },
            location_name: { value: 'Test private location 0', type: 'text' },
            id: { value: id, type: 'text' },
            config_id: { value: configId, type: 'text' },
            run_once: { value: false, type: 'bool' },
            origin: { value: 'project', type: 'text' },
            'monitor.project.id': { value: projectId, type: 'text' },
            'monitor.project.name': { value: projectId, type: 'text' },
            ...inputs,
          },
          id: `synthetics/browser-browser-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
          compiled_stream: {
            __ui: {
              script_source: { is_generated_script: false, file_name: '' },
            },
            type: 'browser',
            name: 'check if title is present',
            id,
            origin: 'project',
            enabled: true,
            schedule: '@every 10m',
            'run_from.geo.name': locationName,
            'run_from.id': locationName,
            timeout: null,
            throttling: { download: 5, upload: 3, latency: 20 },
            'source.project.content':
              'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
            playwright_options: { headless: true, chromiumSandbox: false },
            screenshots: 'on',
            'filter_journeys.match': 'check if title is present',
            processors: [
              {
                add_fields: {
                  target: '',
                  fields: {
                    'monitor.fleet_managed': true,
                    config_id: configId,
                    'monitor.project.name': projectId,
                    'monitor.project.id': projectId,
                  },
                },
              },
            ],
            ...Object.keys(inputs).reduce((acc: Record<string, unknown>, key) => {
              acc[key] = inputs[key].value;
              return acc;
            }, {}),
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
          id: `synthetics/browser-browser.network-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
          compiled_stream: {
            processors: [{ add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } }],
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
          id: `synthetics/browser-browser.screenshot-4b6abc6c-118b-4d93-a489-1135500d09f1-${projectId}-default-d70a46e0-22ea-11ed-8c6b-09a2d21dfbc3`,
          compiled_stream: {
            processors: [{ add_fields: { target: '', fields: { 'monitor.fleet_managed': true } } }],
          },
        },
      ],
    },
  ],
  is_managed: true,
  revision: 1,
  created_at: '2022-08-23T13:52:42.531Z',
  created_by: 'system',
  updated_at: '2022-08-23T13:52:42.531Z',
  updated_by: 'system',
});
