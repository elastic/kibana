/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import expect from '@kbn/expect';
import { ConfigKey, ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/legacy_uptime/lib/saved_objects/synthetics_monitor';
import { REQUEST_TOO_LARGE } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/add_monitor_project';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { PrivateLocationTestService } from './services/private_location_test_service';
import {
  comparePolicies,
  getTestProjectSyntheticsPolicy,
} from '../uptime/rest/sample_data/test_policy';

export default function ({ getService }: FtrProviderContext) {
  describe('AddProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;
    let tcpProjectMonitors: ProjectMonitorsRequest;
    let icmpProjectMonitors: ProjectMonitorsRequest;

    let testPolicyId = '';
    const testPrivateLocations = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuid.v4() })),
      };
    };

    const deleteMonitor = async (
      journeyId: string,
      projectId: string,
      space: string = 'default'
    ) => {
      try {
        const response = await supertest
          .get(`/s/${space}${API_URLS.SYNTHETICS_MONITORS}`)
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
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .post('/api/fleet/epm/packages/synthetics/0.10.3')
        .set('kbn-xsrf', 'true')
        .send({ force: true })
        .expect(200);

      const testPolicyName = 'Fleet test server policy' + Date.now();
      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      await testPrivateLocations.setTestLocations([testPolicyId]);
    });

    beforeEach(() => {
      projectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_browser_monitor').monitors,
      });
      httpProjectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_http_monitor').monitors,
      });
      tcpProjectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_tcp_monitor').monitors,
      });
      icmpProjectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_icmp_monitor').monitors,
      });
    });

    it('project monitors - handles browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [],
        });

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
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            enabled: true,
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
            project_id: project,
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
            id: `${journeyId}-${project}-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - allows throttling false for browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], throttling: false }],
          })
          .expect(200);
        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [],
        });

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

          expect(decryptedCreatedMonitor.body.attributes['throttling.is_enabled']).to.eql(false);
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - handles http monitors', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const successfulMonitors = [httpProjectMonitors.monitors[1]];
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(httpProjectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
            {
              id: httpProjectMonitors.monitors[0].id,
              details: `Multiple urls are not supported for http project monitors in ${kibanaVersion}. Please set only 1 url per monitor. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
            {
              id: httpProjectMonitors.monitors[0].id,
              details: `The following Heartbeat options are not supported for ${httpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: check.response.body|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
          ],
        });

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
            custom_heartbeat_id: `${journeyId}-${project}-default`,
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
            project_id: project,
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
            id: `${journeyId}-${project}-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - handles tcp monitors', async () => {
      const successfulMonitors = [tcpProjectMonitors.monitors[0], tcpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(tcpProjectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
            {
              id: tcpProjectMonitors.monitors[2].id,
              details: `Multiple hosts are not supported for tcp project monitors in ${kibanaVersion}. Please set only 1 host per monitor. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
            {
              id: tcpProjectMonitors.monitors[2].id,
              details: `The following Heartbeat options are not supported for ${tcpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: ports|unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
          ],
        });

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
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            'check.receive': '',
            'check.send': '',
            enabled: true,
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
            project_id: project,
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
            id: `${journeyId}-${project}-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - handles icmp monitors', async () => {
      const successfulMonitors = [icmpProjectMonitors.monitors[0], icmpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(icmpProjectMonitors)
          .expect(200);
        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
            {
              id: icmpProjectMonitors.monitors[2].id,
              details: `Multiple hosts are not supported for icmp project monitors in ${kibanaVersion}. Please set only 1 host per monitor. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
            {
              id: icmpProjectMonitors.monitors[2].id,
              details: `The following Heartbeat options are not supported for ${icmpProjectMonitors.monitors[0].type} project monitors in ${kibanaVersion}: unsupportedKey.nestedUnsupportedKey. You monitor was not created or updated.`,
              reason: 'Unsupported Heartbeat option',
            },
          ],
        });

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
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            enabled: true,
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
            project_id: project,
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
            id: `${journeyId}-${project}-default`,
            hash: 'ekrjelkjrelkjre',
          });
        }
      } finally {
        await Promise.all([
          successfulMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - returns a list of successfully created monitors', async () => {
      const project = `test-project-${uuid.v4()}`;
      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          failedMonitors: [],
          createdMonitors: projectMonitors.monitors.map((monitor) => monitor.id),
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - returns a list of successfully updated monitors', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        expect(body).eql({
          createdMonitors: [],
          failedMonitors: [],
          updatedMonitors: projectMonitors.monitors.map((monitor) => monitor.id),
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - validates monitor type', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: [{ ...projectMonitors.monitors[0], schedule: '3m', tags: '' }] })
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          failedMonitors: [
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
          ],
          createdMonitors: [],
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - saves space as data stream namespace', async () => {
      const project = `test-project-${uuid.v4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
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
          .put(
            `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
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
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - handles editing with spaces', async () => {
      const project = `test-project-${uuid.v4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
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
          .put(
            `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
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

        const decryptedCreatedMonitor = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${getResponse.body.monitors[0].id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(decryptedCreatedMonitor.body.attributes[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(
          projectMonitors.monitors[0].content
        );

        const updatedSource = 'updatedSource';
        // update monitor
        await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], content: updatedSource }],
          })
          .expect(200);
        const getResponseUpdated = await supertestWithoutAuth
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
          .auth(username, password)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors: monitorsUpdated } = getResponseUpdated.body;
        expect(monitorsUpdated.length).eql(1);

        const decryptedUpdatedMonitor = await supertest
          .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${monitorsUpdated[0].id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
        expect(decryptedUpdatedMonitor.body.attributes[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(
          updatedSource
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - formats custom id appropriately', async () => {
      const project = `test project ${uuid.v4()}`;
      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuid.v4()}`;
      const SPACE_NAME = `test-space-name ${uuid.v4()}`;
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
          .put(
            `/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
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
          `${projectMonitors.monitors[0].id}-${project}-${SPACE_ID}`
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      const project = `test-project-${uuid.v4()}`;
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

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
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [projectMonitors.monitors[0].id],
          createdMonitors: [],
          failedMonitors: [],
        });

        // ensure that monitor can still be decrypted
        await supertest
          .get(API_URLS.SYNTHETICS_MONITORS + '/' + monitors[0]?.id)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - is able to enable and disable monitors', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors);

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
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
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - returns a failed monitor when user defines a private location without fleet permissions', async () => {
      const project = `test-project-${uuid.v4()}`;

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

        const { body } = await supertestWithoutAuth
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send({ monitors: testMonitors })
          .expect(200);

        expect(body).eql({
          createdMonitors: [testMonitors[0].id],
          updatedMonitors: [],
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
        });
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project, 'default');
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('project monitors - returns a successful monitor when user defines a private location with fleet permissions', async () => {
      const project = `test-project-${uuid.v4()}`;
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
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({ monitors: testMonitors })
          .expect(200);

        expect(body).to.eql({
          createdMonitors: [testMonitors[0].id, 'test-id-2'],
          updatedMonitors: [],
          failedMonitors: [],
        });
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return deleteMonitor(monitor.id, project, 'default');
          }),
        ]);
        await security.user.delete(username);
        await security.role.delete(roleName);
      }
    });

    it('creates integration policies for project monitors with private locations', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
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
            `${
              monitorsResponse.body.monitors[0].attributes[ConfigKey.CUSTOM_HEARTBEAT_ID]
            }-${testPolicyId}`
        );
        expect(packagePolicy.name).eql(
          `${projectMonitors.monitors[0].id}-${project}-default-Test private location 0`
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
            projectId: project,
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const packagesResponse = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(packagesResponse.body.items.length).eql(0);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor - lightweight', async () => {
      const project = `test-project-${uuid.v4()}`;

      const monitorRequest = {
        monitors: [
          { ...httpProjectMonitors.monitors[1], privateLocations: ['Test private location 0'] },
        ],
      };
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(monitorRequest)
          .expect(200);

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
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
            monitors: [{ ...monitorRequest.monitors[0], privateLocations: [] }],
          })
          .expect(200);

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
        await deleteMonitor(projectMonitors.monitors[0].id, project);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
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
            projectId: project,
          })
        );

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
            monitors: [{ ...projectMonitors.monitors[0], privateLocations: [] }],
          })
          .expect(200);

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
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles updating package policies when project monitors are updated', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
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
            projectId: project,
          })
        );

        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
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
            projectId: project,
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const apiResponsePolicy2 = await supertest.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles location formatting for both private and public locations', async () => {
      const project = `test-project-${uuid.v4()}`;
      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
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
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('only allows 250 requests at a time', async () => {
      const project = `test-project-${uuid.v4()}`;
      const monitors = [];
      for (let i = 0; i < 251; i++) {
        monitors.push({
          ...projectMonitors.monitors[0],
          id: `test-id-${i}`,
          name: `test-name-${i}`,
        });
      }

      try {
        const {
          body: { message },
        } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
            monitors,
          })
          .expect(400);

        expect(message).to.eql(REQUEST_TOO_LARGE);
      } finally {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY)
          .set('kbn-xsrf', 'true')
          .send({ ...projectMonitors, keep_stale: false, project });
      }
    });

    it('project monitors - cannot update a monitor of one type to another type', async () => {
      const project = `test-project-${uuid.v4()}`;

      try {
        await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        const { body } = await supertest
          .put(API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project))
          .set('kbn-xsrf', 'true')
          .send({
            monitors: [{ ...httpProjectMonitors.monitors[1], id: projectMonitors.monitors[0].id }],
          })
          .expect(200);
        expect(body).eql({
          createdMonitors: [],
          updatedMonitors: [],
          failedMonitors: [
            {
              details: `Monitor ${projectMonitors.monitors[0].id} of type browser cannot be updated to type http. Please delete the monitor first and try again.`,
              payload: {
                'check.request': {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  method: 'POST',
                },
                'check.response': {
                  body: {
                    positive: ['Saved', 'saved'],
                  },
                  status: [200],
                },
                enabled: false,
                hash: 'ekrjelkjrelkjre',
                id: projectMonitors.monitors[0].id,
                locations: ['localhost'],
                name: 'My Monitor 3',
                response: {
                  include_body: 'always',
                },
                'response.include_headers': false,
                schedule: 60,
                timeout: '80s',
                type: 'http',
                tags: 'tag2,tag2',
                urls: ['http://localhost:9200'],
                'ssl.verification_mode': 'strict',
              },
              reason: 'Cannot update monitor to different type.',
            },
          ],
        });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });
  });
}
