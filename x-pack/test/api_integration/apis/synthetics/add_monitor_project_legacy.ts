/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fetch, { BodyInit, HeadersInit, Response } from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { format as formatUrl } from 'url';
import {
  ConfigKey,
  LegacyProjectMonitorsRequest,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { comparePolicies } from './sample_data/test_policy';
import { getTestProjectSyntheticsPolicy } from './sample_data/test_project_monitor_policy';

export default function ({ getService }: FtrProviderContext) {
  describe('AddProjectLegacyMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const config = getService('config');
    const kibanaServerUrl = formatUrl(config.get('servers.kibana'));
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');
    const projectMonitorEndpoint = kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY;

    let projectMonitors: LegacyProjectMonitorsRequest;
    let httpProjectMonitors: LegacyProjectMonitorsRequest;
    let tcpProjectMonitors: LegacyProjectMonitorsRequest;
    let icmpProjectMonitors: LegacyProjectMonitorsRequest;

    let testPolicyId = '';
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: LegacyProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    const deleteMonitor = async (
      journeyId: string,
      projectId: string,
      space: string = 'default',
      username: string = '',
      password: string = ''
    ) => {
      try {
        const response = await supertest
          .get(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorType}.attributes.project_id: "${projectId}"`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = response.body;
        if (monitors[0]?.id) {
          await supertest
            .delete(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}/${monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .send(projectMonitors)
            .expect(200);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    before(async () => {
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .post('/api/fleet/epm/packages/synthetics/0.11.4')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds(getFixtureJson('project_browser_monitor'));
      httpProjectMonitors = setUniqueIds(getFixtureJson('project_http_monitor'));
      tcpProjectMonitors = setUniqueIds(getFixtureJson('project_tcp_monitor'));
      icmpProjectMonitors = setUniqueIds(getFixtureJson('project_icmp_monitor'));
    });

    it('project monitors - handles browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];

      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].createdMonitors).eql(successfulMonitors.map((monitor) => monitor.id));
        expect(messages[1].failedMonitors).eql([]);

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const createdMonitorsResponse = await supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
            .set('kbn-xsrf', 'true')
            .expect(200);

          const decryptedCreatedMonitor = await supertest
            .get(`${API_URLS.SYNTHETICS_MONITORS}/${createdMonitorsResponse.body.monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(decryptedCreatedMonitor.body.attributes).to.eql({
            __ui: {
              is_zip_url_tls_enabled: false,
              script_source: {
                file_name: '',
                is_generated_script: false,
              },
            },
            config_id: decryptedCreatedMonitor.body.id,
            custom_heartbeat_id: `${journeyId}-test-suite-default`,
            enabled: true,
            alert: {
              status: {
                enabled: true,
              },
            },
            'filter_journeys.match': 'check if title is present',
            'filter_journeys.tags': [],
            form_monitor_type: 'multistep',
            ignore_https_errors: false,
            journey_id: journeyId,
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'localhost',
                isServiceManaged: true,
                label: 'Local Synthetics Service',
              },
            ],
            name: 'check if title is present',
            namespace: 'default',
            origin: 'project',
            original_space: 'default',
            playwright_options: '{"headless":true,"chromiumSandbox":false}',
            playwright_text_assertion: '',
            project_id: 'test-suite',
            params: '',
            revision: 1,
            schedule: {
              number: '10',
              unit: 'm',
            },
            screenshots: 'on',
            'service.name': '',
            'source.zip_url.folder': '',
            'source.zip_url.proxy_url': '',
            'source.zip_url.url': '',
            'source.zip_url.password': '',
            'source.zip_url.username': '',
            synthetics_args: [],
            tags: [],
            'throttling.config': '5d/3u/20l',
            'throttling.download_speed': '5',
            'throttling.is_enabled': true,
            'throttling.latency': '20',
            'throttling.upload_speed': '3',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': 'full',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            'source.inline.script': '',
            'source.project.content':
              'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
            timeout: null,
            type: 'browser',
            'url.port': null,
            urls: '',
            id: `${journeyId}-test-suite-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, httpProjectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - handles http monitors', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const successfulMonitors = [httpProjectMonitors.monitors[1]];

      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(httpProjectMonitors)
        );

        expect(messages).to.have.length(3);
        expect(messages[2].updatedMonitors).eql([]);
        expect(messages[2].createdMonitors).eql(successfulMonitors.map((monitor) => monitor.id));
        expect(messages[2].failedMonitors).eql([
          {
            id: httpProjectMonitors.monitors[0].id,
            details: `\`http\` project monitors must have exactly one value for field \`urls\` in version \`${kibanaVersion}\`. Your monitor was not created or updated.`,
            reason: 'Invalid Heartbeat configuration',
          },
          {
            id: httpProjectMonitors.monitors[0].id,
            details: `The following Heartbeat options are not supported for ${httpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: check.response.body|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
            reason: 'Unsupported Heartbeat option',
          },
        ]);

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const isTLSEnabled = Object.keys(monitor).some((key) => key.includes('ssl'));
          const createdMonitorsResponse = await supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
            .set('kbn-xsrf', 'true')
            .expect(200);

          const decryptedCreatedMonitor = await supertest
            .get(`${API_URLS.SYNTHETICS_MONITORS}/${createdMonitorsResponse.body.monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(decryptedCreatedMonitor.body.attributes).to.eql({
            __ui: {
              is_tls_enabled: isTLSEnabled,
            },
            'check.request.method': 'POST',
            'check.response.status': ['200'],
            config_id: decryptedCreatedMonitor.body.id,
            custom_heartbeat_id: `${journeyId}-test-suite-default`,
            'check.response.body.negative': [],
            'check.response.body.positive': ['Saved', 'saved'],
            'check.response.headers': {},
            'check.request.body': {
              type: 'text',
              value: '',
            },
            'check.request.headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            enabled: false,
            alert: {
              status: {
                enabled: true,
              },
            },
            form_monitor_type: 'http',
            journey_id: journeyId,
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'localhost',
                isServiceManaged: true,
                label: 'Local Synthetics Service',
              },
            ],
            max_redirects: '0',
            name: monitor.name,
            namespace: 'default',
            origin: 'project',
            original_space: 'default',
            project_id: 'test-suite',
            username: '',
            password: '',
            proxy_url: '',
            'response.include_body': 'always',
            'response.include_headers': false,
            revision: 1,
            schedule: {
              number: '60',
              unit: 'm',
            },
            'service.name': '',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': isTLSEnabled ? 'strict' : 'full',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            tags: Array.isArray(monitor.tags) ? monitor.tags : monitor.tags?.split(','),
            timeout: '80',
            type: 'http',
            urls: Array.isArray(monitor.urls) ? monitor.urls?.[0] : monitor.urls,
            'url.port': null,
            id: `${journeyId}-test-suite-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, httpProjectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - handles tcp monitors', async () => {
      const successfulMonitors = [tcpProjectMonitors.monitors[0], tcpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();

      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(tcpProjectMonitors)
        );

        expect(messages).to.have.length(3);
        expect(messages[2].updatedMonitors).eql([]);
        expect(messages[2].createdMonitors).eql(successfulMonitors.map((monitor) => monitor.id));
        expect(messages[2].failedMonitors).eql([
          {
            id: tcpProjectMonitors.monitors[2].id,
            details: `\`tcp\` project monitors must have exactly one value for field \`hosts\` in version \`${kibanaVersion}\`. Your monitor was not created or updated.`,
            reason: 'Invalid Heartbeat configuration',
          },
          {
            id: tcpProjectMonitors.monitors[2].id,
            details: `The following Heartbeat options are not supported for ${tcpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: ports|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
            reason: 'Unsupported Heartbeat option',
          },
        ]);

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const isTLSEnabled = Object.keys(monitor).some((key) => key.includes('ssl'));
          const createdMonitorsResponse = await supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
            .set('kbn-xsrf', 'true')
            .expect(200);

          const decryptedCreatedMonitor = await supertest
            .get(`${API_URLS.SYNTHETICS_MONITORS}/${createdMonitorsResponse.body.monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(decryptedCreatedMonitor.body.attributes).to.eql({
            __ui: {
              is_tls_enabled: isTLSEnabled,
            },
            config_id: decryptedCreatedMonitor.body.id,
            custom_heartbeat_id: `${journeyId}-test-suite-default`,
            'check.receive': '',
            'check.send': '',
            enabled: true,
            alert: {
              status: {
                enabled: true,
              },
            },
            form_monitor_type: 'tcp',
            journey_id: journeyId,
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'localhost',
                isServiceManaged: true,
                label: 'Local Synthetics Service',
              },
            ],
            name: monitor.name,
            namespace: 'default',
            origin: 'project',
            original_space: 'default',
            project_id: 'test-suite',
            revision: 1,
            schedule: {
              number: '1',
              unit: 'm',
            },
            proxy_url: '',
            proxy_use_local_resolver: false,
            'service.name': '',
            'ssl.certificate': '',
            'ssl.certificate_authorities': '',
            'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
            'ssl.verification_mode': isTLSEnabled ? 'strict' : 'full',
            'ssl.key': '',
            'ssl.key_passphrase': '',
            tags: Array.isArray(monitor.tags) ? monitor.tags : monitor.tags?.split(','),
            timeout: '16',
            type: 'tcp',
            hosts: Array.isArray(monitor.hosts) ? monitor.hosts?.[0] : monitor.hosts,
            'url.port': null,
            urls: '',
            id: `${journeyId}-test-suite-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, tcpProjectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - handles icmp monitors', async () => {
      const successfulMonitors = [icmpProjectMonitors.monitors[0], icmpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();

      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(icmpProjectMonitors)
        );

        expect(messages).to.have.length(3);
        expect(messages[2].updatedMonitors).eql([]);
        expect(messages[2].createdMonitors).eql(successfulMonitors.map((monitor) => monitor.id));
        expect(messages[2].failedMonitors).eql([
          {
            id: icmpProjectMonitors.monitors[2].id,
            details: `\`icmp\` project monitors must have exactly one value for field \`hosts\` in version \`${kibanaVersion}\`. Your monitor was not created or updated.`,
            reason: 'Invalid Heartbeat configuration',
          },
          {
            id: icmpProjectMonitors.monitors[2].id,
            details: `The following Heartbeat options are not supported for ${icmpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
            reason: 'Unsupported Heartbeat option',
          },
        ]);

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const createdMonitorsResponse = await supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
            .set('kbn-xsrf', 'true')
            .expect(200);

          const decryptedCreatedMonitor = await supertest
            .get(`${API_URLS.SYNTHETICS_MONITORS}/${createdMonitorsResponse.body.monitors[0].id}`)
            .set('kbn-xsrf', 'true')
            .expect(200);

          expect(decryptedCreatedMonitor.body.attributes).to.eql({
            config_id: decryptedCreatedMonitor.body.id,
            custom_heartbeat_id: `${journeyId}-test-suite-default`,
            enabled: true,
            alert: {
              status: {
                enabled: true,
              },
            },
            form_monitor_type: 'icmp',
            journey_id: journeyId,
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'localhost',
                isServiceManaged: true,
                label: 'Local Synthetics Service',
              },
              {
                geo: {
                  lat: '',
                  lon: '',
                },
                id: testPolicyId,
                isServiceManaged: false,
                label: 'Test private location 0',
              },
            ],
            name: monitor.name,
            namespace: 'default',
            origin: 'project',
            original_space: 'default',
            project_id: 'test-suite',
            revision: 1,
            schedule: {
              number: '1',
              unit: 'm',
            },
            'service.name': '',
            tags: Array.isArray(monitor.tags) ? monitor.tags : monitor.tags?.split(','),
            timeout: '16',
            type: 'icmp',
            hosts: Array.isArray(monitor.hosts) ? monitor.hosts?.[0] : monitor.hosts,
            wait:
              monitor.wait?.slice(-1) === 's'
                ? monitor.wait?.slice(0, -1)
                : `${parseInt(monitor.wait?.slice(0, -1) || '1', 10) * 60}`,
            id: `${journeyId}-test-suite-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, icmpProjectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - returns a list of successfully created monitors', async () => {
      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].createdMonitors).eql(
          projectMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - returns error if the space does not exist', async () => {
      const messages = await parseStreamApiResponse(
        kibanaServerUrl + '/s/i_dont_exist' + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
        JSON.stringify(projectMonitors)
      );

      expect(messages).to.have.length(2);
      expect(messages[0]).to.equal(
        "Unable to create monitors. Kibana space 'i_dont_exist' does not exist."
      );
      expect(messages[1].failedMonitors).to.eql(projectMonitors.monitors.map((m) => m.id));
    });

    it('project monitors - returns a list of successfully updated monitors', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[0]).eql(' 1 monitor found with no changes.');
        expect(messages[1].createdMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql(
          projectMonitors.monitors.map((monitor) => monitor.id)
        );
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not increment monitor revision unless a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(1);
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - increments monitor revision when a change has been made', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const editedMonitors = {
          ...projectMonitors,
          monitors: projectMonitors.monitors.map((monitor) => ({
            ...monitor,
            content: 'changed content',
          })),
        };

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(editedMonitors)
        );

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.revision).eql(2);
        });
        expect(messages[0]).eql('1 monitor updated successfully. ');
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not delete monitors when keep stale is true', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: testMonitors,
          });

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );

        expect(messages).to.have.length(2);
        expect(messages[0]).eql(' 1 monitor found with no changes.');
        expect(messages[1].createdMonitors).eql([]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].staleMonitors).eql([secondMonitor.id]);
        // does not delete the stale monitor
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - deletes monitors when keep stale is false', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
            project: 'test-project-2',
          });

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            project: 'test-project-2',
          })
        );

        expect(messages).to.have.length(3);

        // expect monitor to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;
        expect(monitors[0]).eql(undefined);
        expect(messages[0]).eql(` 1 monitor found with no changes.`);
        expect(messages[1]).eql(`Monitor ${secondMonitor.id} deleted successfully`);
        expect(messages[2].createdMonitors).eql([]);
        expect(messages[2].failedMonitors).eql([]);
        expect(messages[2].updatedMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[2].deletedMonitors).eql([secondMonitor.id]);
        expect(messages[2].staleMonitors).eql([]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - does not delete monitors from different suites when keep stale is false', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const testprojectId = 'test-suite-2';
      try {
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
        );

        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            project: testprojectId,
          })
        );

        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].staleMonitors).eql([]);

        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = getResponse.body;

        expect(monitors.length).eql(1);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);

        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, testprojectId);
          }),
        ]);
      }
    });

    it('project monitors - does not delete a monitor from the same suite in a different space', async () => {
      const secondMonitor = { ...projectMonitors.monitors[0], id: 'test-id-2' };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({ ...projectMonitors, keep_stale: false, monitors: testMonitors }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );

        const spaceUrl =
          kibanaServerUrl + `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY}`;

        const messages = await parseStreamApiResponse(
          spaceUrl,
          JSON.stringify({ ...projectMonitors, keep_stale: false }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );
        expect(messages).to.have.length(2);
        expect(messages[1].createdMonitors).eql([projectMonitors.monitors[0].id]);
        expect(messages[1].failedMonitors).eql([]);
        expect(messages[1].deletedMonitors).eql([]);
        expect(messages[1].updatedMonitors).eql([]);
        expect(messages[1].staleMonitors).eql([]);

        const getResponse = await supertestWithoutAuth
          .get(API_URLS.SYNTHETICS_MONITORS)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${secondMonitor.id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(
              monitor.id,
              projectMonitors.project,
              'default',
              username,
              password
            );
          }),
        ]);
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - validates monitor type', async () => {
      try {
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], schedule: '3m', tags: '' }],
          })
        );

        expect(messages).to.have.length(1);
        expect(messages[0].updatedMonitors).eql([]);
        expect(messages[0].failedMonitors).eql([
          {
            details: 'Invalid value "3m" supplied to "schedule"',
            id: projectMonitors.monitors[0].id,
            payload: {
              content:
                'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
              filter: {
                match: 'check if title is present',
              },
              id: projectMonitors.monitors[0].id,
              locations: ['localhost'],
              name: 'check if title is present',
              params: {},
              playwrightOptions: {
                chromiumSandbox: false,
                headless: true,
              },
              schedule: '3m',
              tags: '',
              throttling: {
                download: 5,
                latency: 20,
                upload: 3,
              },
              type: 'browser',
              hash: 'ekrjelkjrelkjre',
            },
            reason: 'Failed to save or update monitor. Configuration is not valid',
          },
        ]);
        expect(messages[0].createdMonitors).eql([]);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - saves space as data stream namespace', async () => {
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        await supertestWithoutAuth
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].attributes[ConfigKey.NAMESPACE]).eql(formatKibanaNamespace(SPACE_ID));
      } finally {
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - formats custom id appropriately', async () => {
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        await supertestWithoutAuth
          .put(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY}`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]).eql(
          `${projectMonitors.monitors[0].id}-${projectMonitors.project}-${SPACE_ID}`
        );
      } finally {
        await deleteMonitor(
          projectMonitors.monitors[0].id,
          projectMonitors.project,
          SPACE_ID,
          username,
          password
        );
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        const response = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const { monitors } = response.body;

        // add urls and ports to mimic hydration
        const updates = {
          [ConfigKey.URLS]: 'https://modified-host.com',
          [ConfigKey.PORT]: 443,
        };

        const modifiedMonitor = { ...monitors[0]?.attributes, ...updates };

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitors[0]?.id)
          .set('kbn-xsrf', 'true')
          .send(modifiedMonitor)
          .expect(200);

        // update project monitor via push api
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify(projectMonitors)
        );
        expect(messages).to.have.length(2);
        expect(messages[0]).eql('1 monitor updated successfully. ');
        expect(messages[1].updatedMonitors).eql([projectMonitors.monitors[0].id]);

        // ensure that monitor can still be decrypted
        await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + monitors[0]?.id)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - is able to enable and disable monitors', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                enabled: false,
              },
            ],
          })
          .expect(200);
        const response = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = response.body;
        expect(monitors[0].attributes.enabled).eql(false);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });

    it('project monitors - returns a failed monitor when user defines a private location without fleet permissions', async () => {
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = 'uptime read only';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        const messages = await parseStreamApiResponse(
          kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );

        expect(messages).to.have.length(3);
        expect(messages[0]).to.eql('test-id-2: failed to create or update monitor');
        expect(messages[1]).to.eql(`1 monitor created successfully.`);
        expect(messages[2]).to.eql({
          createdMonitors: [testMonitors[0].id],
          updatedMonitors: [],
          staleMonitors: [],
          deletedMonitors: [],
          failedMonitors: [
            {
              details:
                'Insufficient permissions. In order to configure private locations, you must have Fleet and Integrations write permissions. To resolve, please generate a new API key with a user who has Fleet and Integrations write permissions.',
              id: 'test-id-2',
              payload: {
                content:
                  'UEsDBBQACAAIAON5qVQAAAAAAAAAAAAAAAAfAAAAZXhhbXBsZXMvdG9kb3MvYmFzaWMuam91cm5leS50c22Q0WrDMAxF3/sVF7MHB0LMXlc6RvcN+wDPVWNviW0sdUsp/fe5SSiD7UFCWFfHujIGlpnkybwxFTZfoY/E3hsaLEtwhs9RPNWKDU12zAOxkXRIbN4tB9d9pFOJdO6EN2HMqQguWN9asFBuQVMmJ7jiWNII9fIXrbabdUYr58l9IhwhQQZCYORCTFFUC31Btj21NRc7Mq4Nds+4bDD/pNVgT9F52Jyr2Fa+g75LAPttg8yErk+S9ELpTmVotlVwnfNCuh2lepl3+JflUmSBJ3uggt1v9INW/lHNLKze9dJe1J3QJK8pSvWkm6aTtCet5puq+x63+AFQSwcIAPQ3VfcAAACcAQAAUEsBAi0DFAAIAAgA43mpVAD0N1X3AAAAnAEAAB8AAAAAAAAAAAAgAKSBAAAAAGV4YW1wbGVzL3RvZG9zL2Jhc2ljLmpvdXJuZXkudHNQSwUGAAAAAAEAAQBNAAAARAEAAAAA',
                filter: {
                  match: 'check if title is present',
                },
                id: 'test-id-2',
                locations: ['localhost'],
                name: 'check if title is present',
                params: {},
                playwrightOptions: {
                  chromiumSandbox: false,
                  headless: true,
                },
                privateLocations: ['Test private location 0'],
                schedule: 10,
                tags: [],
                throttling: {
                  download: 5,
                  latency: 20,
                  upload: 3,
                },
                hash: 'ekrjelkjrelkjre',
              },
              reason: 'Failed to create or update monitor',
            },
          ],
          failedStaleMonitors: [],
        });
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(
              monitor.id,
              projectMonitors.project,
              'default',
              username,
              password
            );
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - returns a failed monitor when user tries to delete a monitor without fleet permissions', async () => {
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'test-username';
      const roleName = 'uptime read only';
      const password = `test-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });

        await parseStreamApiResponse(
          kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
        );

        const messages = await parseStreamApiResponse(
          kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: [],
          }),
          {
            Authorization:
              'Basic ' + Buffer.from(`${username}:${password}`, 'binary').toString('base64'),
          }
        );

        expect(messages).to.have.length(3);
        expect(
          messages.filter((msg) => msg === `Monitor ${testMonitors[1].id} could not be deleted`)
        ).to.have.length(1);
        expect(
          messages.filter((msg) => msg === `Monitor ${testMonitors[0].id} deleted successfully`)
        ).to.have.length(1);
        expect(messages[2]).to.eql({
          createdMonitors: [],
          updatedMonitors: [],
          staleMonitors: [],
          deletedMonitors: [testMonitors[0].id],
          failedMonitors: [],
          failedStaleMonitors: [
            {
              details:
                'Unable to delete Synthetics package policy for monitor check if title is present. Fleet write permissions are needed to use Synthetics private locations.',
              id: 'test-id-2',
              reason: 'Failed to delete stale monitor',
            },
          ],
        });

        const messages2 = await parseStreamApiResponse(
          kibanaServerUrl + API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: [],
          })
        );

        expect(messages2).to.have.length(2);
        expect(messages2[0]).to.eql(`Monitor ${testMonitors[1].id} deleted successfully`);
        expect(messages2[1]).to.eql({
          createdMonitors: [],
          updatedMonitors: [],
          staleMonitors: [],
          deletedMonitors: [testMonitors[1].id],
          failedMonitors: [],
          failedStaleMonitors: [],
        });
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(
              monitor.id,
              projectMonitors.project,
              'default',
              username,
              password
            );
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - returns a successful monitor when user defines a private location with fleet permissions', async () => {
      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 0'],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const username = 'admin';
      const roleName = 'uptime with fleet';
      const password = `${username}-password`;
      try {
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
                fleetv2: ['all'],
                fleet: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        const messages = await parseStreamApiResponse(
          projectMonitorEndpoint,
          JSON.stringify({
            ...projectMonitors,
            keep_stale: false,
            monitors: testMonitors,
          })
        );
        expect(messages).to.have.length(2);
        expect(messages).to.eql([
          `2 monitors created successfully.`,
          {
            createdMonitors: [testMonitors[0].id, 'test-id-2'],
            updatedMonitors: [],
            staleMonitors: [],
            deletedMonitors: [],
            failedMonitors: [],
            failedStaleMonitors: [],
          },
        ]);
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(
              monitor.id,
              projectMonitors.project,
              'default',
              username,
              password
            );
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('creates integration policies for project monitors with private locations', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );
        expect(packagePolicy.name).eql(
          `${projectMonitors.monitors[0].id}-${projectMonitors.project}-default-Test private location 0`
        );
        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: 'check if title is present-Test private location 0',
            id,
            configId,
            locationName: 'Test private location 0',
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const packagesResponse = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(packagesResponse.body.items.length).eql(0);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor - lightweight', async () => {
      const monitorRequest = {
        ...httpProjectMonitors,
        monitors: [
          { ...httpProjectMonitors.monitors[1], privateLocations: ['Test private location 0'] },
        ],
      };
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(monitorRequest);

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitorRequest.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...monitorRequest,
            monitors: [{ ...monitorRequest.monitors[0], privateLocations: [] }],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: 'check if title is present-Test private location 0',
            id,
            configId,
            locationName: 'Test private location 0',
          })
        );

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], privateLocations: [] }],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('deletes integration policies when project monitors are deleted', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          })
          .expect(200);

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: 'check if title is present-Test private location 0',
            id,
            configId,
            locationName: 'Test private location 0',
          })
        );

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [],
            keep_stale: false,
          });

        const monitorsResponse2 = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(monitorsResponse2.body.monitors.length).eql(0);

        await new Promise((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID] +
              '-' +
              testPolicyId
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('deletes integration policies when project monitors are deleted - lightweight', async () => {
      const monitorRequest = {
        ...httpProjectMonitors,
        monitors: [
          { ...httpProjectMonitors.monitors[1], privateLocations: ['Test private location 0'] },
        ],
      };
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send(monitorRequest);

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitorRequest.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];

        const httpInput = packagePolicy.inputs.find(
          (input: any) => input.type === 'synthetics/http'
        );
        expect(httpInput).to.eql({
          type: 'synthetics/http',
          policy_template: 'synthetics',
          enabled: true,
          streams: [
            {
              enabled: true,
              data_stream: {
                elasticsearch: {
                  privileges: {
                    indices: ['auto_configure', 'create_doc', 'read'],
                  },
                },
                type: 'synthetics',
                dataset: 'http',
              },
              vars: {
                __ui: { value: '{"is_tls_enabled":true}', type: 'yaml' },
                enabled: { value: false, type: 'bool' },
                type: { value: 'http', type: 'text' },
                name: { value: 'My Monitor 3', type: 'text' },
                schedule: { value: '"@every 60m"', type: 'text' },
                urls: { value: 'http://localhost:9200', type: 'text' },
                'service.name': { value: '', type: 'text' },
                timeout: { value: '80s', type: 'text' },
                max_redirects: { value: '0', type: 'integer' },
                proxy_url: { value: '', type: 'text' },
                tags: { value: '["tag2","tag2"]', type: 'yaml' },
                username: { value: '', type: 'text' },
                password: { value: '', type: 'password' },
                'response.include_headers': { value: false, type: 'bool' },
                'response.include_body': { value: 'always', type: 'text' },
                'check.request.method': { value: 'POST', type: 'text' },
                'check.request.headers': {
                  value: '{"Content-Type":"application/x-www-form-urlencoded"}',
                  type: 'yaml',
                },
                'check.request.body': { value: null, type: 'yaml' },
                'check.response.status': { value: '["200"]', type: 'yaml' },
                'check.response.headers': { value: null, type: 'yaml' },
                'check.response.body.positive': { value: '["Saved","saved"]', type: 'yaml' },
                'check.response.body.negative': { value: null, type: 'yaml' },
                'ssl.certificate_authorities': { value: null, type: 'yaml' },
                'ssl.certificate': { value: null, type: 'yaml' },
                'ssl.key': { value: null, type: 'yaml' },
                'ssl.key_passphrase': { value: null, type: 'text' },
                'ssl.verification_mode': { value: 'strict', type: 'text' },
                'ssl.supported_protocols': {
                  value: '["TLSv1.1","TLSv1.2","TLSv1.3"]',
                  type: 'yaml',
                },
                location_name: { value: 'Test private location 0', type: 'text' },
                id: {
                  value: id,
                  type: 'text',
                },
                config_id: { value: configId, type: 'text' },
                run_once: { value: false, type: 'bool' },
                origin: { value: 'project', type: 'text' },
                'monitor.project.id': {
                  type: 'text',
                  value: 'test-suite',
                },
                'monitor.project.name': {
                  type: 'text',
                  value: 'test-suite',
                },
              },
              id: `synthetics/http-http-${id}-${testPolicyId}`,
              compiled_stream: {
                __ui: { is_tls_enabled: true },
                type: 'http',
                name: 'My Monitor 3',
                id,
                origin: 'project',
                enabled: false,
                urls: 'http://localhost:9200',
                schedule: '@every 60m',
                timeout: '80s',
                max_redirects: 0,
                tags: ['tag2', 'tag2'],
                'response.include_headers': false,
                'response.include_body': 'always',
                'check.request.method': 'POST',
                'check.request.headers': { 'Content-Type': 'application/x-www-form-urlencoded' },
                'check.response.status': ['200'],
                'check.response.body.positive': ['Saved', 'saved'],
                'ssl.verification_mode': 'strict',
                'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
                'run_from.geo.name': 'Test private location 0',
                'run_from.id': 'Test private location 0',
                processors: [
                  {
                    add_fields: {
                      target: '',
                      fields: {
                        'monitor.fleet_managed': true,
                        config_id: configId,
                        'monitor.project.id': 'test-suite',
                        'monitor.project.name': 'test-suite',
                      },
                    },
                  },
                ],
              },
            },
          ],
        });

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...monitorRequest,
            monitors: [],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            } - ${testPolicyId}`
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, httpProjectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles updating package policies when project monitors are updated', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                privateLocations: ['Test private location 0'],
              },
            ],
          });

        const monitorsResponse = await supertest
          .get(API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const apiResponsePolicy = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];
        const policyId = `${id}-${testPolicyId}`;

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) => pkgPolicy.id === policyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: 'check if title is present-Test private location 0',
            id,
            configId,
            locationName: 'Test private location 0',
          })
        );

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              {
                ...projectMonitors.monitors[0],
                privateLocations: ['Test private location 0'],
                enabled: false,
              },
            ],
          });

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const configId2 = monitorsResponse.body.monitors[0].id;
        const id2 = monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID];
        const policyId2 = `${id}-${testPolicyId}`;

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) => pkgPolicy.id === policyId2
        );

        comparePolicies(
          packagePolicy2,
          getTestProjectSyntheticsPolicy({
            inputs: { enabled: { value: false, type: 'bool' } },
            name: 'check if title is present-Test private location 0',
            id: id2,
            configId: configId2,
            locationName: 'Test private location 0',
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, projectMonitors.project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles location formatting for both private and public locations', async () => {
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: ['Test private location 0'] },
            ],
          });

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(API_URLS.SYNTHETICS_MONITORS)
              .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}` })
              .set('kbn-xsrf', 'true')
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach((response) => {
          expect(response.body.monitors[0].attributes.locations).eql([
            {
              id: 'localhost',
              label: 'Local Synthetics Service',
              geo: { lat: 0, lon: 0 },
              isServiceManaged: true,
            },
            {
              label: 'Test private location 0',
              isServiceManaged: false,
              id: testPolicyId,
              geo: {
                lat: '',
                lon: '',
              },
            },
          ]);
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, projectMonitors.project);
          }),
        ]);
      }
    });
  });
}

