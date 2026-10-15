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

  describe('GROUP_BY - NO DATA', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const INDEX_NAME = 'kbn-ftr-custom-threshold-group-by-no-data';
    const DATA_VIEW_NAME = 'group-by-no-data-pattern-name';
    const DATA_VIEW_ID = 'data-view-id-group-by-no-data';
    const STALENESS_WAIT_MS = 40000;
    let ruleId: string;

    const indexDocsFor = async (hosts: string[]) => {
      await esClient.bulk({
        refresh: true,
        operations: hosts.flatMap((host) => [
          { index: { _index: INDEX_NAME } },
          { '@timestamp': new Date().toISOString(), host: { name: host } },
        ]),
      });
    };

    // Refreshes `hosts` with a fresh document every 5s until `.stop()` is awaited, so a
    // host stays "healthy" for however long a test's polling actually takes. The hosts
    // NOT passed here are what drive the "group disappears" scenarios below.
    const startKeepAlive = (hosts: string[]) => {
      let stopped = false;
      const loopPromise = (async () => {
        while (!stopped) {
          await indexDocsFor(hosts);
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

    // `_run_soon` only stamps the task to run "now" -- calling it repeatedly in quick
    // succession doesn't queue separate executions, and a second call can arrive while
    // the first is still running. Force two *confirmed* executions by polling the
    // execution event log (scoped to this rule) rather than assuming a fixed gap between
    // calls is enough, with a generous retry budget for slow/contended environments.
    const forceRuns = (numOfRuns: number) =>
      alertingApi.helpers.waitForNumRuleRuns({
        roleAuthc,
        ruleId,
        numOfRuns,
        esClient,
        testStart: new Date(),
        retryOptions: { retryCount: 10, retryDelay: 3000 },
      });

    const getAlertsForRule = async () => {
      const response = await esClient.search({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
        size: 50,
      });
      return response.hits.hits.map((hit) => hit._source as Record<string, unknown>);
    };

    const expectNoUngroupedAlert = async () => {
      const alerts = await getAlertsForRule();
      expect(alerts.some((alert) => alert['kibana.alert.instance.id'] === '*')).to.be(false);
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
          },
        },
      });
      await indexDocsFor(['host-a', 'host-b']);

      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: INDEX_NAME,
        roleAuthc,
      });
    });

    after(async () => {
      // Rule-scoped teardown only runs when the rule was actually created; otherwise a
      // failure in the creation test would bury itself under `undefined`-keyed errors.
      if (ruleId) {
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

    describe('Rule creation and no-data lifecycle', () => {
      it('creates a grouped, count-based, no-data-aware rule', async () => {
        const createdRule = await alertingApi.createRule({
          roleAuthc,
          tags: ['observability'],
          consumer: 'logs',
          name: 'Group by no-data rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          // Serverless enforces `xpack.alerting.rules.minimumScheduleInterval` (1m) and
          // rejects anything shorter, so this is the floor available to a deployment-agnostic
          // suite. Executions are driven explicitly via `forceRuns` rather than by this
          // interval, so the tests below never wait on a scheduled run.
          schedule: { interval: '1m' },
          params: {
            // A short lookback window keeps the disappearance waits below to a few tens of
            // seconds: the in-query lastPeriod/currentPeriod comparison depends on real time
            // elapsing between rule executions, not just on document timestamps.
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
              query: { query: '', language: 'kuery' },
              index: DATA_VIEW_ID,
            },
          },
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('does not alert while every group is reporting data', async () => {
        // Refresh both hosts here rather than relying on the `before` hook's seed docs
        // staying fresh -- this keeps the test's freshness assumption self-contained
        // regardless of how much time setup took.
        await indexDocsFor(['host-a', 'host-b']);
        await forceRuns(2);
        await alertingApi.waitForRuleStatus({ roleAuthc, ruleId, expectedStatus: 'ok' });

        const alerts = await getAlertsForRule();
        expect(alerts).to.eql([]);
      });

      it('alerts for the disappeared group only when one group stops reporting, never the ungrouped "*" instance', async function () {
        // Two forceRuns(2) calls, each tolerant of slow/contended executions, can exceed
        // the framework's 360s default in the worst case.
        this.timeout(420000);

        // host-b stops entirely. host-a is kept refreshed concurrently for as long as
        // this test runs, so its freshness never depends on how long the assertions take.
        await indexDocsFor(['host-a', 'host-b']);
        const hostAKeepAlive = startKeepAlive(['host-a']);
        try {
          // Establish lastPeriodEnd while both hosts are still current, then let host-b
          // age out before forcing the run that should notice it.
          await forceRuns(2);
          await new Promise((resolve) => setTimeout(resolve, STALENESS_WAIT_MS));
          await forceRuns(2);

          const resp = await alertingApi.waitForAlertInIndex({
            indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
            ruleId,
            filters: [{ term: { 'kibana.alert.instance.id': 'host-b' } }],
          });
          expect(resp.hits.hits[0]._source).property('kibana.alert.status', 'active');
          expect(resp.hits.hits[0]._source).property(
            'kibana.alert.reason',
            'Document count reported no data in the last 20s for host-b'
          );

          const hostAAlerts = (await getAlertsForRule()).filter(
            (alert) => alert['kibana.alert.instance.id'] === 'host-a'
          );
          expect(hostAAlerts).to.eql([]);

          await expectNoUngroupedAlert();
        } finally {
          await hostAKeepAlive.stop();
        }
      });

      it('recovers the disappeared group when it resumes, without emitting "*"', async function () {
        this.timeout(420000);

        const hostBKeepAlive = startKeepAlive(['host-b']);
        try {
          await forceRuns(2);

          const resp = await alertingApi.waitForAlertInIndex({
            indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
            ruleId,
            filters: [
              { term: { 'kibana.alert.instance.id': 'host-b' } },
              { term: { 'kibana.alert.status': 'recovered' } },
            ],
          });
          expect(resp.hits.hits.length).to.be.greaterThan(0);

          await expectNoUngroupedAlert();
        } finally {
          await hostBKeepAlive.stop();
        }
      });

      it('alerts per-group for every group when they all stop reporting simultaneously, never collapsing into "*"', async function () {
        // Two forceRuns(2) calls, each tolerant of slow/contended executions, can exceed
        // the framework's 360s default in the worst case.
        this.timeout(420000);

        // Anchor the freshness point explicitly, then let both hosts age out of the
        // lookback window together without re-indexing either one -- a total outage
        // must still resolve to one alert per group, never a single ungrouped alert.
        await indexDocsFor(['host-a', 'host-b']);
        await forceRuns(2);
        await new Promise((resolve) => setTimeout(resolve, STALENESS_WAIT_MS));
        await forceRuns(2);

        const respA = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
          filters: [
            { term: { 'kibana.alert.instance.id': 'host-a' } },
            { term: { 'kibana.alert.status': 'active' } },
          ],
        });
        expect(respA.hits.hits.length).to.be.greaterThan(0);

        const respB = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
          filters: [
            { term: { 'kibana.alert.instance.id': 'host-b' } },
            { term: { 'kibana.alert.status': 'active' } },
          ],
        });
        expect(respB.hits.hits.length).to.be.greaterThan(0);

        await expectNoUngroupedAlert();
      });

      it('recovers every group when they all resume, without emitting "*"', async function () {
        this.timeout(420000);

        const bothKeepAlive = startKeepAlive(['host-a', 'host-b']);
        try {
          await forceRuns(2);
          await alertingApi.waitForRuleStatus({ roleAuthc, ruleId, expectedStatus: 'ok' });

          await expectNoUngroupedAlert();
        } finally {
          await bothKeepAlive.stop();
        }
      });
    });
  });
}
