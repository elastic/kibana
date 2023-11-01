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

import { kbnTestConfig } from '@kbn/test';
import moment from 'moment';
import { cleanup, generate } from '@kbn/infra-forge';
import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  let alertId: string;
  let startedAt: string;

  describe('Custom Threshold rule - GROUP_BY - FIRED', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    // DATE_VIEW should match the index template:
    // x-pack/packages/kbn-infra-forge/src/data_sources/composable/template.json
    const DATE_VIEW = 'kbn-data-forge-fake_hosts';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW_ID = 'data-view-id';
    let infraDataIndex: string;
    let actionId: string;
    let ruleId: string;

    before(async () => {
      infraDataIndex = await generate({ esClient, lookback: 'now-15m', logger });
      await dataViewApi.create({
        name: DATE_VIEW,
        id: DATA_VIEW_ID,
        title: DATE_VIEW,
      });
    });

    after(async () => {
      await supertest
        .delete(`/api/alerting/rule/${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      await supertest
        .delete(`/api/actions/connector/${actionId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
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
      await esDeleteAllIndices([ALERT_ACTION_INDEX, infraDataIndex]);
      await cleanup({ esClient, logger });
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await alertingApi.createIndexConnector({
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await alertingApi.createRule({
          tags: ['observability'],
          consumer: 'observability',
          name: 'Threshold rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          params: {
            criteria: [
              {
                aggType: Aggregators.CUSTOM,
                comparator: Comparator.GT_OR_EQ,
                threshold: [0.2],
                timeSize: 1,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'system.cpu.total.norm.pct', aggType: Aggregators.AVERAGE },
                ],
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
            groupBy: ['host.name'],
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
                    host: '{{context.host}}',
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
          ruleId,
          expectedStatus: 'active',
        });
        expect(executionStatus).to.be('active');
      });

      it('should find the created rule with correct information about the consumer', async () => {
        const match = await alertingApi.findRule(ruleId);
        expect(match).not.to.be(undefined);
        expect(match.consumer).to.be('observability');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await alertingApi.waitForAlertInIndex({
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];
        startedAt = (resp.hits.hits[0]._source as any)['kibana.alert.start'];

        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Custom threshold (Technical Preview)'
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
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', 'host-0');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');

        expect(resp.hits.hits[0]._source).property('host.name', 'host-0');
        expect(resp.hits.hits[0]._source)
          .property('host.mac')
          .eql(['00-00-5E-00-53-23', '00-00-5E-00-53-24']);
        expect(resp.hits.hits[0]._source).property('container.id', 'container-0');
        expect(resp.hits.hits[0]._source).property('container.name', 'container-name');
        expect(resp.hits.hits[0]._source).not.property('container.cpu');

        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                aggType: 'custom',
                comparator: '>=',
                threshold: [0.2],
                timeSize: 1,
                timeUnit: 'm',
                metrics: [{ name: 'A', field: 'system.cpu.total.norm.pct', aggType: 'avg' }],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: { index: 'data-view-id', query: { query: '', language: 'kuery' } },
            groupBy: ['host.name'],
          });
      });

      it('should set correct action variables', async () => {
        const rangeFrom = moment(startedAt).subtract('5', 'minute').toISOString();
        const resp = await alertingApi.waitForDocumentInIndex<{
          ruleType: string;
          alertDetailsUrl: string;
          reason: string;
          value: string;
          host: string;
        }>({
          indexName: ALERT_ACTION_INDEX,
        });
        const { protocol, hostname, port } = kbnTestConfig.getUrlParts();

        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          // Added the S to protocol.getUrlParts as not returning the correct value.
          `${protocol}s://${hostname}:${port}/app/observability/alerts?_a=(kuery:%27kibana.alert.uuid:%20%22${alertId}%22%27%2CrangeFrom:%27${rangeFrom}%27%2CrangeTo:now%2Cstatus:all)`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          `Average system.cpu.total.norm.pct is 80%, above the threshold of 20%. (duration: 1 min, data view: ${DATE_VIEW}, group: host-0)`
        );
        expect(resp.hits.hits[0]._source?.value).eql('80%');
        expect(resp.hits.hits[0]._source?.host).eql(
          '{"name":"host-0","mac":["00-00-5E-00-53-23","00-00-5E-00-53-24"]}'
        );
      });
    });
  });
}
