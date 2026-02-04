/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { expect as rawExpect } from 'expect';
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { ProjectMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { ConfigKey } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { REQUEST_TOO_LARGE } from '@kbn/synthetics-plugin/server/routes/monitor_cruds/project_monitor/add_monitor_project';
import {
  PROFILE_VALUES_ENUM,
  PROFILES_MAP,
} from '@kbn/synthetics-plugin/common/constants/monitor_defaults';
import { formatKibanaNamespace } from '@kbn/synthetics-plugin/common/formatters';
import {
  getTestProjectSyntheticsPolicy,
  getTestProjectSyntheticsPolicyLightweight,
} from './sample_data/test_project_monitor_policy';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';
import { SyntheticsMonitorTestService } from '../../services/synthetics_monitor';
import { comparePolicies } from './sample_data/test_policy';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('AddProjectMonitorsPrivateLocations', function () {
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    // TODO: Replace with roleScopedSupertest for deployment-agnostic compatibility
    // eslint-disable-next-line @kbn/eslint/deployment_agnostic_test_context
    const supertestWithAuth = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');

    let projectMonitors: ProjectMonitorsRequest;
    let httpProjectMonitors: ProjectMonitorsRequest;
    let tcpProjectMonitors: ProjectMonitorsRequest;
    let icmpProjectMonitors: ProjectMonitorsRequest;
    let editorUser: RoleCredentials;
    let viewerUser: RoleCredentials;

    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let testPolicyId: string;
    let testPrivateLocationName: string;
    const testPolicyName = `Fleet test server policy ${uuidv4()}`;
    const testPrivateLocationsService = new PrivateLocationTestService(getService);

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      viewerUser = await samlAuth.createM2mApiKeyWithRoleScope('viewer');

      await supertestWithoutAuth
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      await testPrivateLocationsService.installSyntheticsPackage();

      const apiResponse = await testPrivateLocationsService.addFleetPolicy(testPolicyName);
      testPolicyId = apiResponse.body.item.id;
      const testPrivateLocations = await testPrivateLocationsService.setTestLocations([
        testPolicyId,
      ]);
      testPrivateLocationName = testPrivateLocations[0].label;
      await supertestWithAuth
        .post(SYNTHETICS_API_URLS.PARAMS)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ key: 'testGlobalParam', value: 'testGlobalParamValue' })
        .expect(200);
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    beforeEach(async () => {
      const formatLocations = (monitors: ProjectMonitorsRequest['monitors']) => {
        return monitors.map((monitor) => {
          return {
            ...monitor,
            locations: [],
            privateLocations: [testPrivateLocationName],
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
      await kibanaServer.savedObjects.clean({
        types: [syntheticsMonitorSavedObjectType],
      });
    });

    it('project monitors - returns a failed monitor when creating integration fails', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: ['Test private location 7'],
      };
      const testMonitors = [
        projectMonitors.monitors[0],
        {
          ...secondMonitor,
          name: '!@#$%^&*()_++[\\-\\]- wow name',
        },
      ];
      try {
        const { body, status } = await monitorTestService.addProjectMonitors(
          project,
          testMonitors,
          editorUser
        );
        expect(status).eql(200);
        expect(body.createdMonitors.length).eql(1);
        expect(body.failedMonitors[0].reason).eql(
          "Couldn't save or update monitor because of an invalid configuration."
        );
      } finally {
        await Promise.all([
          testMonitors.map((monitor) => {
            return monitorTestService.deleteMonitorByJourney(
              monitor.id,
              project,
              'default',
              editorUser
            );
          }),
        ]);
      }
    });

    it('project monitors - returns a failed monitor when editing integration fails', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: [testPrivateLocationName],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      const { body, status: status0 } = await monitorTestService.addProjectMonitors(
        project,
        testMonitors,
        editorUser
      );
      expect(status0).eql(200);

      expect(body.createdMonitors.length).eql(2);
      const { body: editedBody, status: editedStatus } =
        await monitorTestService.addProjectMonitors(project, testMonitors, editorUser);
      expect(editedStatus).eql(200);

      expect(editedBody.createdMonitors.length).eql(0);
      expect(editedBody.updatedMonitors.length).eql(2);

      testMonitors[1].name = '!@#$%^&*()_++[\\-\\]- wow name';
      testMonitors[1].privateLocations = ['Test private location 8'];

      const { body: editedBodyError, status } = await monitorTestService.addProjectMonitors(
        project,
        testMonitors,
        editorUser
      );
      expect(status).eql(200);
      expect(editedBodyError.createdMonitors.length).eql(0);
      expect(editedBodyError.updatedMonitors.length).eql(1);
      expect(editedBodyError.failedMonitors.length).eql(1);
      expect(editedBodyError.failedMonitors[0].details).eql(
        `Invalid locations specified. Private Location(s) 'Test private location 8' not found. Available private locations are '${testPrivateLocationName}'`
      );
      expect(editedBodyError.failedMonitors[0].reason).eql(
        "Couldn't save or update monitor because of an invalid configuration."
      );
    });

    it('project monitors - handles browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
        const createdMonitorsResponse = await supertestWithoutAuth
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
          locations: [
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: testPolicyId,
              agentPolicyId: testPolicyId,
              isServiceManaged: false,
              label: testPrivateLocationName,
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
          maintenance_windows: [],
          spaces: ['default'],
        });
      }
    });

    it('project monitors - allows throttling false for browser monitors', async () => {
      const successfulMonitors = [projectMonitors.monitors[0]];
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
        const createdMonitorsResponse = await supertestWithoutAuth
          .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
          .query({
            filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${journeyId}`,
          })
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
    });

    it('project monitors - handles http monitors', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const successfulMonitors = [httpProjectMonitors.monitors[1]];
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
        const createdMonitorsResponse = await supertestWithoutAuth
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
          locations: [
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: testPolicyId,
              agentPolicyId: testPolicyId,
              isServiceManaged: false,
              label: testPrivateLocationName,
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
          maintenance_windows: [],
          spaces: ['default'],
          updated_at: decryptedCreatedMonitor.updated_at,
          created_at: decryptedCreatedMonitor.created_at,
        });
      }
    });

    it('project monitors - handles tcp monitors', async () => {
      const successfulMonitors = [tcpProjectMonitors.monitors[0], tcpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
        const createdMonitorsResponse = await supertestWithoutAuth
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
          locations: [
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: testPolicyId,
              agentPolicyId: testPolicyId,
              isServiceManaged: false,
              label: testPrivateLocationName,
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
          maintenance_windows: [],
          spaces: ['default'],
          updated_at: decryptedCreatedMonitor.updated_at,
          created_at: decryptedCreatedMonitor.created_at,
        });
      }
    });

    it('project monitors - handles icmp monitors', async () => {
      const successfulMonitors = [icmpProjectMonitors.monitors[0], icmpProjectMonitors.monitors[1]];
      const kibanaVersion = await kibanaServer.version.get();
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
        const createdMonitorsResponse = await supertestWithoutAuth
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
          locations: [
            {
              geo: {
                lat: 0,
                lon: 0,
              },
              id: testPolicyId,
              agentPolicyId: testPolicyId,
              isServiceManaged: false,
              label: testPrivateLocationName,
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
          maintenance_windows: [],
          spaces: ['default'],
        });
      }
    });

    it('project monitors - returns a list of successfully created monitors', async () => {
      const project = `test-project-${uuidv4()}`;
      const { body } = await supertestWithoutAuth
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
    });

    it('project monitors - returns a list of successfully updated monitors', async () => {
      const project = `test-project-${uuidv4()}`;

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(projectMonitors)
        .expect(200);
      const { body } = await supertestWithoutAuth
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
    });

    it('project monitors - validates monitor type', async () => {
      const project = `test-project-${uuidv4()}`;

      const { body } = await supertestWithoutAuth
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
              locations: [],
              privateLocations: [testPrivateLocationName],
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
    });

    it('project monitors - saves space as data stream namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
        .expect(200);
      // expect monitor not to have been deleted
      const getResponse = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const { monitors } = getResponse.body;
      expect(monitors.length).eql(1);
      expect(monitors[0][ConfigKey.NAMESPACE]).eql(formatKibanaNamespace(SPACE_ID));
    });

    it('project monitors - browser - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              namespace: customNamespace,
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
        .expect(200);
      // expect monitor not to have been deleted
      const getResponse = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .expect(200);
      const { monitors } = getResponse.body;
      expect(monitors.length).eql(1);
      expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
    });

    it('project monitors - lightweight - handles custom namespace', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom.namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
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
              namespace: customNamespace,
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
        .expect(200);

      // expect monitor not to have been deleted
      const getResponse = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
        })
        .set('kbn-xsrf', 'true')
        .expect(200);
      const { monitors } = getResponse.body;
      expect(monitors.length).eql(1);
      expect(monitors[0][ConfigKey.NAMESPACE]).eql(customNamespace);
    });

    it('project monitors - browser - handles custom namespace errors', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      const customNamespace = 'custom-namespace';
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      const { body } = await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              namespace: customNamespace,
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
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
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      const { body } = await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
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
              namespace: customNamespace,
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
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
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: projectMonitors.monitors.map((monitor) => ({
            ...monitor,
            privateLocations: [spaceScopedPrivateLocation.label],
          })),
        })
        .expect(200);
      // expect monitor not to have been deleted
      const getResponse = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
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
      await supertestWithoutAuth
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
          monitors: [
            {
              ...projectMonitors.monitors[0],
              content: updatedSource,
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
        .expect(200);
      const getResponseUpdated = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .expect(200);
      const { monitors: monitorsUpdated } = getResponseUpdated.body;
      expect(monitorsUpdated.length).eql(1);

      const decryptedUpdatedMonitor = await monitorTestService.getMonitor(
        monitorsUpdated[0].config_id,
        { internal: true, space: SPACE_ID, user: editorUser }
      );
      expect(decryptedUpdatedMonitor.body[ConfigKey.SOURCE_PROJECT_CONTENT]).eql(updatedSource);
    });

    it('project monitors - formats custom id appropriately', async () => {
      const project = `test project ${uuidv4()}`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID
      );
      await supertestWithoutAuth
        .put(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
            '{projectName}',
            project
          )}`
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              privateLocations: [spaceScopedPrivateLocation.label],
            },
          ],
        })
        .expect(200);
      const getResponse = await supertestWithoutAuth
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .expect(200);
      const { monitors } = getResponse.body;
      expect(monitors.length).eql(1);
      expect(monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID]).eql(
        `${projectMonitors.monitors[0].id}-${project}-${SPACE_ID}`
      );
    });

    it('project monitors - is able to decrypt monitor when updated after hydration', async () => {
      const project = `test-project-${uuidv4()}`;
      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(projectMonitors)
        .expect(200);

      const response = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      const { monitors } = response.body;

      // update project monitor via push api
      const { body } = await supertestWithoutAuth
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
    });

    it('project monitors - is able to enable and disable monitors', async () => {
      const project = `test-project-${uuidv4()}`;

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(projectMonitors);

      await supertestWithoutAuth
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
      const response = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
        })
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      const { monitors } = response.body;
      expect(monitors[0].enabled).eql(false);
    });

    it('project monitors - cannot update project monitors with read only privileges', async () => {
      const project = `test-project-${uuidv4()}`;

      const secondMonitor = {
        ...projectMonitors.monitors[0],
        id: 'test-id-2',
        privateLocations: [testPrivateLocationName],
      };
      const testMonitors = [projectMonitors.monitors[0], secondMonitor];
      await supertestWithoutAuth
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

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          ...projectMonitors,
          monitors: [
            { ...projectMonitors.monitors[0], privateLocations: [testPrivateLocationName] },
          ],
        })
        .expect(200);

      const monitorsResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
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
        `${projectMonitors.monitors[0].id}-${project}-default-${testPrivateLocationName}`
      );
      expect(packagePolicy.policy_id).eql(testPolicyId);

      const configId = monitorsResponse.body.monitors[0].config_id;
      const id = monitorsResponse.body.monitors[0][ConfigKey.CUSTOM_HEARTBEAT_ID];

      comparePolicies(
        packagePolicy,
        getTestProjectSyntheticsPolicy({
          inputs: {},
          name: `check if title is present-${testPrivateLocationName}`,
          id,
          configId,
          projectId: project,
          locationId: testPolicyId,
          locationName: testPrivateLocationName,
        })
      );
    });

    it('creates integration policies for project monitors with private locations - lightweight', async () => {
      const project = `test-project-${uuidv4()}`;

      await supertestWithoutAuth
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
              privateLocations: [testPrivateLocationName],
            },
          ],
        })
        .expect(200);

      const monitorsResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
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
        `${httpProjectMonitors.monitors[1].id}-${project}-default-${testPrivateLocationName}`
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
          locationName: testPrivateLocationName,
          locationId: testPolicyId,
        })
      );
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor - lightweight', async () => {
      const project = `test-project-${uuidv4()}`;
      const secondPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation();

      const monitorRequest = {
        monitors: [
          {
            ...httpProjectMonitors.monitors[1],
            privateLocations: [testPrivateLocationName, secondPrivateLocation.label],
          },
        ],
      };
      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitorRequest)
        .expect(200);

      const monitorsResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${monitorRequest.monitors[0].id}`,
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

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            { ...monitorRequest.monitors[0], privateLocations: [secondPrivateLocation.label] },
          ],
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
    });

    it('deletes integration policies for project monitors when private location is removed from the monitor', async () => {
      const project = `test-project-${uuidv4()}`;
      const secondPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation();

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              privateLocations: [testPrivateLocationName, secondPrivateLocation.label],
            },
          ],
        })
        .expect(200);

      const monitorsResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
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
          name: `check if title is present-${testPrivateLocationName}`,
          id,
          configId,
          projectId: project,
          locationId: testPolicyId,
          locationName: testPrivateLocationName,
        })
      );

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            { ...projectMonitors.monitors[0], privateLocations: [secondPrivateLocation.label] },
          ],
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
    });

    it('handles updating package policies when project monitors are updated', async () => {
      const project = `test-project-${uuidv4()}`;

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...projectMonitors.monitors[0],
              privateLocations: [testPrivateLocationName],
            },
          ],
        });

      const monitorsResponse = await supertestWithoutAuth
        .get(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${projectMonitors.monitors[0].id}`,
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
          name: `check if title is present-${testPrivateLocationName}`,
          id,
          configId,
          projectId: project,
          locationId: testPolicyId,
          locationName: testPrivateLocationName,
        })
      );

      await supertestWithoutAuth
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
              privateLocations: [testPrivateLocationName],
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
          name: `check if title is present-${testPrivateLocationName}`,
          id: id2,
          configId: configId2,
          projectId: project,
          locationId: testPolicyId,
          locationName: testPrivateLocationName,
          namespace: 'custom_namespace',
        })
      );
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
        } = await supertestWithoutAuth
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
        await supertestWithoutAuth
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

      await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(projectMonitors)
        .expect(200);
      const { body } = await supertestWithoutAuth
        .put(
          SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace('{projectName}', project)
        )
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          monitors: [
            {
              ...httpProjectMonitors.monitors[1],
              id: projectMonitors.monitors[0].id,
              maintenance_windows: [],
            },
          ],
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
              locations: [],
              maintenance_windows: [],
              privateLocations: [testPrivateLocationName],
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
      await supertestWithoutAuth
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
      const getResponse = await supertestWithoutAuth
        .get(`${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .query({
          filter: `${syntheticsMonitorSavedObjectType}.attributes.journey_id: ${httpProjectMonitors.monitors[1].id}`,
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
    });

    it('project monitors - handles sending invalid public location', async () => {
      const project = `test-project-${uuidv4()}`;
      const response = await supertestWithoutAuth
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
              maintenance_windows: [],
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
              maintenance_windows: [],
              privateLocations: [testPrivateLocationName],
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
    });

    it('project monitors - handles sending invalid private locations', async () => {
      const project = `test-project-${uuidv4()}`;
      const response = await supertestWithoutAuth
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
              locations: [],
              privateLocations: ['does not exist'],
              maintenance_windows: [],
            },
          ],
        })
        .expect(200);
      rawExpect(response.body).toEqual({
        createdMonitors: [],
        failedMonitors: [
          {
            details: rawExpect.stringContaining(
              `Invalid locations specified. Private Location(s) 'does not exist' not found.`
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
              locations: [],
              maintenance_windows: [],
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
    });

    it('project monitors - handles no locations specified', async () => {
      const project = `test-project-${uuidv4()}`;
      const response = await supertestWithoutAuth
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
              maintenance_windows: [],
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
              maintenance_windows: [],
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
    });

    it('project monitors - cannot update project monitors when user does not have access to a space in multi space use case', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      const limitedRole = {
        elasticsearch: {
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
        kibana: [
          {
            base: [],
            spaces: [SPACE_ID_1],
            feature: { uptime: ['all'] },
          },
        ],
      };
      await samlAuth.setCustomRole(limitedRole);
      const limitedUser = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      try {
        // Try to add a monitor to both spaces, but user only has access to one
        const multiSpaceMonitor = {
          ...projectMonitors.monitors[0],
          spaces: [SPACE_ID_1, SPACE_ID_2],
        };

        const resp = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(limitedUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [multiSpaceMonitor] });

        expect(resp.status).to.eql(403);
        expect(resp.body.message).to.eql(
          'You do not have sufficient permissions to update monitors in all required spaces.'
        );
      } finally {
        await monitorTestService.deleteMonitorByJourney(
          projectMonitors.monitors[0].id,
          project,
          SPACE_ID_1,
          editorUser
        );
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
        await samlAuth.deleteCustomRole();
      }
    });

    it('project monitors - cannot update project monitors when user does not have access to all spaces using * in spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      const limitedRole = {
        elasticsearch: {
          indices: [{ names: ['*'], privileges: ['all'] }],
        },
        kibana: [
          {
            base: [],
            spaces: [SPACE_ID_1],
            feature: { uptime: ['all'] },
          },
        ],
      };
      await samlAuth.setCustomRole(limitedRole);
      const limitedUser = await samlAuth.createM2mApiKeyWithCustomRoleScope();

      try {
        // Try to add a monitor to all spaces using '*', but user only has access to one
        const multiSpaceMonitor = {
          ...projectMonitors.monitors[0],
          spaces: ['*'],
        };

        const resp = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(limitedUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [multiSpaceMonitor] });

        expect(resp.status).to.eql(403);
        expect(resp.body.message).to.eql(
          'You do not have sufficient permissions to update monitors in all required spaces.'
        );
      } finally {
        await monitorTestService.deleteMonitorByJourney(
          projectMonitors.monitors[0].id,
          project,
          SPACE_ID_1,
          editorUser
        );
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
        await samlAuth.deleteCustomRole();
      }
    });

    it('project monitors - user with access to all spaces can specify * in spaces and monitor is created in all spaces', async () => {
      const project = `test-project-${uuidv4()}`;
      const SPACE_ID_1 = `test-space-1-${uuidv4()}`;
      const SPACE_ID_2 = `test-space-2-${uuidv4()}`;
      const SPACE_NAME_1 = `test-space-name-1-${uuidv4()}`;
      const SPACE_NAME_2 = `test-space-name-2-${uuidv4()}`;
      const spaceScopedPrivateLocation = await testPrivateLocationsService.addTestPrivateLocation(
        SPACE_ID_1
      );

      await kibanaServer.spaces.create({ id: SPACE_ID_1, name: SPACE_NAME_1 });
      await kibanaServer.spaces.create({ id: SPACE_ID_2, name: SPACE_NAME_2 });

      try {
        // Use a monitor with spaces: ['*']
        const monitorId = uuidv4();
        const monitor = {
          ...httpProjectMonitors.monitors[1],
          privateLocations: [spaceScopedPrivateLocation.label],
          id: monitorId,
          name: `All spaces Monitor ${monitorId}`,
          spaces: ['*'],
        };

        // Create monitor in SPACE_ID_1 context
        const { body } = await supertestWithoutAuth
          .put(
            `/s/${SPACE_ID_1}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set(editorUser.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ monitors: [monitor] })
          .expect(200);

        expect(body).eql({
          updatedMonitors: [],
          createdMonitors: [monitorId],
          failedMonitors: [],
        });

        // Use savedObjects client to verify monitor is created in all spaces
        const soRes = await kibanaServer.savedObjects.find({
          type: syntheticsMonitorSavedObjectType,
        });

        // Find the monitor
        const found = soRes.saved_objects.find(
          (obj: any) => obj.attributes.journey_id === monitorId
        );
        expect(found).not.to.be(undefined);
        expect(found?.namespaces).to.eql('*');
        expect(found?.attributes.name).to.eql(monitor.name);
      } finally {
        await kibanaServer.spaces.delete(SPACE_ID_1);
        await kibanaServer.spaces.delete(SPACE_ID_2);
      }
    });
  });
}
