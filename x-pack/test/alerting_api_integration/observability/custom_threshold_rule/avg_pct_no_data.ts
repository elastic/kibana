/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { NO_DATA_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import { parseSearchParams } from '@kbn/share-plugin/common/url_service';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';

import { createIndexConnector, createRule } from '../helpers/alerting_api_helper';
import { createDataView, deleteDataView } from '../helpers/data_view';
import {
  waitForAlertInIndex,
  waitForDocumentInIndex,
  waitForRuleStatus,
} from '../helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ISO_DATE_REGEX } from './constants';
import { ActionDocument, LogsExplorerLocatorParsedParams } from './typings';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');
  const retryService = getService('retry');

  describe('Custom Threshold rule - AVG - PCT - NoData', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'no-data-pattern';
    const DATA_VIEW_ID = 'data-view-id-no-data';
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      await createDataView({
        supertest,
        name: DATA_VIEW,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
        logger,
      });
    });

    after(async () => {
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'logs' } },
      });
      await deleteDataView({
        supertest,
        id: DATA_VIEW_ID,
        logger,
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
          logger,
        });

        const createdRule = await createRule({
          supertest,
          logger,
          esClient,
          tags: ['observability'],
          consumer: 'logs',
          name: 'Threshold rule',
          ruleTypeId: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
          params: {
            criteria: [
              {
                comparator: Comparator.GT,
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
        const executionStatus = await waitForRuleStatus({
          id: ruleId,
          expectedStatus: 'active',
          supertest,
          retryService,
          logger,
        });
        expect(executionStatus.status).to.be('active');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await waitForAlertInIndex({
          esClient,
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
          retryService,
          logger,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];

        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Custom threshold'
        );
        expect(resp.hits.hits[0]._source).property('kibana.alert.rule.consumer', 'logs');
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
        const resp = await waitForDocumentInIndex<ActionDocument>({
          esClient,
          indexName: ALERT_ACTION_INDEX,
          retryService,
          logger,
        });

        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `https://localhost:5601/app/observability/alerts/${alertId}`
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
