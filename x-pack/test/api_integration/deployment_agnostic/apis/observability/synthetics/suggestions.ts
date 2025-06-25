/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from 'expect';
import { RoleCredentials } from '@kbn/ftr-common-functional-services';
import {
  MonitorFields,
  EncryptedSyntheticsSavedMonitor,
  ProjectMonitorsRequest,
  PrivateLocation,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { syntheticsMonitorSavedObjectType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import pMap from 'p-map';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helpers/get_fixture_json';
import { PrivateLocationTestService } from '../../../services/synthetics_private_location';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  describe('SyntheticsSuggestions', function () {
    const supertest = getService('supertestWithoutAuth');
    const kibanaServer = getService('kibanaServer');
    const samlAuth = getService('samlAuth');
    const privateLocationsTestService = new PrivateLocationTestService(getService);

    const SPACE_ID = `test-space-${uuidv4()}`;
    const SPACE_NAME = `test-space-name ${uuidv4()}`;

    let projectMonitors: ProjectMonitorsRequest;
    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];
    let editorUser: RoleCredentials;
    let privateLocation: PrivateLocation;

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({
          ...monitor,
          id: uuidv4(),
          locations: [],
          privateLocations: [privateLocation.label],
        })),
      };
    };

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send(monitor);

      return res.body as EncryptedSyntheticsSavedMonitor;
    };

    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: [
          syntheticsMonitorSavedObjectType,
          'ingest-agent-policies',
          'ingest-package-policies',
          'synthetics-private-location',
        ],
      });
      editorUser = await samlAuth.createM2mApiKeyWithRoleScope('editor');
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
      privateLocation = await privateLocationsTestService.addTestPrivateLocation(SPACE_ID);
      _monitors = [getFixtureJson('http_monitor')].map((monitor) => ({
        ...monitor,
        locations: [privateLocation],
      }));
      projectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_icmp_monitor')
          .monitors.slice(0, 2)
          .map((monitor: any) => ({
            ...monitor,
            privateLocations: [privateLocation.label],
            locations: [],
          })),
      });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.clean({
        types: [syntheticsMonitorSavedObjectType, 'ingest-package-policies'],
      });

      monitors = [];
      for (let i = 0; i < 20; i++) {
        monitors.push({
          ..._monitors[0],
          locations: [privateLocation],
          name: `${_monitors[0].name} ${i}`,
          spaces: [],
        });
      }
    });

    after(async () => {
      await kibanaServer.spaces.delete(SPACE_ID);
    });

    it('returns the suggestions', async () => {
      const project = `test-project-${uuidv4()}`;
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
      await pMap(
        monitors,
        async (monitor) => {
          return saveMonitor(monitor);
        },
        { concurrency: 1 }
      );

      const apiResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SUGGESTIONS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .expect(200);

      expect(apiResponse.body.locations).toEqual([
        {
          count: 22,
          label: privateLocation.label,
          value: privateLocation.id,
        },
      ]);
      const expectedIds = [
        ...monitors.map((monitor) => ({
          count: 1,
          label: monitor.name,
          value: expect.any(String),
        })),
        ...projectMonitors.monitors.slice(0, 2).map((monitor) => ({
          count: 1,
          label: monitor.name,
          value: expect.any(String),
        })),
      ];
      expect(apiResponse.body.monitorIds).toEqual(expect.arrayContaining(expectedIds));
      expect(apiResponse.body.monitorTypes).toEqual([
        {
          count: 20,
          label: 'http',
          value: 'http',
        },
        {
          count: 2,
          label: 'icmp',
          value: 'icmp',
        },
      ]);
      expect(apiResponse.body.projects).toEqual([
        {
          count: 2,
          label: project,
          value: project,
        },
      ]);
      expect(apiResponse.body.tags).toEqual(
        expect.arrayContaining([
          {
            count: 21,
            label: 'tag1',
            value: 'tag1',
          },
          {
            count: 21,
            label: 'tag2',
            value: 'tag2',
          },
          {
            count: 1,
            label: 'org:google',
            value: 'org:google',
          },
          {
            count: 1,
            label: 'service:smtp',
            value: 'service:smtp',
          },
        ])
      );
    });

    it('handles query params for projects', async () => {
      for (let i = 0; i < monitors.length; i++) {
        await saveMonitor(monitors[i]);
      }
      const project = `test-project-${uuidv4()}`;
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

      const apiResponse = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SUGGESTIONS}`)
        .set(editorUser.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .query({
          projects: [project],
        })
        .expect(200);

      expect(apiResponse.body).toEqual({
        locations: [
          {
            count: 2,
            label: privateLocation.label,
            value: privateLocation.id,
          },
        ],
        monitorIds: expect.arrayContaining(
          projectMonitors.monitors.map((monitor) => ({
            count: 1,
            label: monitor.name,
            value: expect.any(String),
          }))
        ),
        monitorTypes: [
          {
            count: 2,
            label: 'icmp',
            value: 'icmp',
          },
        ],
        projects: [
          {
            count: 2,
            label: project,
            value: project,
          },
        ],
        tags: expect.arrayContaining([
          {
            count: 1,
            label: 'tag1',
            value: 'tag1',
          },
          {
            count: 1,
            label: 'tag2',
            value: 'tag2',
          },
          {
            count: 1,
            label: 'org:google',
            value: 'org:google',
          },
          {
            count: 1,
            label: 'service:smtp',
            value: 'service:smtp',
          },
        ]),
      });
    });
  });
}
