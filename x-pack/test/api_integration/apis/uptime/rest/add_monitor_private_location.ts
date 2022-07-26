/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { omit } from 'lodash';
import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { comparePolicies, testSyntheticsPolicy } from './sample_data/test_policy';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('PrivateLocationMonitor', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');

    let testFleetPolicyID: string;

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const testPrivateLocations = new PrivateLocationTestService(getService);

    before(async () => {
      await supertestAPI.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertestAPI
        .post('/api/fleet/epm/packages/synthetics/0.9.5')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = _httpMonitorJson;
    });

    const testPolicyName = 'Fleet test server policy' + Date.now();

    it('adds a test fleet policy', async () => {
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testFleetPolicyID = apiResponse.body.item.id;
    });

    it('add a test private location', async () => {
      await testPrivateLocations.setTestLocations([testFleetPolicyID]);

      const apiResponse = await supertestAPI.get(API_URLS.SERVICE_LOCATIONS);

      expect(apiResponse.body.locations).eql([
        {
          id: 'localhost',
          label: 'Local Synthetics Service',
          geo: { lat: 0, lon: 0 },
          url: 'mockDevUrl',
          isServiceManaged: true,
          status: 'experimental',
          isInvalid: false,
        },
        {
          concurrentMonitors: 1,
          id: testFleetPolicyID,
          isInvalid: false,
          isServiceManaged: false,
          label: 'Test private location 0',
          geo: {
            lat: '',
            lon: '',
          },
          name: 'Test private location 0',
          agentPolicyId: testFleetPolicyID,
        },
      ]);
    });

    let newMonitorId: string;

    it('adds a monitor in private location', async () => {
      const newMonitor = httpMonitorJson;

      newMonitor.locations.push({
        id: testFleetPolicyID,
        label: 'Test private location 0',
        isServiceManaged: false,
      });

      const apiResponse = await supertestAPI
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.body.attributes).eql(omit(newMonitor, secretKeys));
      newMonitorId = apiResponse.body.id;
    });

    it('added an integration for previously added monitor', async () => {
      const apiResponse = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponse.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(packagePolicy, testSyntheticsPolicy);
    });

    let testFleetPolicyID2: string;

    it('edits a monitor with additional private location', async () => {
      const resPolicy = await testPrivateLocations.addFleetPolicy(testPolicyName + 1);
      testFleetPolicyID2 = resPolicy.body.item.id;

      await testPrivateLocations.setTestLocations([testFleetPolicyID, testFleetPolicyID2]);

      httpMonitorJson.locations.push({
        id: testFleetPolicyID2,
        label: 'Test private location ' + 1,
        isServiceManaged: false,
      });

      const apiResponse = await supertestAPI
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson);

      expect(apiResponse.body.attributes).eql(
        omit({ ...httpMonitorJson, revision: 2 }, secretKeys)
      );
    });

    it('added an integration for second location in edit monitor', async () => {
      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(packagePolicy, testSyntheticsPolicy);

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID2);
      comparePolicies(packagePolicy, testSyntheticsPolicy);
    });

    it('deletes integration for a removed location from monitor', async () => {
      httpMonitorJson.locations = httpMonitorJson.locations.filter(
        ({ id }) => id !== testFleetPolicyID2
      );

      await supertestAPI
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(200);

      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      let packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID + '-default'
      );

      expect(packagePolicy.policy_id).eql(testFleetPolicyID);

      comparePolicies(packagePolicy, testSyntheticsPolicy);

      packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) =>
          pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID2 + '-default'
      );

      expect(packagePolicy).eql(undefined);
    });

    it('deletes integration for a deleted monitor', async () => {
      await supertestAPI
        .delete(API_URLS.SYNTHETICS_MONITORS + '/' + newMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(200);

      const apiResponsePolicy = await supertestAPI.get(
        '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
      );

      const packagePolicy = apiResponsePolicy.body.items.find(
        (pkgPolicy: PackagePolicy) => pkgPolicy.id === newMonitorId + '-' + testFleetPolicyID
      );

      expect(packagePolicy).eql(undefined);
    });
  });
}

const testPolicy = [
  {
    id: 'bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
    version: 'WzY3MiwxXQ==',
    name: 'test-monitor-name-Test private location 0-default',
    namespace: 'default',
    package: { name: 'synthetics', title: 'Elastic Synthetics', version: '0.9.5' },
    enabled: true,
    policy_id: 'b5eabd90-0cd9-11ed-8831-394fa52332a2',
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
              name: { value: 'test-monitor-name', type: 'text' },
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
            id: 'synthetics/http-http-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
            compiled_stream: {
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
                script_source: { is_generated_script: false, file_name: 'test-file.name' },
              },
              type: 'http',
              name: 'test-monitor-name',
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
            id: 'synthetics/tcp-tcp-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
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
            id: 'synthetics/icmp-icmp-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
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
            id: 'synthetics/browser-browser-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
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
            id: 'synthetics/browser-browser.network-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
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
            id: 'synthetics/browser-browser.screenshot-bb6b2070-0cd9-11ed-8831-394fa52332a2-b5eabd90-0cd9-11ed-8831-394fa52332a2-default',
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
    created_at: '2022-07-26T11:54:43.077Z',
    created_by: 'system',
    updated_at: '2022-07-26T11:54:43.077Z',
    updated_by: 'system',
  },
];
