/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import expect from 'expect';
import {
  MonitorFields,
  EncryptedSyntheticsSavedMonitor,
  ProjectMonitorsRequest,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('SyntheticsSuggestions', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const security = getService('security');

    const username = 'admin';
    const roleName = `synthetics_admin`;
    const password = `${username}-password`;
    const SPACE_ID = `test-space-${uuidv4()}`;
    const SPACE_NAME = `test-space-name ${uuidv4()}`;

    let projectMonitors: ProjectMonitorsRequest;
    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    const setUniqueIds = (request: ProjectMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuidv4() })),
      };
    };

    const deleteMonitor = async (id: string) => {
      try {
        await supertest
          .delete(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}/${id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set('kbn-xsrf', 'true')
        .send(monitor);

      return res.body as EncryptedSyntheticsSavedMonitor;
    };

    before(async () => {
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });
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
      const { body } = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await Promise.all([
        (body.monitors as EncryptedSyntheticsSavedMonitor[]).map((monitor) => {
          return deleteMonitor(monitor.id);
        }),
      ]);

      _monitors = [getFixtureJson('http_monitor')];
      projectMonitors = setUniqueIds({
        monitors: getFixtureJson('project_icmp_monitor')
          .monitors.slice(0, 2)
          .map((monitor: any) => ({ ...monitor, privateLocations: [] })),
      });
    });

    beforeEach(() => {
      monitors = [];
      for (let i = 0; i < 20; i++) {
        monitors.push({
          ..._monitors[0],
          name: `${_monitors[0].name} ${i}`,
        });
      }
    });

    after(async () => {
      await kibanaServer.spaces.delete(SPACE_ID);
      await security.user.delete(username);
      await security.role.delete(roleName);
    });

    it('returns the suggestions', async () => {
      let savedMonitors: EncryptedSyntheticsSavedMonitor[] = [];
      try {
        savedMonitors = await Promise.all(monitors.map(saveMonitor));
        const project = `test-project-${uuidv4()}`;
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);
        const apiResponse = await supertest.get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SUGGESTIONS}`);
        expect(apiResponse.body).toEqual({
          locations: [
            {
              count: 20,
              label: 'eu-west-01',
              value: 'eu-west-01',
            },
            {
              count: 20,
              label: 'eu-west-02',
              value: 'eu-west-02',
            },
            {
              count: 2,
              label: 'Dev Service',
              value: 'dev',
            },
          ],
          monitorIds: expect.arrayContaining([
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
          ]),
          projects: [
            {
              count: 2,
              label: project,
              value: project,
            },
          ],
          tags: expect.arrayContaining([
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
          ]),
        });
      } finally {
        await Promise.all(
          savedMonitors.map((monitor) => {
            return deleteMonitor(monitor.id);
          })
        );
      }
    });

    it('handles query params for projects', async () => {
      let savedMonitors: EncryptedSyntheticsSavedMonitor[] = [];
      try {
        savedMonitors = await Promise.all(monitors.map(saveMonitor));
        const project = `test-project-${uuidv4()}`;
        await supertest
          .put(
            `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROJECT_UPDATE.replace(
              '{projectName}',
              project
            )}`
          )
          .set('kbn-xsrf', 'true')
          .send(projectMonitors)
          .expect(200);

        const apiResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SUGGESTIONS}`)
          .query({
            projects: [project],
          });

        expect(apiResponse.body).toEqual({
          locations: [
            {
              count: 2,
              label: 'Dev Service',
              value: 'dev',
            },
          ],
          monitorIds: expect.arrayContaining(
            projectMonitors.monitors.map((monitor) => ({
              count: 1,
              label: monitor.name,
              value: expect.any(String),
            }))
          ),
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
      } finally {
        await Promise.all(
          savedMonitors.map((monitor) => {
            return deleteMonitor(monitor.id);
          })
        );
      }
    });
  });
}