/**
 * Borrowed from AIOPS test code: https://github.com/elastic/kibana/blob/23a7ac2c2e2b1f64daa17b914e86989b1fde750c/x-pack/test/api_integration/apis/aiops/explain_log_rate_spikes.ts
 * Receives a stream and parses the messages until the stream closes.
 */
async function* parseStream(stream: NodeJS.ReadableStream) {
  let partial = '';

  try {
    for await (const value of stream) {
      const full = `${partial}${value}`;
      const parts = full.split('\n');
      const last = parts.pop();

      partial = last ?? '';

      const event = parts.map((p) => JSON.parse(p));

      for (const events of event) {
        yield events;
      }
    }
  } catch (error) {
    yield { type: 'error', payload: error.toString() };
  }
}

/**
 * Helper function to process the results of the module's stream parsing helper function.
 */
async function getMessages(stream: NodeJS.ReadableStream | null) {
  if (stream === null) return [];
  const data: any[] = [];
  for await (const action of parseStream(stream)) {
    data.push(action);
  }
  return data;
}

/**
 * This type is intended to highlight any break between shared parameter contracts defined in
 * the module's streaming endpoint helper functions.
 */
type StreamApiFunction<T = unknown> = (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method?: string
) => T;

/**
 * This helps the test file have DRY code when it comes to calling
 * the same streaming endpoint over and over by defining some selective defaults.
 */
export const parseStreamApiResponse: StreamApiFunction<Promise<any[]>> = async (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method = 'PUT'
) => {
  const streamResponse = await callStreamApi(url, body, extraHeaders, method);
  return getMessages(streamResponse.body);
};

/**
 * This helps the test file have DRY code when it comes to calling
 * the same streaming endpoint over and over by defining some selective defaults.
 */
const callStreamApi: StreamApiFunction<Promise<Response>> = async (
  url: string,
  body?: BodyInit,
  extraHeaders?: HeadersInit,
  method = 'PUT'
) => {
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'stream',
      ...extraHeaders,
    },
    body,
  });
};
