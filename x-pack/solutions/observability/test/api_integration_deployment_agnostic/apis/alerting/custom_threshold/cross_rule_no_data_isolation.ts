/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import type { InternalRequestHeader, RoleCredentials } from '@kbn/ftr-common-functional-services';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const esClient = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('CROSS-RULE NO-DATA ISOLATION', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const INDEX_NAME = 'kbn-ftr-custom-threshold-cross-rule-isolation';
    const DATA_VIEW_NAME = 'cross-rule-isolation-pattern-name';
    const DATA_VIEW_ID = 'data-view-id-cross-rule-isolation';
    const STALENESS_WAIT_MS = 40000;
    const ruleIds: string[] = [];

    const indexDocsFor = async (docs: Array<{ host: string; environment: string }>) => {
      await esClient.bulk({
        refresh: true,
        operations: docs.flatMap((doc) => [
          { index: { _index: INDEX_NAME } },
          {
            '@timestamp': new Date().toISOString(),
            host: { name: doc.host },
            environment: doc.environment,
          },
        ]),
      });
    };

    const allDocs = [
      { host: 'prod-host-1', environment: 'production' },
      { host: 'prod-host-2', environment: 'production' },
      { host: 'staging-host-1', environment: 'staging' },
      { host: 'staging-host-2', environment: 'staging' },
    ];

    const startKeepAlive = (docs: Array<{ host: string; environment: string }>) => {
      let stopped = false;
      const loopPromise = (async () => {
        while (!stopped) {
          await indexDocsFor(docs);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      })();
      return {
        stop: async () => {
          stopped = true;
          await loopPromise;
        },
      };
    };

    const forceRuns = (ruleId: string, numOfRuns: number) =>
      alertingApi.helpers.waitForNumRuleRuns({
        roleAuthc,
        ruleId,
        numOfRuns,
        esClient,
        testStart: new Date(),
        retryOptions: { retryCount: 20, retryDelay: 5000 },
      });

    const getAlertsForRule = async (ruleId: string) => {
      const response = await esClient.search({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        size: 50,
      });
      return response.hits.hits.map((hit) => hit._source as Record<string, unknown>);
    };

    const cleanUpAlerts = async () => {
      try {
        for (const ruleId of ruleIds) {
          await esClient.deleteByQuery({
            index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
            query: { term: { 'kibana.alert.rule.uuid': ruleId } },
            conflicts: 'proceed',
            refresh: true,
          });
        }
      } catch (e) {
        // Alert index may not exist yet if no rule has executed
      }
    };

    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = samlAuth.getInternalRequestHeader();

      await supertestWithoutAuth
        .post('/internal/alerting/rules/settings/_flapping')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled: false,
          look_back_window: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
          status_change_threshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
        })
        .expect(200);

      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            host: { properties: { name: { type: 'keyword' } } },
            environment: { type: 'keyword' },
          },
        },
      });
      await indexDocsFor(allDocs);

      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: INDEX_NAME,
        roleAuthc,
      });
    });

    after(async () => {
      for (const ruleId of ruleIds) {
        await supertestWithoutAuth
          .delete(`/api/alerting/rule/${ruleId}`)
          .set(roleAuthc.apiKeyHeader)
          .set(internalReqHeader);
        await esClient.deleteByQuery({
          index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
          conflicts: 'proceed',
        });
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          query: { term: { 'rule.id': ruleId } },
          conflicts: 'proceed',
        });
      }
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        roleAuthc,
      });
      await esDeleteAllIndices([INDEX_NAME]);
      await supertestWithoutAuth
        .post('/internal/alerting/rules/settings/_flapping')
        .set(internalReqHeader)
        .set(roleAuthc.apiKeyHeader)
        .send({
          enabled: DEFAULT_FLAPPING_SETTINGS.enabled,
          look_back_window: DEFAULT_FLAPPING_SETTINGS.lookBackWindow,
          status_change_threshold: DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold,
        })
        .expect(200);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    const createRule = async (name: string, environmentFilter: string) => {
      const createdRule = await alertingApi.createRule({
        roleAuthc,
        tags: ['observability'],
        consumer: 'logs',
        name,
        ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
        schedule: { interval: '1m' },
        params: {
          criteria: [
            {
              comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
              threshold: [0],
              timeSize: 20,
              timeUnit: 's',
              metrics: [{ name: 'A', aggType: Aggregators.COUNT }],
            },
          ],
          groupBy: ['host.name'],
          noDataBehavior: 'alertOnNoData',
          alertOnNoData: true,
          alertOnGroupDisappear: true,
          searchConfiguration: {
            query: { query: `environment: "${environmentFilter}"`, language: 'kuery' },
            index: DATA_VIEW_ID,
          },
        },
      });
      ruleIds.push(createdRule.id);
      return createdRule.id;
    };

    describe('Two rules with environment-scoped filters', () => {
      let prodRuleId: string;
      let stagingRuleId: string;

      afterEach(async () => {
        await cleanUpAlerts();
      });

      it('creates a production rule and a staging rule', async () => {
        prodRuleId = await createRule('Production no-data rule', 'production');
        stagingRuleId = await createRule('Staging no-data rule', 'staging');
        expect(prodRuleId).not.to.be(undefined);
        expect(stagingRuleId).not.to.be(undefined);
      });

      it('does not alert on either rule while all hosts report data', async function () {
        this.timeout(420000);

        await indexDocsFor(allDocs);
        const keepAlive = startKeepAlive(allDocs);
        try {
          await forceRuns(prodRuleId, 2);
          await alertingApi.waitForRuleStatus({
            roleAuthc,
            ruleId: prodRuleId,
            expectedStatus: 'ok',
          });

          await forceRuns(stagingRuleId, 2);
          await alertingApi.waitForRuleStatus({
            roleAuthc,
            ruleId: stagingRuleId,
            expectedStatus: 'ok',
          });

          const prodAlerts = await getAlertsForRule(prodRuleId);
          expect(prodAlerts).to.eql([]);

          const stagingAlerts = await getAlertsForRule(stagingRuleId);
          expect(stagingAlerts).to.eql([]);
        } finally {
          await keepAlive.stop();
        }
      });

      it('does not leak no-data alerts from the production rule onto the staging rule when a production host disappears', async function () {
        this.timeout(420000);

        const stagingDocs = allDocs.filter((d) => d.environment === 'staging');
        const healthyProdDoc = allDocs.filter(
          (d) => d.environment === 'production' && d.host === 'prod-host-1'
        );

        await indexDocsFor(allDocs);
        const keepAlive = startKeepAlive([...healthyProdDoc, ...stagingDocs]);
        try {
          await forceRuns(prodRuleId, 2);
          await forceRuns(stagingRuleId, 2);

          await new Promise((resolve) => setTimeout(resolve, STALENESS_WAIT_MS));

          await forceRuns(prodRuleId, 2);
          await forceRuns(stagingRuleId, 2);

          // Affected rule: wait for the alert, then verify exactly 1 total
          await alertingApi.waitForAlertInIndex({
            indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
            ruleId: prodRuleId,
            filters: [{ term: { 'kibana.alert.instance.id': 'prod-host-2' } }],
          });
          const prodAlerts = await getAlertsForRule(prodRuleId);
          expect(prodAlerts.length).to.be(1);
          expect(prodAlerts[0]).property('kibana.alert.instance.id', 'prod-host-2');
          expect(prodAlerts[0]).property('kibana.alert.status', 'active');
          expect(prodAlerts[0]).property(
            'kibana.alert.reason',
            'Document count reported no data in the last 20s for prod-host-2'
          );

          // Unaffected rule: confirm it executed and settled, then assert 0 alerts
          await alertingApi.waitForRuleStatus({
            roleAuthc,
            ruleId: stagingRuleId,
            expectedStatus: 'ok',
          });
          const stagingAlerts = await getAlertsForRule(stagingRuleId);
          expect(stagingAlerts.length).to.be(0);
        } finally {
          await keepAlive.stop();
        }
      });

      it('does not leak no-data alerts from the staging rule onto the production rule when a staging host disappears', async function () {
        this.timeout(420000);

        const prodDocs = allDocs.filter((d) => d.environment === 'production');
        const healthyStagingDoc = allDocs.filter(
          (d) => d.environment === 'staging' && d.host === 'staging-host-1'
        );

        await indexDocsFor(allDocs);
        const keepAlive = startKeepAlive([...prodDocs, ...healthyStagingDoc]);
        try {
          await forceRuns(prodRuleId, 2);
          await forceRuns(stagingRuleId, 2);

          await new Promise((resolve) => setTimeout(resolve, STALENESS_WAIT_MS));

          await forceRuns(prodRuleId, 2);
          await forceRuns(stagingRuleId, 2);

          // Affected rule: wait for the alert, then verify exactly 1 total
          await alertingApi.waitForAlertInIndex({
            indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
            ruleId: stagingRuleId,
            filters: [{ term: { 'kibana.alert.instance.id': 'staging-host-2' } }],
          });
          const stagingAlerts = await getAlertsForRule(stagingRuleId);
          expect(stagingAlerts.length).to.be(1);
          expect(stagingAlerts[0]).property('kibana.alert.instance.id', 'staging-host-2');
          expect(stagingAlerts[0]).property('kibana.alert.status', 'active');
          expect(stagingAlerts[0]).property(
            'kibana.alert.reason',
            'Document count reported no data in the last 20s for staging-host-2'
          );

          // Unaffected rule: confirm it executed and settled, then assert 0 alerts
          await alertingApi.waitForRuleStatus({
            roleAuthc,
            ruleId: prodRuleId,
            expectedStatus: 'ok',
          });
          const prodAlerts = await getAlertsForRule(prodRuleId);
          expect(prodAlerts.length).to.be(0);
        } finally {
          await keepAlive.stop();
        }
      });
    });
  });
}
