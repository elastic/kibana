/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { omit } from 'lodash';
import { cleanup, generate } from '@kbn/infra-forge';
import {
  Aggregators,
  Comparator,
} from '@kbn/observability-plugin/common/custom_threshold_rule/types';
import { FIRED_ACTIONS_ID } from '@kbn/observability-plugin/server/lib/rules/custom_threshold/constants';
import expect from '@kbn/expect';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { parseSearchParams } from '@kbn/share-plugin/common/url_service';
import { createIndexConnector, createRule } from '../helpers/alerting_api_helper';
import {
  waitForAlertInIndex,
  waitForDocumentInIndex,
  waitForRuleStatus,
} from '../helpers/alerting_wait_for_helpers';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { ActionDocument, LogExplorerLocatorParsedParams } from './typings';
import { ISO_DATE_REGEX } from './constants';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');
  const esDeleteAllIndices = getService('esDeleteAllIndices');
  const logger = getService('log');

  describe('Custom Threshold rule - AVG - PCT - FIRED', () => {
    const CUSTOM_THRESHOLD_RULE_ALERT_INDEX = '.alerts-observability.threshold.alerts-default';
    const ALERT_ACTION_INDEX = 'alert-action-threshold';
    // DATE_VIEW should match the index template:
    // x-pack/packages/kbn-infra-forge/src/data_sources/composable/template.json
    const DATE_VIEW_TITLE = 'kbn-data-forge-fake_hosts';
    const DATE_VIEW_NAME = 'ad-hoc-data-view-name';
    const DATA_VIEW_ID = 'data-view-id';
    const MOCKED_AD_HOC_DATA_VIEW = {
      id: DATA_VIEW_ID,
      title: DATE_VIEW_TITLE,
      timeFieldName: '@timestamp',
      sourceFilters: [],
      fieldFormats: {},
      runtimeFieldMap: {},
      allowNoIndex: false,
      name: DATE_VIEW_NAME,
      allowHidden: false,
    };
    let infraDataIndex: string;
    let actionId: string;
    let ruleId: string;
    let alertId: string;
    let startedAt: string;

    before(async () => {
      infraDataIndex = await generate({ esClient, lookback: 'now-15m', logger });
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
      await esDeleteAllIndices([ALERT_ACTION_INDEX, infraDataIndex]);
      await cleanup({ esClient, logger });
    });

    describe('Rule creation', () => {
      it('creates rule successfully', async () => {
        actionId = await createIndexConnector({
          supertest,
          name: 'Index Connector: Threshold API test',
          indexName: ALERT_ACTION_INDEX,
        });

        const createdRule = await createRule({
          supertest,
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
              index: MOCKED_AD_HOC_DATA_VIEW,
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
                    host: '{{context.host}}',
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
        });
        expect(executionStatus.status).to.be('active');
      });

      it('should set correct information in the alert document', async () => {
        const resp = await waitForAlertInIndex({
          esClient,
          indexName: CUSTOM_THRESHOLD_RULE_ALERT_INDEX,
          ruleId,
        });
        alertId = (resp.hits.hits[0]._source as any)['kibana.alert.uuid'];
        startedAt = (resp.hits.hits[0]._source as any)['kibana.alert.start'];

        expect(resp.hits.hits[0]._source).property(
          'kibana.alert.rule.category',
          'Custom threshold (Beta)'
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
              index: MOCKED_AD_HOC_DATA_VIEW,
              query: { query: '', language: 'kuery' },
            },
          });
      });

      it('should set correct action variables', async () => {
        const rangeFrom = moment(startedAt).subtract('5', 'minute').toISOString();
        const resp = await waitForDocumentInIndex<ActionDocument>({
          esClient,
          indexName: ALERT_ACTION_INDEX,
        });

        expect(resp.hits.hits[0]._source?.ruleType).eql('observability.rules.custom_threshold');
        expect(resp.hits.hits[0]._source?.alertDetailsUrl).eql(
          `https://localhost:5601/app/observability/alerts?_a=(kuery:%27kibana.alert.uuid:%20%22${alertId}%22%27%2CrangeFrom:%27${rangeFrom}%27%2CrangeTo:now%2Cstatus:all)`
        );
        expect(resp.hits.hits[0]._source?.reason).eql(
          `Average system.cpu.user.pct is 250%, above the threshold of 50%. (duration: 5 mins, data view: ${DATE_VIEW_NAME})`
        );
        expect(resp.hits.hits[0]._source?.value).eql('250%');

        const parsedViewInAppUrl = parseSearchParams<LogExplorerLocatorParsedParams>(
          new URL(resp.hits.hits[0]._source?.viewInAppUrl || '').search
        );

        expect(resp.hits.hits[0]._source?.viewInAppUrl).contain('LOG_EXPLORER_LOCATOR');
        expect(omit(parsedViewInAppUrl.params, 'timeRange.from')).eql({
          dataset: DATE_VIEW_TITLE,
          timeRange: { to: 'now' },
          query: { query: '', language: 'kuery' },
        });
        expect(parsedViewInAppUrl.params.timeRange.from).match(ISO_DATE_REGEX);
      });
    });
  });
}
