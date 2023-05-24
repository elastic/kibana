/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { ConfigKey, HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { API_URLS, SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';

import { secretKeys } from '@kbn/synthetics-plugin/common/constants/monitor_management';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from '../uptime/rest/helper/get_fixture_json';
import { Spaces } from '../../../alerting_api_integration/spaces_only/scenarios';
import { ObjectRemover } from '../../../alerting_api_integration/common/lib';

export default function ({ getService }: FtrProviderContext) {
  describe('EnableDefaultAlerting', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const retry = getService('retry');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const objectRemover = new ObjectRemover(supertest);

    after(async () => {
      await objectRemover.removeAll();
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
    });

    before(() => {
      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(async () => {
      httpMonitorJson = _httpMonitorJson;
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    it('returns the created alerted when called', async () => {
      const apiResponse = await supertest
        .post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send({});

      const omitFields = ['id', 'updatedAt', 'createdAt', 'scheduledTaskId', 'executionStatus'];

      objectRemover.add(Spaces.default.id, apiResponse.body.id, 'rule', 'alerting');

      expect(omit(apiResponse.body, omitFields)).eql(
        omit(
          {
            id: '1d72eb10-8046-11ed-9c27-7d79cab2e477',
            notifyWhen: 'onActionGroupChange',
            consumer: 'uptime',
            alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
            apiKeyCreatedByUser: false,
            tags: ['SYNTHETICS_DEFAULT_ALERT'],
            name: 'Synthetics internal alert',
            enabled: true,
            throttle: null,
            apiKeyOwner: 'elastic',
            createdBy: 'elastic',
            updatedBy: 'elastic',
            muteAll: false,
            mutedInstanceIds: [],
            schedule: { interval: '1m' },
            actions: [],
            params: {},
            updatedAt: '2022-12-20T09:10:15.500Z',
            createdAt: '2022-12-20T09:10:15.500Z',
            scheduledTaskId: '1d72eb10-8046-11ed-9c27-7d79cab2e477',
            executionStatus: { status: 'pending', lastExecutionDate: '2022-12-20T09:10:15.500Z' },
            ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
            running: false,
            revision: 0,
          },
          omitFields
        )
      );
    });

    it('enables alert when new monitor is added', async () => {
      const newMonitor = httpMonitorJson;

      const apiResponse = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.body.attributes).eql(
        omit(
          {
            ...newMonitor,
            [ConfigKey.MONITOR_QUERY_ID]: apiResponse.body.id,
            [ConfigKey.CONFIG_ID]: apiResponse.body.id,
          },
          secretKeys
        )
      );

      let foundAlert: any;

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true');

        expect(res.body.ruleTypeId).eql('xpack.synthetics.alerts.monitorStatus');
        foundAlert = res.body;
      });
      if (foundAlert) {
        objectRemover.add(Spaces.default.id, foundAlert.id, 'rule', 'alerting');
      }
    });
  });
}
