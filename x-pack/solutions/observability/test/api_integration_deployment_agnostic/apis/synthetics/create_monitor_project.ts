/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import rawExpect from 'expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type {
  PrivateLocation,
  ProjectMonitorsRequest,
  ServiceLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import {
  legacySyntheticsMonitorTypeSingle,
  syntheticsMonitorSavedObjectType,
} from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';
import { LOCAL_PUBLIC_LOCATION } from './helpers/location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('CreateProjectMonitors', function () {
    this.tags(['skipCloud', 'skipMKI']);
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const samlAuth = getService('samlAuth');

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;
    let tcpProjectMonitors: ProjectMonitorsRequest;
    let icmpProjectMonitors: ProjectMonitorsRequest;
    let editorUser: RoleCredentials;
    let privateLocations: PrivateLocation[] = [];

    let testPolicyId1 = '';
    let testPolicyId2 = '';
    const testPolicyName = 'Fleet test server policy' + Date.now();

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    const deleteMonitor = async (
      journeyId: string,
      projectId: string,
      space: string = 'default'
    ) => {
      try {
        const response = await supertest
          .get(`/s/${space}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorSavedObjectType}.attributes.project_id: "${projectId}"`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const { monitors } = response.body;
        if (monitors[0]?.config_id) {
          await monitorTestService.deleteMonitor(editorUser, monitors[0].config_id, 200, space);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      await testPrivateLocations.installSyntheticsPackage();

      const apiResponse1 = await testPrivateLocations.addFleetPolicy(testPolicyName);
      const apiResponse2 = await testPrivateLocations.addFleetPolicy(`${testPolicyName}-2`);
      testPolicyId1 = apiResponse1.body.item.id;
      testPolicyId2 = apiResponse2.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations([
        testPolicyId1,
        testPolicyId2,
      ]);
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'testGlobalParam', value: 'testGlobalParamValue' })
        .expect(200);
      await supertest
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'testGlobalParam2', value: 'testGlobalParamValue2' })
        .expect(200);
      const spaces = (await kibanaServer.spaces.list()) as Array<{
        id: string;
      }>;
      for (let i = 0; i < spaces.length; i++) {
        if (spaces[i].id !== 'default') await kibanaServer.spaces.delete(spaces[i].id);
      }
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['synthetics-monitor', 'ingest-package-policies'],
      });
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
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertest
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
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
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${journeyId}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const decryptedCreatedMonitor = await monitorTestService.getMonitor(
          createdMonitorsResponse.body.monitors[0].config_id,
          {
            internal: true,
            user: editorUser,
          }
        );

        expect(decryptedCreatedMonitor.rawBody).to.eql({
          __ui: {
            script_source: {
              file_name: '',
              is_generated_script: false,
            },
          },
          config_id: decryptedCreatedMonitor.rawBody.config_id,
          custom_heartbeat_id: `${journeyId}-${project}-default`,
          enabled: true,
          alert: {
            status: {
              enabled: true,
            },
            tls: {
              enabled: true,
            },
          },
          'filter_journeys.match': 'check if title is present',
          'filter_journeys.tags': [],
          form_monitor_type: 'multistep',
          ignore_https_errors: false,
          journey_id: journeyId,
          locations: [LOCAL_PUBLIC_LOCATION],
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
          synthetics_args: [],
          tags: [],
          throttling: PROFILES_MAP[PROFILE_VALUES_ENUM.DEFAULT],
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
          max_attempts: 2,
          updated_at: decryptedCreatedMonitor.rawBody.updated_at,
          created_at: decryptedCreatedMonitor.rawBody.created_at,
          labels: {},
          maintenance_windows: [],
          spaces: ['default'],
        });
      }
    });

    it('project monitors - handles http monitors', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const successfulMonitors = [httpProjectMonitors.monitors[1]];
      const project = `test-project-${uuidv4()}`;

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(httpProjectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
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
          ],
        });

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const isTLSEnabled = Object.keys(monitor).some((key) => key.includes('ssl'));
          const createdMonitorsResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
            .query({
              filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${journeyId}`,
            })
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          const { rawBody: decryptedCreatedMonitor } = await monitorTestService.getMonitor(
            createdMonitorsResponse.body.monitors[0].config_id,
            {
              internal: true,
              user: editorUser,
            }
          );

          expect(decryptedCreatedMonitor).to.eql({
            __ui: {
              is_tls_enabled: isTLSEnabled,
            },
            'check.request.method': 'POST',
            'check.response.status': ['200'],
            config_id: decryptedCreatedMonitor.config_id,
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            'check.response.body.negative': [],
            'check.response.body.positive': ['${testLocal1}', 'saved'],
            'check.response.json': [
              { description: 'check status', expression: 'foo.bar == "myValue"' },
            ],
            'check.response.headers': {},
            proxy_url: '${testGlobalParam2}',
            'check.request.body': {
              type: 'text',
              value: '',
            },
            params: JSON.stringify({
              testLocal1: 'testLocalParamsValue',
              testGlobalParam2: 'testGlobalParamOverwrite',
            }),
            'check.request.headers': {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            enabled: false,
            alert: {
              status: {
                enabled: true,
              },
              tls: {
                enabled: true,
              },
            },
            form_monitor_type: 'http',
            journey_id: journeyId,
            locations: [LOCAL_PUBLIC_LOCATION],
            max_redirects: '0',
            name: monitor.name,
            namespace: 'default',
            origin: 'project',
            original_space: 'default',
            project_id: project,
            username: '',
            password: '',
            proxy_headers: {},
            'response.include_body': 'always',
            'response.include_headers': false,
            'response.include_body_max_bytes': '900',
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
            mode: 'any',
            ipv6: true,
            ipv4: true,
            max_attempts: 2,
            labels: {},
            maintenance_windows: monitor.maintenanceWindows || [],
            spaces: ['default'],
            updated_at: decryptedCreatedMonitor.updated_at,
            created_at: decryptedCreatedMonitor.created_at,
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
      const project = `test-project-${uuidv4()}`;

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(tcpProjectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
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
          ],
        });

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const isTLSEnabled = Object.keys(monitor).some((key) => key.includes('ssl'));
          const createdMonitorsResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
            .query({
              filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${journeyId}`,
            })
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          const { rawBody: decryptedCreatedMonitor } = await monitorTestService.getMonitor(
            createdMonitorsResponse.body.monitors[0].config_id,
            {
              internal: true,
              user: editorUser,
            }
          );

          expect(decryptedCreatedMonitor).to.eql({
            __ui: {
              is_tls_enabled: isTLSEnabled,
            },
            config_id: decryptedCreatedMonitor.config_id,
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            'check.receive': '',
            'check.send': '',
            enabled: true,
            alert: {
              status: {
                enabled: true,
              },
              tls: {
                enabled: true,
              },
            },
            form_monitor_type: 'tcp',
            journey_id: journeyId,
            locations: [LOCAL_PUBLIC_LOCATION],
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
            mode: 'any',
            ipv6: true,
            ipv4: true,
            params: '',
            max_attempts: 2,
            labels: {},
            maintenance_windows: monitor.maintenanceWindows || [],
            spaces: ['default'],
            updated_at: decryptedCreatedMonitor.updated_at,
            created_at: decryptedCreatedMonitor.created_at,
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
      const project = `test-project-${uuidv4()}`;

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(icmpProjectMonitors)
          .expect(200);
        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: successfulMonitors.map((monitor) => monitor.id),
          failedMonitors: [
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
          ],
        });

        for (const monitor of successfulMonitors) {
          const journeyId = monitor.id;
          const createdMonitorsResponse = await supertest
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
            .query({
              filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${journeyId}`,
            })
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          const { rawBody: decryptedCreatedMonitor } = await monitorTestService.getMonitor(
            createdMonitorsResponse.body.monitors[0].config_id,
            {
              internal: true,
              user: editorUser,
            }
          );

          expect(decryptedCreatedMonitor).to.eql({
            config_id: decryptedCreatedMonitor.config_id,
            custom_heartbeat_id: `${journeyId}-${project}-default`,
            enabled: true,
            alert: {
              status: {
                enabled: true,
              },
              tls: {
                enabled: true,
              },
            },
            form_monitor_type: 'icmp',
            journey_id: journeyId,
            locations: [LOCAL_PUBLIC_LOCATION],
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
            mode: 'any',
            ipv4: true,
            ipv6: true,
            params: '',
            max_attempts: 2,
            updated_at: decryptedCreatedMonitor.updated_at,
            created_at: decryptedCreatedMonitor.created_at,
            labels: {},
            maintenance_windows: monitor.maintenanceWindows || [],
            spaces: ['default'],
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

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      const project = `test-project-${uuidv4()}`;
      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors)
          .expect(200);

        const response = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const { monitors } = response.body;

        // update project monitor via push api
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors)
          .expect(200);

        expect(body).eql({
          updatedMonitors: [projectMonitors.monitors[0].id],
          createdMonitors: [],
          failedMonitors: [],
        });

        // ensure that monitor can still be decrypted
        await monitorTestService.getMonitor(monitors[0]?.config_id, { user: editorUser });
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => deleteMonitor(monitor.id, project)),
        ]);
      }
    });

    it('handles location formatting for both private and public locations', async () => {
      const project = `test-project-${uuidv4()}`;
      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: [privateLocations[0].label] },
            ],
          });

        const updatedMonitorsResponse = await Promise.all(
          projectMonitors.monitors.map((monitor) => {
            return supertest
              .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
              .query({
                filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${monitor.id}`,
                internal: true,
              })
              .set(editorUser.apiKeyHeader)
              .set(samlAuth.getInternalRequestHeader())
              .expect(200);
          })
        );

        updatedMonitorsResponse.forEach(
          (response: {
            body: { monitors: Array<{ locations: Array<PrivateLocation | ServiceLocation> }> };
          }) => {
            expect(response.body.monitors[0].locations).eql([
              {
                id: 'dev',
                label: 'Dev Service',
                geo: { lat: 0, lon: 0 },
                isServiceManaged: true,
              },
              {
                label: privateLocations[0].label,
                isServiceManaged: false,
                agentPolicyId: testPolicyId1,
                id: testPolicyId1,
                geo: {
                  lat: 0,
                  lon: 0,
                },
              },
            ]);
          }
        );
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - handles sending invalid public location', async () => {
      const project = `test-project-${uuidv4()}`;
      try {
        const response = await supertest
          .put(
            `${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: [
              {
                ...httpProjectMonitors.monitors[1],
                maintenance_windows: [],
                locations: ['does not exist'],
              },
            ],
          })
          .expect(200);
        rawExpect(response.body).toEqual({
          createdMonitors: [],
          failedMonitors: [
            {
              details: rawExpect.stringContaining(
                "Invalid locations specified. Elastic managed Location(s) 'does not exist' not found."
              ),
              id: httpProjectMonitors.monitors[1].id,
              payload: {
                'check.request': {
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  method: 'POST',
                },
                'check.response': {
                  body: {
                    positive: ['${testLocal1}', 'saved'],
                  },
                  status: [200],
                  json: [
                    {
                      description: 'check status',
                      expression: 'foo.bar == "myValue"',
                    },
                  ],
                },
                enabled: false,
                hash: 'ekrjelkjrelkjre',
                id: httpProjectMonitors.monitors[1].id,
                locations: ['does not exist'],
                name: 'My Monitor 3',
                response: {
                  include_body: 'always',
                  include_body_max_bytes: 900,
                },
                'response.include_headers': false,
                schedule: 60,
                'ssl.verification_mode': 'strict',
                tags: 'tag2,tag2',
                timeout: '80s',
                type: 'http',
                urls: ['http://localhost:9200'],
                params: {
                  testGlobalParam2: 'testGlobalParamOverwrite',
                  testLocal1: 'testLocalParamsValue',
                },
                proxy_url: '${testGlobalParam2}',
                maintenance_windows: [],
                max_attempts: 2,
              },
              reason: "Couldn't save or update monitor because of an invalid configuration.",
            },
          ],
          updatedMonitors: [],
        });
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, project);
      }
    });

    // --- Legacy monitor CRUD tests ---
    describe('LegacyProjectMonitorCRUD', () => {
      let legacyProject: string;
      let legacyMonitor: any;
      let legacyMonitorId: string;

      beforeEach(async () => {
        legacyProject = `legacy-project-${uuidv4()}`;
        legacyMonitorId = uuidv4();
        legacyMonitor = {
          ...getFixtureJson('project_http_monitor').monitors[1],
          id: legacyMonitorId,
          name: `Legacy Monitor ${legacyMonitorId}`,
        };
        await kibanaServer.savedObjects.clean({
          types: [legacySyntheticsMonitorTypeSingle],
        });
      });

      it('should create a legacy project monitor', async () => {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              legacyProject
            ) + `?savedObjectType=${legacySyntheticsMonitorTypeSingle}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [legacyMonitor] })
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: [legacyMonitorId],
          failedMonitors: [],
        });

        // Fetch from SO API to verify creation
        const soRes = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const found = soRes.saved_objects.find(
          (obj: any) => obj.attributes.journey_id === legacyMonitorId
        );
        expect(found).not.to.be(undefined);
        expect(found?.attributes.name).to.eql(`Legacy Monitor ${legacyMonitorId}`);
      });

      it('should fetch a legacy project monitor', async () => {
        // Create first
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              legacyProject
            ) + `?savedObjectType=${legacySyntheticsMonitorTypeSingle}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [legacyMonitor] })
          .expect(200);

        // Fetch via monitors API
        const res = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '?internal=true')
          .query({
            filter: `${legacySyntheticsMonitorTypeSingle}.attributes.journey_id: ${legacyMonitorId}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        expect(res.body.monitors.length).to.be(1);
        expect(res.body.monitors[0].journey_id).to.eql(legacyMonitorId);
        expect(res.body.monitors[0].name).to.eql(`Legacy Monitor ${legacyMonitorId}`);
      });

      it('should edit a legacy project monitor', async () => {
        // Create first
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              legacyProject
            ) + `?savedObjectType=${legacySyntheticsMonitorTypeSingle}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [legacyMonitor] })
          .expect(200);

        // Edit via project update
        const editedName = `Legacy Monitor Edited ${legacyMonitorId}`;
        const editedMonitor = { ...legacyMonitor, name: editedName };
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              legacyProject
            ) + `?savedObjectType=${legacySyntheticsMonitorTypeSingle}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [editedMonitor] })
          .expect(200);

        expect(body).eql({
          updatedMonitors: [legacyMonitorId],
          createdMonitors: [],
          failedMonitors: [],
        });

        // Fetch and verify edit
        const soRes = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const found = soRes.saved_objects.find(
          (obj: any) => obj.attributes.journey_id === legacyMonitorId
        );
        expect(found?.attributes.name).to.eql(editedName);
      });

      it('should delete a legacy project monitor', async () => {
        // Create first
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              legacyProject
            ) + `?savedObjectType=${legacySyntheticsMonitorTypeSingle}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [legacyMonitor] })
          .expect(200);

        // Delete via SYNTHETICS_MONITORS_PROJECT_DELETE API
        const soRes = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const found = soRes.saved_objects.find(
          (obj: any) => obj.attributes.journey_id === legacyMonitorId
        );
        expect(found).not.to.be(undefined);

        // Use the project delete API for legacy monitor
        await supertest
          .delete(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_DELETE.replace(
              '{projectName}',
              legacyProject
            )
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [legacyMonitorId] })
          .expect(200);

        // Ensure deleted
        const soResAfter = await kibanaServer.savedObjects.find({
          type: legacySyntheticsMonitorTypeSingle,
        });
        const foundAfter = soResAfter.saved_objects.find((obj: any) => obj.id === found!.id);
        expect(foundAfter).to.be(undefined);
      });
    });
  });
}
