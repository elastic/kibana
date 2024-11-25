/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  ConfigKey,
  ProjectMonitorsRequest,
  PrivateLocation,
  ServiceLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import { REQUEST_TOO_LARGE } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/add_monitor_project';
import { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { comparePolicies } from './sample_data/test_policy';
import {
  getTestProjectSyntheticsPolicy,
  getTestProjectSyntheticsPolicyLightweight,
} from './sample_data/test_project_monitor_policy';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../../services/synthetics_monitor';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddProjectMonitors', function () {
    this.tags('skipCloud');

    const supertest = getService('supertestWithoutAuth');
    const supertestWithAuth = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const testPrivateLocations = new PrivateLocationTestService(getService);
    const samlAuth = getService('samlAuth');

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;
    let tcpProjectMonitors: ProjectMonitorsRequest;
    let icmpProjectMonitors: ProjectMonitorsRequest;
    let editorUser: RoleCredentials;
    let viewerUser: RoleCredentials;
    let privateLocations: PrivateLocation[] = [];

    let testPolicyId = '';
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
            filter: `${syntheticsMonitorType}.attributes.journey_id: "${journeyId}" AND ${syntheticsMonitorType}.attributes.project_id: "${projectId}"`,
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
      viewerUser = await samlAuth.createM2mApiKeyWithRoleScope('viewer');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      await testPrivateLocations.installSyntheticsPackage();

      const apiResponse = await testPrivateLocations.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      privateLocations = await testPrivateLocations.setTestLocations([testPolicyId]);
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
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: ['synthetics-monitor', 'ingest-package-policies'],
      });
      const formatLocations = (monitors: ProjectMonitorsRequest['monitors']) => {
        return monitors.map((monitor) => {
          return {
            ...monitor,
            privateLocations: privateLocations.map((location) => location.label),
          };
        });
      };
      projectMonitors = setUniqueIds({
        monitors: formatLocations(getFixtureJson('project_browser_monitor').monitors),
      });
      httpProjectMonitors = setUniqueIds({
        monitors: formatLocations(getFixtureJson('project_http_monitor').monitors),
      });
      tcpProjectMonitors = setUniqueIds({
        monitors: formatLocations(getFixtureJson('project_tcp_monitor').monitors),
      });
      icmpProjectMonitors = setUniqueIds({
        monitors: formatLocations(getFixtureJson('project_icmp_monitor').monitors),
      });
    });

    it('project monitors - returns 404 for non-existing spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      await supertest
        .put(
          `/s/i_dont_exist${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(projectMonitors)
        .expect(404);
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
          .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
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
          locations: [
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: 'dev',
              isServiceManaged: true,
              label: 'Dev Service',
            },
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: testPolicyId,
              agentPolicyId: testPolicyId,
              isServiceManaged: false,
              label: privateLocations[0].label,
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
        });
      }
    });

    it('project monitors - allows throttling false for browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];
      const project = `test-project-${uuidv4()}`;

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
            .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
            .set(editorUser.apiKeyHeader)
            .set(samlAuth.getInternalRequestHeader())
            .expect(200);

          const decryptedCreatedMonitor = await monitorTestService.getMonitor(
            createdMonitorsResponse.body.monitors[0].config_id,
            { user: editorUser }
          );

          expect(decryptedCreatedMonitor.body.throttling).to.eql({
            value: null,
            id: 'no-throttling',
            label: 'No throttling',
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
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
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
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'dev',
                isServiceManaged: true,
                label: 'Dev Service',
              },
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: testPolicyId,
                agentPolicyId: testPolicyId,
                isServiceManaged: false,
                label: privateLocations[0].label,
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
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
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
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'dev',
                isServiceManaged: true,
                label: 'Dev Service',
              },
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: testPolicyId,
                agentPolicyId: testPolicyId,
                isServiceManaged: false,
                label: privateLocations[0].label,
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
            mode: 'any',
            ipv6: true,
            ipv4: true,
            params: '',
            max_attempts: 2,
            labels: {},
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
            .query({ filter: `${syntheticsMonitorType}.attributes.journey_id: ${journeyId}` })
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
            locations: [
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: 'dev',
                isServiceManaged: true,
                label: 'Dev Service',
              },
              {
                geo: {
                  lat: 0,
                  lon: 0,
                },
                id: testPolicyId,
                agentPolicyId: testPolicyId,
                isServiceManaged: false,
                label: privateLocations[0].label,
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
            mode: 'any',
            ipv4: true,
            ipv6: true,
            params: '',
            max_attempts: 2,
            updated_at: decryptedCreatedMonitor.updated_at,
            created_at: decryptedCreatedMonitor.created_at,
            labels: {},
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
      const project = `test-project-${uuidv4()}`;
      try {
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
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
      const project = `test-project-${uuidv4()}`;

      try {
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
                locations: ['dev'],
                privateLocations: privateLocations.map((location) => location.label),
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
                max_attempts: 2,
              },
              reason: "Couldn't save or update monitor because of an invalid configuration.",
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
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(formatKibanaNamespace(SPACE_ID));
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
      }
    });

    it('project monitors - browser - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [{ ...projectMonitors.monitors[0], namespace: customNamespace }] })
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
      }
    });

    it('project monitors - lightweight - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [{ ...httpProjectMonitors.monitors[1], namespace: customNamespace }] })
          .expect(200);

        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, project, SPACE_ID);
      }
    });

    it('project monitors - browser - handles custom namespace errors', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom-namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const { body } = await supertest
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors: [{ ...projectMonitors.monitors[0], namespace: customNamespace }] })
        .expect(200);
      // expect monitor not to have been deleted
      expect(body).to.eql({
        createdMonitors: [],
        failedMonitors: [
          {
            details: 'Namespace contains invalid characters',
            id: projectMonitors.monitors[0].id,
            reason: 'Invalid namespace',
          },
        ],
        updatedMonitors: [],
      });
    });

    it('project monitors - lightweight - handles custom namespace errors', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom-namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const { body } = await supertest
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors: [{ ...httpProjectMonitors.monitors[1], namespace: customNamespace }] })
        .expect(200);
      // expect monitor not to have been deleted
      expect(body).to.eql({
        createdMonitors: [],
        failedMonitors: [
          {
            details: 'Namespace contains invalid characters',
            id: httpProjectMonitors.monitors[1].id,
            reason: 'Invalid namespace',
          },
        ],
        updatedMonitors: [],
      });
    });

    it('project monitors - handles editing with spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors)
          .expect(200);
        // expect monitor not to have been deleted
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const decryptedCreatedMonitor = await monitorTestService.getMonitor(
          getResponse.body.monitors[0].config_id,
          { internal: true, space: SPACE_ID, user: editorUser }
        );
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(decryptedCreatedMonitor.body[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(
          projectMonitors.monitors[0].content
        );

        const updatedSource = 'updatedSource';
        // update monitor
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            ...projectMonitors,
            monitors: [{ ...projectMonitors.monitors[0], content: updatedSource }],
          })
          .expect(200);
        const getResponseUpdated = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .expect(200);
        const { monitors: monitorsUpdated } = getResponseUpdated.body;
        expect(monitorsUpdated.length).eql(1);

        const decryptedUpdatedMonitor = await monitorTestService.getMonitor(
          monitorsUpdated[0].config_id,
          { internal: true, space: SPACE_ID, user: editorUser }
        );
        expect(decryptedUpdatedMonitor.body[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(updatedSource);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
      }
    });

    it('project monitors - formats custom id appropriately', async () => {
      const project = `test project ${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      try {
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors)
          .expect(200);
        const getResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]).eql(
          `${projectMonitors.monitors[0].id}-${project}-${SPACE_ID}`
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project, SPACE_ID);
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
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
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

    it('project monitors - is able to enable and disable monitors', async () => {
      const project = `test-project-${uuidv4()}`;

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(projectMonitors);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { monitors } = response.body;
        expect(monitors[0].enabled).eql(false);
      } finally {
        await Promise.all([
          projectMonitors.monitors.map((monitor) => {
            return deleteMonitor(monitor.id, project);
          }),
        ]);
      }
    });

    it('project monitors - cannot update project monitors with read only privileges', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: [privateLocations[0].label],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      await supertest
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(viewerUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ monitors: testMonitors })
        .expect(403);
    });

    it('creates integration policies for project monitors with private locations', async () => {
      const project = `test-project-${uuidv4()}`;

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            ...projectMonitors,
            monitors: [
              { ...projectMonitors.monitors[0], privateLocations: [privateLocations[0].label] },
            ],
          })
          .expect(200);

        const monitorsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );
        expect(packagePolicy.name).eql(
          `${projectMonitors.monitors[0].id}-${project}-default-${privateLocations[0].label}`
        );
        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].config_id;
        const id = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: `check if title is present-${privateLocations[0].label}`,
            id,
            configId,
            projectId: project,
            locationId: testPolicyId,
            locationName: privateLocations[0].label,
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const packagesResponse = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(packagesResponse.body.items.length).eql(0);
      }
    });

    it('creates integration policies for project monitors with private locations - lightweight', async () => {
      const project = `test-project-${uuidv4()}`;

      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            ...httpProjectMonitors,
            monitors: [
              {
                ...httpProjectMonitors.monitors[1],
                'check.request.body': '${testGlobalParam}',
                privateLocations: [privateLocations[0].label],
              },
            ],
          })
          .expect(200);

        const monitorsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );
        expect(packagePolicy.name).eql(
          `${httpProjectMonitors.monitors[1].id}-${project}-default-${privateLocations[0].label}`
        );
        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].config_id;
        const id = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicyLightweight({
            inputs: {},
            name: 'My Monitor 3',
            id,
            configId,
            projectId: project,
            locationName: privateLocations[0].label,
            locationId: testPolicyId,
          })
        );
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, project);

        const packagesResponse = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(packagesResponse.body.items.length).eql(0);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor - lightweight', async () => {
      const project = `test-project-${uuidv4()}`;

      const monitorRequest = {
        monitors: [
          { ...httpProjectMonitors.monitors[1], privateLocations: [privateLocations[0].label] },
        ],
      };
      try {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send(monitorRequest)
          .expect(200);

        const monitorsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitorRequest.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: [{ ...monitorRequest.monitors[0], privateLocations: [] }],
          })
          .expect(200);

        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);
      }
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor', async () => {
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
          })
          .expect(200);

        const monitorsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        const configId = monitorsResponse.body.monitors[0].config_id;
        const id = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: `check if title is present-${privateLocations[0].label}`,
            id,
            configId,
            projectId: project,
            locationId: testPolicyId,
            locationName: privateLocations[0].label,
          })
        );

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: [{ ...projectMonitors.monitors[0], privateLocations: [] }],
          })
          .expect(200);

        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) =>
            pkgPolicy.id ===
            `${monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]}-${testPolicyId}`
        );

        expect(packagePolicy2).eql(undefined);
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
      }
    });

    it('handles updating package policies when project monitors are updated', async () => {
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
              {
                ...projectMonitors.monitors[0],
                privateLocations: [privateLocations[0].label],
              },
            ],
          });

        const monitorsResponse = await supertest
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);

        const apiResponsePolicy = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const configId = monitorsResponse.body.monitors[0].id;
        const id = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];
        const policyId = `${id}-${testPolicyId}`;

        const packagePolicy = apiResponsePolicy.body.items.find(
          (pkgPolicy: PackagePolicy) => pkgPolicy.id === policyId
        );

        expect(packagePolicy.policy_id).eql(testPolicyId);

        comparePolicies(
          packagePolicy,
          getTestProjectSyntheticsPolicy({
            inputs: {},
            name: `check if title is present-${privateLocations[0].label}`,
            id,
            configId,
            projectId: project,
            locationId: testPolicyId,
            locationName: privateLocations[0].label,
          })
        );

        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors: [
              {
                ...projectMonitors.monitors[0],
                namespace: 'custom_namespace',
                privateLocations: [privateLocations[0].label],
                enabled: false,
              },
            ],
          });

        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );

        const configId2 = monitorsResponse.body.monitors[0].id;
        const id2 = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];
        const policyId2 = `${id}-${testPolicyId}`;

        const packagePolicy2 = apiResponsePolicy2.body.items.find(
          (pkgPolicy: PackagePolicy) => pkgPolicy.id === policyId2
        );

        comparePolicies(
          packagePolicy2,
          getTestProjectSyntheticsPolicy({
            inputs: { enabled: { value: false, type: 'bool' } },
            name: `check if title is present-${privateLocations[0].label}`,
            id: id2,
            configId: configId2,
            projectId: project,
            locationId: testPolicyId,
            locationName: privateLocations[0].label,
            namespace: 'custom_namespace',
          })
        );
      } finally {
        await deleteMonitor(projectMonitors.monitors[0].id, project);

        const apiResponsePolicy2 = await supertestWithAuth.get(
          '/api/fleet/package_policies?page=1&perPage=2000&kuery=ingest-package-policies.package.name%3A%20synthetics'
        );
        expect(apiResponsePolicy2.body.items.length).eql(0);
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
                filter: `${syntheticsMonitorType}.attributes.journey_id: ${monitor.id}`,
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
                agentPolicyId: testPolicyId,
                id: testPolicyId,
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

    it('only allows 250 requests at a time', async () => {
      const project = `test-project-${uuidv4()}`;
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
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            monitors,
          })
          .expect(400);

        expect(message).to.eql(REQUEST_TOO_LARGE);
      } finally {
        await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ...projectMonitors, project });
      }
    });

    it('project monitors - cannot update a monitor of one type to another type', async () => {
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
        const { body } = await supertest
          .put(
            SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
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
                    positive: ['${testLocal1}', 'saved'],
                  },
                  status: [200],
                  json: [{ description: 'check status', expression: 'foo.bar == "myValue"' }],
                },
                enabled: false,
                hash: 'ekrjelkjrelkjre',
                id: projectMonitors.monitors[0].id,
                locations: ['dev'],
                privateLocations: [privateLocations[0].label],
                name: 'My Monitor 3',
                response: {
                  include_body: 'always',
                  include_body_max_bytes: 900,
                },
                'response.include_headers': false,
                schedule: 60,
                timeout: '80s',
                type: 'http',
                tags: 'tag2,tag2',
                urls: ['http://localhost:9200'],
                'ssl.verification_mode': 'strict',
                params: {
                  testGlobalParam2: 'testGlobalParamOverwrite',
                  testLocal1: 'testLocalParamsValue',
                },
                proxy_url: '${testGlobalParam2}',
                max_attempts: 2,
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

    it('project monitors - handles alert config without adding arbitrary fields', async () => {
      const project = `test-project-${uuidv4()}`;
      const testAlert = {
        status: {
          enabled: false,
          doesnotexit: true,
          tls: {
            enabled: true,
          },
        },
      };
      try {
        await supertest
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
                alert: testAlert,
              },
            ],
          })
          .expect(200);
        const getResponse = await supertest
          .get(`${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
          .query({
            filter: `${syntheticsMonitorType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
          })
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .expect(200);
        const { monitors } = getResponse.body;
        expect(monitors.length).eql(1);
        expect(monitors[0][ConfigKey.ALERT_CONFIG]).eql({
          status: {
            enabled: testAlert.status.enabled,
          },
          tls: {
            enabled: true,
          },
        });
      } finally {
        await deleteMonitor(httpProjectMonitors.monitors[1].id, project);
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
                locations: ['does not exist'],
              },
            ],
          })
          .expect(200);
        expect(response.body).eql({
          createdMonitors: [],
          failedMonitors: [
            {
              details:
                "Invalid locations specified. Elastic managed Location(s) 'does not exist' not found. Available locations are 'dev|dev2'",
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
                privateLocations: [privateLocations[0].label],
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

    it('project monitors - handles sending invalid private locations', async () => {
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
                privateLocations: ['does not exist'],
              },
            ],
          })
          .expect(200);
        expect(response.body).eql({
          createdMonitors: [],
          failedMonitors: [
            {
              details: `Invalid locations specified. Private Location(s) 'does not exist' not found. Available private locations are '${privateLocations[0].label}'`,
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
                privateLocations: ['does not exist'],
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
                locations: ['dev'],
                params: {
                  testGlobalParam2: 'testGlobalParamOverwrite',
                  testLocal1: 'testLocalParamsValue',
                },
                proxy_url: '${testGlobalParam2}',
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

    it('project monitors - handles no locations specified', async () => {
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
                privateLocations: [],
                locations: [],
              },
            ],
          })
          .expect(200);
        expect(response.body).eql({
          createdMonitors: [],
          failedMonitors: [
            {
              details: 'You must add at least one location or private location to this monitor.',
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
                privateLocations: [],
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
                locations: [],
                params: {
                  testGlobalParam2: 'testGlobalParamOverwrite',
                  testLocal1: 'testLocalParamsValue',
                },
                proxy_url: '${testGlobalParam2}',
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
  });
}
