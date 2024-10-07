/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import { DYNAMIC_SETTINGS_DEFAULTS } from '@kbn/synthetics-plugin/common/constants/settings_defaults';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { addMonitorAPIHelper, omitMonitorKeys } from './add_monitor';

export default function ({ getService }: FtrProviderContext) {
  describe('EnableDefaultAlerting', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const retry = getService('retry');

    let _httpMonitorJson: HTTPFields;
    let httpMonitorJson: HTTPFields;

    const addMonitorAPI = async (monitor: any, statusCode = 200) => {
      return addMonitorAPIHelper(supertest, monitor, statusCode);
    };

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();

      _httpMonitorJson = getFixtureJson('http_monitor');
    });

    beforeEach(async () => {
      httpMonitorJson = _httpMonitorJson;
      await kibanaServer.savedObjects.cleanStandardList();
      await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send(DYNAMIC_SETTINGS_DEFAULTS)
        .expect(200);
    });

    it('returns the created alerted when called', async () => {
      const apiResponse = await supertest
        .post(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const omitFields = [
        'id',
        'updatedAt',
        'createdAt',
        'scheduledTaskId',
        'executionStatus',
        'monitoring',
        'nextRun',
        'lastRun',
        'snoozeSchedule',
        'viewInAppRelativeUrl',
      ];

      const statusRule = apiResponse.body.statusRule;
      const tlsRule = apiResponse.body.tlsRule;

      expect(omit(statusRule, omitFields)).eql(omit(defaultAlertRules.statusRule, omitFields));
      expect(omit(tlsRule, omitFields)).eql(omit(defaultAlertRules.tlsRule, omitFields));
    });

    it('enables alert when new monitor is added', async () => {
      const newMonitor = httpMonitorJson;

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(omitMonitorKeys(newMonitor));

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule.ruleTypeId).eql('xpack.synthetics.alerts.monitorStatus');
        expect(res.body.tlsRule.ruleTypeId).eql('xpack.synthetics.alerts.tls');
      });
    });

    it('deletes (and recreates) the default rule when settings are updated', async () => {
      const newMonitor = httpMonitorJson;

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(omitMonitorKeys(newMonitor));

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule.ruleTypeId).eql('xpack.synthetics.alerts.monitorStatus');
        expect(res.body.tlsRule.ruleTypeId).eql('xpack.synthetics.alerts.tls');
      });
      const settings = await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          defaultStatusRuleEnabled: false,
          defaultTLSRuleEnabled: false,
        });

      expect(settings.body.defaultStatusRuleEnabled).eql(false);
      expect(settings.body.defaultTLSRuleEnabled).eql(false);

      await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule).eql(null);
        expect(res.body.tlsRule).eql(null);
      });

      const settings2 = await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          defaultStatusRuleEnabled: true,
          defaultTLSRuleEnabled: true,
        })
        .expect(200);

      expect(settings2.body.defaultStatusRuleEnabled).eql(true);
      expect(settings2.body.defaultTLSRuleEnabled).eql(true);

      await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule.ruleTypeId).eql('xpack.synthetics.alerts.monitorStatus');
        expect(res.body.tlsRule.ruleTypeId).eql('xpack.synthetics.alerts.tls');
      });
    });

    it('doesnt throw errors when rule has already been deleted', async () => {
      const newMonitor = httpMonitorJson;

      const { body: apiResponse } = await addMonitorAPI(newMonitor);

      expect(apiResponse).eql(omitMonitorKeys(newMonitor));

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true');

        expect(res.body.statusRule.ruleTypeId).eql('xpack.synthetics.alerts.monitorStatus');
        expect(res.body.tlsRule.ruleTypeId).eql('xpack.synthetics.alerts.tls');
      });

      const settings = await supertest
        .put(SYNTHETICS_API_URLS.DYNAMIC_SETTINGS)
        .set('kbn-xsrf', 'true')
        .send({
          defaultStatusRuleEnabled: false,
          defaultTLSRuleEnabled: false,
        });

      expect(settings.body.defaultStatusRuleEnabled).eql(false);
      expect(settings.body.defaultTLSRuleEnabled).eql(false);

      await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send();

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule).eql(null);
        expect(res.body.tlsRule).eql(null);
      });

      // call api again with the same settings, make sure its 200
      await supertest
        .put(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      await retry.tryForTime(30 * 1000, async () => {
        const res = await supertest
          .get(SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING)
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(res.body.statusRule).eql(null);
        expect(res.body.tlsRule).eql(null);
      });
    });
  });
}

const defaultAlertRules = {
  statusRule: {
    id: '574e82f0-1672-11ee-8e7d-c985c0ef6c2e',
    notifyWhen: null,
    consumer: 'uptime',
    alertTypeId: 'xpack.synthetics.alerts.monitorStatus',
    tags: ['SYNTHETICS_DEFAULT_ALERT'],
    name: 'Synthetics status internal rule',
    enabled: true,
    throttle: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: false,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    muteAll: false,
    mutedInstanceIds: [],
    revision: 0,
    running: false,
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    snoozeSchedule: [],
    updatedAt: '2023-06-29T11:44:44.488Z',
    createdAt: '2023-06-29T11:44:44.488Z',
    scheduledTaskId: '574e82f0-1672-11ee-8e7d-c985c0ef6c2e',
    executionStatus: {
      status: 'ok',
      lastExecutionDate: '2023-06-29T11:47:55.331Z',
      lastDuration: 64,
    },
    ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
    viewInAppRelativeUrl: '/app/observability/alerts/rules/574e82f0-1672-11ee-8e7d-c985c0ef6c2e',
  },
  tlsRule: {
    id: '574eaa00-1672-11ee-8e7d-c985c0ef6c2e',
    notifyWhen: null,
    consumer: 'uptime',
    alertTypeId: 'xpack.synthetics.alerts.tls',
    tags: ['SYNTHETICS_DEFAULT_ALERT'],
    name: 'Synthetics internal TLS rule',
    enabled: true,
    throttle: null,
    apiKeyOwner: 'elastic',
    apiKeyCreatedByUser: false,
    createdBy: 'elastic',
    updatedBy: 'elastic',
    muteAll: false,
    mutedInstanceIds: [],
    revision: 0,
    running: false,
    schedule: { interval: '1m' },
    actions: [],
    params: {},
    snoozeSchedule: [],
    updatedAt: '2023-06-29T11:44:44.489Z',
    createdAt: '2023-06-29T11:44:44.489Z',
    scheduledTaskId: '574eaa00-1672-11ee-8e7d-c985c0ef6c2e',
    executionStatus: {
      status: 'ok',
      lastExecutionDate: '2023-06-29T11:44:46.214Z',
      lastDuration: 193,
    },
    ruleTypeId: 'xpack.synthetics.alerts.tls',
    viewInAppRelativeUrl: '/app/observability/alerts/rules/574e82f0-1672-11ee-8e7d-c985c0ef6c2e',
  },
};
