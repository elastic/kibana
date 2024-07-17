/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, Dataset, generate, PartialConfig } from '@kbn/data-forge';
import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { FIRED_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { kbnTestConfig } from '@kbn/test';
import type { InternalRequestHeader, RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ActionDocument } from './typings';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const svlUserManager = getService('svlUserManager');
  const svlCommonApi = getService('svlCommonApi');
  let roleAuthc: RoleCredentials;
  let internalReqHeader: InternalRequestHeader;

  describe('Custom Threshold rule - CUSTOM_EQ - AVG - BYTES - FIRED', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const DATA_VIEW = 'kbn-data-forge-fake_hosts.fake_hosts-*';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW_ID = 'data-view-id';
    let dataForgeConfig: PartialConfig;
    let dataForgeIndices: string[];
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      dataForgeConfig = {
        schedule: [
          {
            template: 'good',
            start: 'now-15m',
            end: 'now+5m',
            metrics: [
              { name: 'system.cpu.user.pct', method: 'linear', start: 2.5, end: 2.5 },
              { name: 'system.cpu.total.pct', method: 'linear', start: 0.5, end: 0.5 },
              { name: 'system.cpu.total.norm.pct', method: 'linear', start: 0.8, end: 0.8 },
            ],
          },
        ],
        indexing: {
          dataset: 'fake_hosts' as Dataset,
          eventsPerCycle: 1,
          interval: 10000,
          alignEventsToInterval: true,
        },
      };
      dataForgeIndices = await generate({ client: esClient, config: dataForgeConfig, logger });
      await alertingApi.waitForDocumentInIndex({ indexName: DATA_VIEW, docCountTarget: 360 });
      await dataViewApi.create({
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
      });
    });

    after(async () => {
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set(internalReqHeader);
      await supertest.delete(`/api/actions/connector/${actionId}`).set(internalReqHeader);
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
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX, ...dataForgeIndices]);
      await cleanup({ client: esClient, config: dataForgeConfig, logger });
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          roleAuthc,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          roleAuthc,
          tags: ['observability'],
          consumer: 'observability',
          name: 'Threshold rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          params: {
            criteria: [
              {
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [0.9],
                timeSize: 1,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'system.network.in.bytes', aggType: Aggregators.AVERAGE },
                  { name: 'B', field: 'system.network.out.bytes', aggType: Aggregators.AVERAGE },
                ],
                equation: '((A + A) / (B + B))',
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: DATA_VIEW_ID,
            },
          },
          actions: [
            {
              group: FIRED_ACTIONS_ID,
              id: actionId,
              params: {
                documents: [
                  {
                    ruleType: '{{rule.type}}',
                    alertDetailsUrl: '{{context.alertDetailsUrl}}',
                    reason: '{{context.reason}}',
                    value: '{{context.value}}',
                  },
                ],
              },
              frequency: {
                notify_when: 'onActionGroupChange',
                throttle: null,
                summary: false,
              },
            },
          ],
        });
        ruleId = createdRule.id;
        expect(ruleId).not.to.be(undefined);
      });

      it('should be active', async () => {
        const executionStatus = await alertingApi.waitForRuleStatus({
          roleAuthc,
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findRule(roleAuthc, ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be('observability');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];

        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Custom threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.consumer', 'observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.name', 'Threshold rule');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.producer', 'observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.revision', 0);
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.rule_type_id',
          'observability.rules.custom_threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.uuid', ruleId);
        expect(resp.hits.hits[0]._source).property('kibana.space_ids').contain('default');
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.tags')
          .contain('observability');
        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.action_group',
          'custom_threshold.fired'
        );
        expect(resp.hits.hits[0]._source).property('tags').contain('observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', '*');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');
        expect(resp.hits.hits[0]._source).property('kibana.alert.evaluation.threshold').eql([0.9]);
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [0.9],
                timeSize: 1,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'system.network.in.bytes', aggType: Aggregators.AVERAGE },
                  { name: 'B', field: 'system.network.out.bytes', aggType: Aggregators.AVERAGE },
                ],
                equation: '((A + A) / (B + B))',
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: { index: 'data-view-id', query: { query: '', language: 'kuery' } },
          });
      });

      it('should set correct action variables', async () => {
        const resp = await alertingApi.waitForDocumentInIndex<ActionDocument>({
          indexName: ALERT_ACTION_INDEX,
          docCountTarget: 1,
        });

        const { protocol, hostname, port } = kbnTestConfig.getUrlParts();
        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `${protocol}://${hostname}${port ? `:${port}` : ''}/app/observability/alerts/${alertId}`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          `Custom equation is 1 B, above the threshold of 0.9 B. (duration: 1 min, data view: ${DATA_VIEW})`
        );
        expect(resp.hits.hits[0]._source?.value).eql('1 B');
      });
    });
  });
}
