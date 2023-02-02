/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidv4 } from 'uuid';
import { SimpleSavedObject } from '@kbn/core/public';
import {
  ConfigKey,
  SyntheticsMonitor,
  MonitorFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS, API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('GetMonitorsOverview', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const security = getService('security');

    const username = 'admin';
    const roleName = `synthetics_admin`;
    const password = `${username}-password`;
    const SPACE_ID = `test-space-${uuidv4()}`;
    const SPACE_NAME = `test-space-name ${uuidv4()}`;

    let _monitors: MonitorFields[];
    let monitors: MonitorFields[];

    const deleteMonitor = async (id: string) => {
      try {
        await supertest
          .delete(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}/${id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    };

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
        .set('kbn-xsrf', 'true')
        .send(monitor);

      return res.body as SimpleSavedObject<MonitorFields>;
    };

    before(async () => {
      await supertest.post(API_URLS.SYNTHETICS_ENABLEMENT).set('kbn-xsrf', 'true').expect(200);
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
        .get(`/s/${SPACE_ID}${API_URLS.SYNTHETICS_MONITORS}`)
        .set('kbn-xsrf', 'true')
        .expect(200);
      await Promise.all([
        (body.monitors as Array<SimpleSavedObject<MonitorFields>>).map((monitor) => {
          return deleteMonitor(monitor.id);
        }),
      ]);

      _monitors = [getFixtureJson('http_monitor')];
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

    it('returns the correct response', async () => {
      let savedMonitors: SimpleSavedObject[] = [];
      try {
        const savedResponse = await Promise.all(monitors.map(saveMonitor));
        savedMonitors = savedResponse;

        const apiResponse = await supertest.get(
          `/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW}`
        );

        expect(apiResponse.body.total).eql(monitors.length * 2);
        expect(apiResponse.body.allMonitorIds.sort()).eql(
          savedMonitors.map((monitor) => monitor.id).sort()
        );
        expect(apiResponse.body.monitors.length).eql(40);
      } finally {
        await Promise.all(
          savedMonitors.map((monitor) => {
            return deleteMonitor(monitor.id);
          })
        );
      }
    });

    it('accepts search queries', async () => {
      let savedMonitors: Array<SimpleSavedObject<SyntheticsMonitor>> = [];
      try {
        const savedResponse = await Promise.all(monitors.map(saveMonitor));
        savedMonitors = savedResponse;

        const apiResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW}`)
          .query({
            query: '19',
          });

        expect(apiResponse.body.total).eql(2);
        expect(apiResponse.body.allMonitorIds.sort()).eql(
          savedMonitors
            .filter((monitor) => monitor.attributes.name.includes('19'))
            .map((monitor) => monitor.id)
        );
        expect(apiResponse.body.monitors.length).eql(2);
      } finally {
        await Promise.all(
          savedMonitors.map((monitor) => {
            return deleteMonitor(monitor.id);
          })
        );
      }
    });

    it('returns the correct response', async () => {
      let savedMonitors: Array<SimpleSavedObject<SyntheticsMonitor>> = [];
      const customHeartbeatId = 'example_custom_heartbeat_id';
      try {
        const savedResponse = await Promise.all(
          [
            { ...monitors[0], name: 'test monitor a' },
            {
              ...monitors[1],
              custom_heartbeat_id: 'example_custom_heartbeat_id',
              name: 'test monitor b',
            },
          ].map(saveMonitor)
        );
        savedMonitors = savedResponse;

        const apiResponse = await supertest
          .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_OVERVIEW}`)
          .query({ sortField: 'status' });
        expect(apiResponse.body.monitors).eql([
          {
            id: savedMonitors[0].attributes[ConfigKey.MONITOR_QUERY_ID],
            configId: savedMonitors[0].id,
            name: 'test monitor a',
            location: {
              id: 'eu-west-01',
              label: 'Europe East',
              geo: {
                lat: 33.2343132435,
                lon: 73.2342343434,
              },
              url: 'https://example-url.com',
              isServiceManaged: true,
            },
            isEnabled: true,
            isStatusAlertEnabled: true,
          },
          {
            id: savedMonitors[0].attributes[ConfigKey.MONITOR_QUERY_ID],
            configId: savedMonitors[0].id,
            name: 'test monitor a',
            location: {
              id: 'eu-west-02',
              label: 'Europe West',
              geo: {
                lat: 33.2343132435,
                lon: 73.2342343434,
              },
              url: 'https://example-url.com',
              isServiceManaged: true,
            },
            isEnabled: true,
            isStatusAlertEnabled: true,
          },
          {
            id: savedMonitors[1].attributes[ConfigKey.MONITOR_QUERY_ID],
            configId: savedMonitors[1].id,
            name: 'test monitor b',
            location: {
              id: 'eu-west-01',
              label: 'Europe East',
              geo: {
                lat: 33.2343132435,
                lon: 73.2342343434,
              },
              url: 'https://example-url.com',
              isServiceManaged: true,
            },
            isEnabled: true,
            isStatusAlertEnabled: true,
          },
          {
            id: savedMonitors[1].attributes[ConfigKey.MONITOR_QUERY_ID],
            configId: savedMonitors[1].id,
            name: 'test monitor b',
            location: {
              id: 'eu-west-02',
              label: 'Europe West',
              geo: {
                lat: 33.2343132435,
                lon: 73.2342343434,
              },
              url: 'https://example-url.com',
              isServiceManaged: true,
            },
            isEnabled: true,
            isStatusAlertEnabled: true,
          },
        ]);
        expect(savedMonitors[1].attributes[ConfigKey.MONITOR_QUERY_ID]).eql(customHeartbeatId);
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
