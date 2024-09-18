/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('inspectSyntheticsMonitor', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');

    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const kibanaServer = getService('kibanaServer');

    let _monitors: MonitorFields[];

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.clean({ types: ['synthetics-param'] });
      await testPrivateLocations.installSyntheticsPackage();
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
      _monitors = [getFixtureJson('http_monitor'), getFixtureJson('inspect_browser_monitor')];
    });

    it('inspect http monitor', async () => {
      const apiResponse = await monitorTestService.inspectMonitor({
        ..._monitors[0],
        locations: [
          {
            id: 'dev',
            label: 'Dev Service',
            isServiceManaged: true,
          },
        ],
      });

      expect(apiResponse).eql({
        result: {
          publicConfigs: [
            {
              monitors: [
                {
                  type: 'http',
                  schedule: '@every 5m',
                  enabled: true,
                  data_stream: { namespace: 'testnamespace' },
                  streams: [
                    {
                      data_stream: { dataset: 'http', type: 'synthetics' },
                      type: 'http',
                      enabled: true,
                      schedule: '@every 5m',
                      tags: ['tag1', 'tag2'],
                      timeout: '180s',
                      name: 'test-monitor-name',
                      namespace: 'testnamespace',
                      origin: 'ui',
                      urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
                      max_redirects: '3',
                      max_attempts: 2,
                      password: 'test',
                      proxy_url: 'http://proxy.com',
                      'response.include_body': 'never',
                      'response.include_headers': true,
                      'check.response.status': ['200', '201'],
                      'check.request.body': 'testValue',
                      'check.request.headers': { sampleHeader: 'sampleHeaderValue' },
                      username: 'test-username',
                      mode: 'any',
                      'response.include_body_max_bytes': '1024',
                      ipv4: true,
                      ipv6: true,
                      fields: {
                        meta: { space_id: 'default' },
                      },
                      fields_under_root: true,
                    },
                  ],
                },
              ],
              output: { hosts: [] },
              license_level: 'trial',
            },
          ],
          privateConfig: null,
        },
        decodedCode: '',
      });
    });

    it('inspect project browser monitor', async () => {
      const apiResponse = await monitorTestService.inspectMonitor({
        ..._monitors[1],
        params: JSON.stringify({
          username: 'elastic',
          password: 'changeme',
        }),
        locations: [
          {
            id: 'dev',
            label: 'Dev Service',
            isServiceManaged: true,
          },
        ],
      });
      expect(apiResponse).eql({
        result: {
          publicConfigs: [
            {
              monitors: [
                {
                  type: 'browser',
                  schedule: '@every 10m',
                  enabled: true,
                  data_stream: { namespace: 'default' },
                  streams: [
                    {
                      data_stream: { dataset: 'browser', type: 'synthetics' },
                      type: 'browser',
                      enabled: true,
                      schedule: '@every 10m',
                      name: 'check if title is present',
                      namespace: 'default',
                      origin: 'project',
                      params: {
                        username: '"********"',
                        password: '"********"',
                      },
                      playwright_options: { headless: true, chromiumSandbox: false },
                      'source.project.content':
                        'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
                      screenshots: 'on',
                      'filter_journeys.match': 'check if title is present',
                      ignore_https_errors: false,
                      throttling: { download: 5, upload: 3, latency: 20 },
                      original_space: 'default',
                      fields: {
                        meta: { space_id: 'default' },
                        'monitor.project.name': 'test-project-cb47c83a-45e7-416a-9301-cb476b5bff01',
                        'monitor.project.id': 'test-project-cb47c83a-45e7-416a-9301-cb476b5bff01',
                      },
                      fields_under_root: true,
                      max_attempts: 2,
                    },
                  ],
                },
              ],
              license_level: 'trial',
              output: { hosts: [] },
            },
          ],
          privateConfig: null,
        },
        decodedCode:
          '// asset:/Users/vigneshh/elastic/synthetics/examples/todos/basic.journey.ts\nimport { journey, step, expect } from "@elastic/synthetics";\njourney("check if title is present", ({ page, params }) => {\n  step("launch app", async () => {\n    await page.goto(params.url);\n  });\n  step("assert title", async () => {\n    const header = await page.$("h1");\n    expect(await header.textContent()).toBe("todos");\n  });\n});\n',
      });
    });

    it('inspect http monitor  in private location', async () => {
      const location = await testPrivateLocations.addTestPrivateLocation();
      const apiResponse = await monitorTestService.inspectMonitor({
        ..._monitors[0],
        locations: [
          {
            id: location.id,
            label: location.label,
            isServiceManaged: false,
          },
        ],
      });

      const privateConfig = apiResponse.result.privateConfig!;

      const enabledStream = privateConfig.inputs
        .find((input) => input.enabled)
        ?.streams.find((stream) => stream.enabled);

      const compiledStream = enabledStream?.compiled_stream;

      delete compiledStream.id;
      delete compiledStream.processors[0].add_fields.fields.config_id;

      expect(enabledStream?.compiled_stream).eql({
        __ui: { is_tls_enabled: false },
        type: 'http',
        name: 'test-monitor-name',
        origin: 'ui',
        'run_from.id': location.id,
        'run_from.geo.name': 'Test private location 0',
        enabled: true,
        urls: 'https://nextjs-test-synthetics.vercel.app/api/users',
        schedule: '@every 5m',
        timeout: '180s',
        max_redirects: 3,
        max_attempts: 2,
        proxy_url: 'http://proxy.com',
        tags: ['tag1', 'tag2'],
        username: 'test-username',
        password: 'test',
        'response.include_headers': true,
        'response.include_body': 'never',
        'response.include_body_max_bytes': 1024,
        'check.request.method': null,
        'check.request.headers': { sampleHeader: 'sampleHeaderValue' },
        'check.request.body': 'testValue',
        'check.response.status': ['200', '201'],
        mode: 'any',
        ipv4: true,
        ipv6: true,
        processors: [
          {
            add_fields: {
              target: '',
              fields: {
                meta: { space_id: 'default' },
                'monitor.fleet_managed': true,
              },
            },
          },
        ],
      });
    });
  });
}
