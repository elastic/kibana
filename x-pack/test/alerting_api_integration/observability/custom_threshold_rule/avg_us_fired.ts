/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { format } from 'url';
import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { createIndexConnector, createRule } from '../helpers/alerting_api_helper';
import { createDataView, deleteDataView } from '../helpers/data_view';
import { getSyntraceClient, generateData } from '../helpers/syntrace';
import {
  waitForAlertInIndex,
  waitForDocumentInIndex,
  waitForRuleStatus,
} from '../helpers/alerting_wait_for_helpers';
import { ActionDocument } from './typings';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const start = moment(Date.now()).subtract(10, 'minutes').valueOf();
  const end = moment(Date.now()).valueOf();
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const config = getService('config');
  const kibanaServerConfig = config.get('servers.kibana');
  const kibanaUrl = format(kibanaServerConfig);
  const supertest = getService('supertest');
  const logger = getService('log');
  const retryService = getService('retry');

  describe('Custom Threshold rule - AVG - US - FIRED', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    const DATA_VIEW = 'traces-apm*,metrics-apm*,logs-apm*';
    const DATA_VIEW_ID = 'data-view-id';
    const DATA_VIEW_NAME = 'test-data-view-name';

    let synthtraceEsClient: ApmSynthtraceEsClient;
    let actionId: string;
    let ruleId: string;
    let alertId: string;

    before(async () => {
      synthtraceEsClient = await getSyntraceClient({ esClient, kibanaUrl });
      await generateData({ synthtraceEsClient, start, end });
      await createDataView({
        supertest,
        name: DATA_VIEW_NAME,
        id: DATA_VIEW_ID,
        title: DATA_VIEW,
        logger,
      });
    });

    after(async () => {
      await supertest.delete(`/api/alerting/rule/${ruleId}`).set('kbn-xsrf', 'foo');
      await supertest.delete(`/api/actions/connector/${actionId}`).set('kbn-xsrf', 'foo');
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
      await esClient.deleteByQuery({
        index: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
        query: { term: { 'kibana.alert.rule.uuid': ruleId } },
      });
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'logs' } },
      });
      await synthtraceEsClient.clean();
      await deleteDataView({
        supertest,
        id: DATA_VIEW_ID,
        logger,
      });
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
                aggType: 'custom',
                comparator: Comparator.GT,
                threshold: [7500000],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [
                  { name: 'A', field: 'span.self_time.sum.us', aggType: Aggregators.AVERAGE },
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
          'custom_threshold.fired'
        );
        expect(resp.hits.hits[0]._source).property('tags').contain('observability');
        expect(resp.hits.hits[0]._source).property('kibana.alert.instance.id', '*');
        expect(resp.hits.hits[0]._source).property('kibana.alert.workflow_status', 'open');
        expect(resp.hits.hits[0]._source).property('event.kind', 'signal');
        expect(resp.hits.hits[0]._source).property('event.action', 'open');
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.evaluation.threshold')
          .eql([7500000]);
        expect(resp.hits.hits[0]._source)
          .property('kibana.alert.rule.parameters')
          .eql({
            criteria: [
              {
                aggType: 'custom',
                comparator: '>',
                threshold: [7500000],
                timeSize: 5,
                timeUnit: 'm',
                metrics: [{ name: 'A', field: 'span.self_time.sum.us', aggType: 'avg' }],
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: { index: 'data-view-id', query: { query: '', language: 'kuery' } },
          });
      });

      it('should set correct action parameter: ruleType', async () => {
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
          `Average span.self_time.sum.us is 10,000,000, above the threshold of 7,500,000. (duration: 5 mins, data view: ${DATA_VIEW_NAME})`
        );
        expect(resp.hits.hits[0]._source?.value).eql('10,000,000');
      });
    });
  });
}
