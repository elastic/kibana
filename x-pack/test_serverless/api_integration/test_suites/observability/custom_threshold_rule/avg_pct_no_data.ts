/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators } from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { NO_DATA_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { parseSearchParams } from '@kbn/share-plugin/common/url_service';
import { omit } from 'lodash';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { ISO_DATE_REGEX } from './constants';
import { ActionDocument, LogsExplorerLocatorParsedParams } from './typings';
import { RoleCredentials } from '../../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const alertingApi = getService('alertingApi');
  const dataViewApi = getService('dataViewApi');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const svlUserManager = getService('svlUserManager');
  let roleAuthc: RoleCredentials;

  describe('Custom Threshold rule - AVG - PCT - NoData', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW_NAME = 'no-data-pattern-name';
    const DATA_VIEW_ID = 'data-view-id-no-data';
    const DATA_VIEW_TITLE = 'no-data-pattern-title';
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
      await dataViewApi.create({
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: DATA_VIEW_TITLE,
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
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await svlUserManager.invalidateApiKeyForRole(roleAuthc);
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
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'system.cpu.user.pct', aggType: Aggregators.AVERAGE },
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
          },
          actions: [
            {
              group: NO_DATA_ACTIONS_ID,
              id: actionId,
              params: {
                documents: [
                  {
                    ruleType: '{{rule.type}}',
                    alertDetailsUrl: '{{context.alertDetailsUrl}}',
                    reason: '{{context.reason}}',
                    value: '{{context.value}}',
                    viewInAppUrl: '{{context.viewInAppUrl}}',
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
          'custom_threshold.nodata'
        );
        expect(resp.hits.hits[0]._source).property('tags').contain('observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', '*');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');

        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                comparator: '>',
                threshold: [0.5],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [{ name: 'A', field: 'system.cpu.user.pct', aggType: 'avg' }],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              index: 'data-view-id-no-data',
              query: { query: '', language: 'kuery' },
            },
          });
      });

      it('should set correct action variables', async () => {
        const resp = await alertingApi.waitForDocumentInIndex<ActionDocument>({
          indexName: ALERT_ACTION_INDEX,
          docCountTarget: 1,
        });

        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `http://localhost:5620/app/observability/alerts/${alertId}`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          'Average system.cpu.user.pct reported no data in the last 5m'
        );
        expect(resp.hits.hits[0]._source?.value).eql('[NO DATA]');

        const parsedViewInAppUrl = parseSearchParams<LogsExplorerLocatorParsedParams>(
          new URL(resp.hits.hits[0]._source?.viewInAppUrl || '').search
        );

        expect(resp.hits.hits[0]._source?.viewInAppUrl).contain('LOGS_EXPLORER_LOCATOR');
        expect(omit(parsedViewInAppUrl.params, 'timeRange.from')).eql({
          dataset: DATA_VIEW_ID,
          timeRange: { to: 'now' },
          query: { query: '', language: 'kuery' },
          filters: [],
        });
        expect(parsedViewInAppUrl.params.timeRange.from).match(ISO_DATE_REGEX);
      });
    });
  });
}
