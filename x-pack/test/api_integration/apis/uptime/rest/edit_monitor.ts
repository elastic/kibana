/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { SimpleSavedObject } from '@kbn/core/public';
import { secretKeys } from '@kbn/uptime-plugin/common/constants/monitor_management';
import { ConfigKey, HTTPFields, MonitorFields } from '@kbn/uptime-plugin/common/runtime_types';
import { API_URLS } from '@kbn/uptime-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
export default function ({ getService }: FtrProviderContext) {
  describe('[PUT] /internal/uptime/service/monitors', () => {
    const supertest = getService('supertest');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const saveMonitor = async (monitor: MonitorFields) => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(monitor)
        .expect(200);

      return res.body as SimpleSavedObject<MonitorFields>;
    };

    before(() => {
      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(() => {
      httpMonitorJson = { ..._httpMonitorJson };
    });

    it('edits the monitor', async () => {
      const newMonitor = httpMonitorJson;

      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        newMonitor as MonitorFields
      );

      expect(savedMonitor).eql(omit(newMonitor, secretKeys));

      const updates: Partial<HTTPFields> = {
        [ConfigKey.URLS]: 'https://modified-host.com',
        [ConfigKey.NAME]: 'Modified name',
      };

      const modifiedMonitor = { ...newMonitor, ...updates };

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(modifiedMonitor)
        .expect(200);

      expect(editResponse.body.attributes).eql(
        omit({ ...modifiedMonitor, revision: 2 }, secretKeys)
      );
    });

    it('returns 404 if monitor id is not present', async () => {
      const invalidMonitorId = 'invalid-id';
      const expected404Message = `Monitor id ${invalidMonitorId} not found!`;

      const editResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + invalidMonitorId)
        .set('kbn-xsrf', 'true')
        .send(httpMonitorJson)
        .expect(404);

      expect(editResponse.body.message).eql(expected404Message);
    });

    it('returns bad request if payload is invalid for HTTP monitor', async () => {
      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      // Delete a required property to make payload invalid
      const toUpdate = { ...savedMonitor, 'check.request.headers': null };

      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
    });

    it('returns bad request if monitor type is invalid', async () => {
      const { id: monitorId, attributes: savedMonitor } = await saveMonitor(
        httpMonitorJson as MonitorFields
      );

      const toUpdate = { ...savedMonitor, type: 'invalid-data-steam' };

      const apiResponse = await supertest
        .put(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
        .set('kbn-xsrf', 'true')
        .send(toUpdate);

      expect(apiResponse.status).eql(400);
      expect(apiResponse.body.message).eql('Monitor type is invalid');
    });
  });
}
