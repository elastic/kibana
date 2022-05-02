/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import uuid from 'uuid';
import expect from '@kbn/expect';
import { PushMonitorsRequest } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/server/lib/saved_objects/synthetics_monitor';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('[PUT] /api/uptime/service/monitors', () => {
    const supertest = getService('supertest');

    let pushMonitors: PushMonitorsRequest;

    const setUniqueIds = (request: PushMonitorsRequest) => {
      return {
        ...request,
        monitors: request.monitors.map((monitor) => ({ ...monitor, id: uuid.v4() })),
      };
    };

    beforeEach(() => {
      pushMonitors = setUniqueIds(getFixtureJson('push_browser_monitor'));
    });

    it('push monitors - returns a list of successfully created monitors', async () => {
      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      expect(apiResponse.body).eql({
        createdMonitors: pushMonitors.monitors.map((monitor) => monitor.id),
        failedMonitors: [],
        updatedMonitors: [],
      });
    });

    it('push monitors - returns a list of successfully updated monitors', async () => {
      await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      expect(apiResponse.body).eql({
        createdMonitors: [],
        failedMonitors: [],
        updatedMonitors: pushMonitors.monitors.map((monitor) => monitor.id),
      });
    });

    it('push monitors - does not increment monitor revision unless a change has been made', async () => {
      await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      const updatedMonitorsResponse = await Promise.all(
        pushMonitors.monitors.map((monitor) => {
          return supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ query: `${syntheticsMonitorType}.attributes.custom_id: ${monitor.id}` })
            .set('kbn-xsrf', 'true')
            .expect(200);
        })
      );

      updatedMonitorsResponse.forEach((response) => {
        expect(response.body.monitors[0].attributes.revision).eql(1);
      });
    });

    it('push monitors - increments monitor revision when a change has been made', async () => {
      await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(pushMonitors);

      const editedMonitors = {
        ...pushMonitors,
        monitors: pushMonitors.monitors.map((monitor) => ({
          ...monitor,
          content: 'changed content',
        })),
      };

      await supertest
        .put(API_URLS.SYNTHETICS_MONITORS_PUSH)
        .set('kbn-xsrf', 'true')
        .send(editedMonitors);

      const updatedMonitorsResponse = await Promise.all(
        pushMonitors.monitors.map((monitor) => {
          return supertest
            .get(API_URLS.SYNTHETICS_MONITORS)
            .query({ query: `${syntheticsMonitorType}.attributes.custom_id: ${monitor.id}` })
            .set('kbn-xsrf', 'true')
            .expect(200);
        })
      );

      updatedMonitorsResponse.forEach((response) => {
        expect(response.body.monitors[0].attributes.revision).eql(2);
      });
    });
  });
}
