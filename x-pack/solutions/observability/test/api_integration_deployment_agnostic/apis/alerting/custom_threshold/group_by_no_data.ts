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

    // Keeps `hosts` reporting fresh documents every 10s for `durationMs`, so any host NOT
    // in the list naturally ages out of the rule's 1-minute lookback window as real time
    // passes -- this is what drives the "group disappears" scenarios below.
    const keepIndexingFor = async (hosts: string[], durationMs: number) => {
      const intervalMs = 10000;
      const iterations = Math.ceil(durationMs / intervalMs);
      for (let i = 0; i < iterations; i++) {
        await indexDocsFor(hosts);
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    };

    const runRuleTwice = async () => {
      await alertingApi.runRule(roleAuthc, ruleId);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await alertingApi.runRule(roleAuthc, ruleId);
    };

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
      await dataViewApi.delete({
        id: DATA_VIEW_ID,
        roleAuthc,
      });
      await esDeleteAllIndices([INDEX_NAME]);
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
          schedule: { interval: '10s' },
          params: {
            criteria: [
              {
                comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
                threshold: [0],
                timeSize: 1,
                timeUnit: 'm',
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
        await runRuleTwice();
        await alertingApi.waitForRuleStatus({ roleAuthc, ruleId, expectedStatus: 'ok' });

        const alerts = await getAlertsForRule();
        expect(alerts).to.eql([]);
      });

      it('alerts for the disappeared group only when one group stops reporting, never the ungrouped "*" instance', async function () {
        this.timeout(180000);

        // host-b stops; host-a keeps reporting so its docs stay inside the 1m lookback
        // window while host-b's age out of it.
        await keepIndexingFor(['host-a'], 80000);
        await runRuleTwice();

        const resp = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
          filters: [{ term: { 'kibana.alert.instance.id': 'host-b' } }],
        });
        expect(resp.hits.hits[0]._source).property('kibana.alert.status', 'active');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.reason',
          'Document count reported no data in the last 1m for host-b'
        );

        await expectNoUngroupedAlert();
      });

      it('recovers the disappeared group when it resumes, without emitting "*"', async () => {
        await indexDocsFor(['host-b']);
        await runRuleTwice();

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
      });

      it('alerts per-group for every group when they all stop reporting simultaneously, never collapsing into "*"', async function () {
        this.timeout(180000);

        // Neither host is re-indexed here: both age out of the 1m window together. This
        // is the total-outage shape the removed 0-bucket guard used to convert into a
        // false '*' alert -- it must still resolve to one alert per group.
        await new Promise((resolve) => setTimeout(resolve, 80000));
        await runRuleTwice();

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

      it('recovers every group when they all resume, without emitting "*"', async () => {
        await indexDocsFor(['host-a', 'host-b']);
        await runRuleTwice();
        await alertingApi.waitForRuleStatus({ roleAuthc, ruleId, expectedStatus: 'ok' });

        await expectNoUngroupedAlert();
      });
    });
  });
}
