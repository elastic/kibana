/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { padStart } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createIndexConnector, createEsQueryRule, runRule } from './helpers/alerting_api_helper';
import {
  createIndex,
  getDocumentsInIndex,
  waitForDocumentInIndex,
} from './helpers/alerting_wait_for_helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('Alerting summary rules', () => {
    const RULE_TYPE_ID = '.es-query';
    const ALERT_ACTION_INDEX = 'alert-action-es-query';
    let actionId: string;
    let ruleId: string;

    afterEach(async () => {
      await supertest
        .delete(`/api/actions/connector/${actionId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      await supertest
        .delete(`/api/alerting/rule/${ruleId}`)
        .set('kbn-xsrf', 'foo')
        .set('x-elastic-internal-origin', 'foo');
      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        query: { term: { 'kibana.alert.rule.consumer': 'alerts' } },
      });
      await esDeleteAllIndices([ALERT_ACTION_INDEX]);
    });

    it('should schedule actions for summary of alerts per rule run', async () => {
      actionId = await createIndexConnector({
        supertest,
        name: 'Index Connector: Alerting API test',
        indexName: ALERT_ACTION_INDEX,
      });
      expect(actionId).not.to.be(undefined);

      const createdRule = await createEsQueryRule({
        supertest,
        consumer: 'alerts',
        name: 'always fire',
        ruleTypeId: RULE_TYPE_ID,
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
        actions: [
          {
            group: 'query matched',
            id: actionId,
            params: {
              documents: [
                {
                  all: '{{alerts.all.count}}',
                  new: '{{alerts.new.count}}',
                  newIds: '[{{#alerts.new.data}}{{kibana.alert.instance.id}},{{/alerts.new.data}}]',
                  ongoing: '{{alerts.ongoing.count}}',
                  ongoingIds:
                    '[{{#alerts.ongoing.data}}{{kibana.alert.instance.id}},{{/alerts.ongoing.data}}]',
                  recovered: '{{alerts.recovered.count}}',
                  recoveredIds:
                    '[{{#alerts.recovered.data}}{{kibana.alert.instance.id}},{{/alerts.recovered.data}}]',
                },
              ],
            },
            frequency: {
              notify_when: 'onActiveAlert',
              throttle: null,
              summary: true,
            },
            alerts_filter: {
              query: { kql: 'kibana.alert.rule.name:always fire', filters: [] },
            },
          },
        ],
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);

      const resp = await waitForDocumentInIndex({
        esClient,
        indexName: ALERT_ACTION_INDEX,
      });
      expect(resp.hits.hits.length).to.be(1);

      const document = resp.hits.hits[0];
      expect(document._source).to.eql({
        all: '1',
        new: '1',
        newIds: '[query matched,]',
        ongoing: '0',
        ongoingIds: '[]',
        recovered: '0',
        recoveredIds: '[]',
      });
    });

    it('should filter alerts by kql', async () => {
      actionId = await createIndexConnector({
        supertest,
        name: 'Index Connector: Alerting API test',
        indexName: ALERT_ACTION_INDEX,
      });
      expect(actionId).not.to.be(undefined);

      const createdRule = await createEsQueryRule({
        supertest,
        consumer: 'alerts',
        name: 'always fire',
        ruleTypeId: RULE_TYPE_ID,
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
        actions: [
          {
            group: 'query matched',
            id: actionId,
            params: {
              documents: [
                {
                  all: '{{alerts.all.count}}',
                  new: '{{alerts.new.count}}',
                  newIds: '[{{#alerts.new.data}}{{kibana.alert.instance.id}},{{/alerts.new.data}}]',
                  ongoing: '{{alerts.ongoing.count}}',
                  ongoingIds:
                    '[{{#alerts.ongoing.data}}{{kibana.alert.instance.id}},{{/alerts.ongoing.data}}]',
                  recovered: '{{alerts.recovered.count}}',
                  recoveredIds:
                    '[{{#alerts.recovered.data}}{{kibana.alert.instance.id}},{{/alerts.recovered.data}}]',
                },
              ],
            },
            frequency: {
              notify_when: 'onActiveAlert',
              throttle: null,
              summary: true,
            },
            alerts_filter: {
              query: { kql: 'kibana.alert.instance.id:query matched', filters: [] },
            },
          },
        ],
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);

      const resp = await waitForDocumentInIndex({
        esClient,
        indexName: ALERT_ACTION_INDEX,
      });
      expect(resp.hits.hits.length).to.be(1);

      const document = resp.hits.hits[0];
      expect(document._source).to.eql({
        all: '1',
        new: '1',
        newIds: '[query matched,]',
        ongoing: '0',
        ongoingIds: '[]',
        recovered: '0',
        recoveredIds: '[]',
      });
    });

    it('should filter alerts by hours', async () => {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const hour = padStart(now.getUTCHours().toString(), 2, '0');
      const minutes = padStart(now.getUTCMinutes().toString(), 2, '0');

      const start = `${hour}:${minutes}`;
      const end = `${hour}:${minutes}`;

      await createIndex({ esClient, indexName: ALERT_ACTION_INDEX });

      actionId = await createIndexConnector({
        supertest,
        name: 'Index Connector: Alerting API test',
        indexName: ALERT_ACTION_INDEX,
      });
      expect(actionId).not.to.be(undefined);

      const createdRule = await createEsQueryRule({
        supertest,
        consumer: 'alerts',
        name: 'always fire',
        ruleTypeId: RULE_TYPE_ID,
        schedule: { interval: '1m' },
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
        actions: [
          {
            group: 'query matched',
            id: actionId,
            params: {
              documents: [
                {
                  all: '{{alerts.all.count}}',
                  new: '{{alerts.new.count}}',
                  newIds: '[{{#alerts.new.data}}{{kibana.alert.instance.id}},{{/alerts.new.data}}]',
                  ongoing: '{{alerts.ongoing.count}}',
                  ongoingIds:
                    '[{{#alerts.ongoing.data}}{{kibana.alert.instance.id}},{{/alerts.ongoing.data}}]',
                  recovered: '{{alerts.recovered.count}}',
                  recoveredIds:
                    '[{{#alerts.recovered.data}}{{kibana.alert.instance.id}},{{/alerts.recovered.data}}]',
                },
              ],
            },
            frequency: {
              notify_when: 'onActiveAlert',
              throttle: null,
              summary: true,
            },
            alerts_filter: {
              timeframe: {
                days: [1, 2, 3, 4, 5, 6, 7],
                timezone: 'UTC',
                hours: { start, end },
              },
            },
          },
        ],
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);

      // Should not have executed any action
      const resp = await getDocumentsInIndex({
        esClient,
        indexName: ALERT_ACTION_INDEX,
      });
      expect(resp.hits.hits.length).to.be(0);
    });

    it('should schedule actions for summary of alerts on a custom interval', async () => {
      actionId = await createIndexConnector({
        supertest,
        name: 'Index Connector: Alerting API test',
        indexName: ALERT_ACTION_INDEX,
      });
      expect(actionId).not.to.be(undefined);

      const createdRule = await createEsQueryRule({
        supertest,
        consumer: 'alerts',
        name: 'always fire',
        ruleTypeId: RULE_TYPE_ID,
        schedule: { interval: '1m' },
        params: {
          size: 100,
          thresholdComparator: '>',
          threshold: [-1],
          index: ['alert-test-data'],
          timeField: 'date',
          esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
        actions: [
          {
            group: 'query matched',
            id: actionId,
            params: {
              documents: [
                {
                  all: '{{alerts.all.count}}',
                  new: '{{alerts.new.count}}',
                  newIds: '[{{#alerts.new.data}}{{kibana.alert.instance.id}},{{/alerts.new.data}}]',
                  ongoing: '{{alerts.ongoing.count}}',
                  ongoingIds:
                    '[{{#alerts.ongoing.data}}{{kibana.alert.instance.id}},{{/alerts.ongoing.data}}]',
                  recovered: '{{alerts.recovered.count}}',
                  recoveredIds:
                    '[{{#alerts.recovered.data}}{{kibana.alert.instance.id}},{{/alerts.recovered.data}}]',
                },
              ],
            },
            frequency: {
              notify_when: 'onThrottleInterval',
              throttle: '1m',
              summary: true,
            },
          },
        ],
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);

      await runRule({
        supertest,
        ruleId,
      });

      const resp = await waitForDocumentInIndex({
        esClient,
        indexName: ALERT_ACTION_INDEX,
        num: 2,
      });
      expect(resp.hits.hits.length).to.be(2);

      const document = resp.hits.hits[0];
      expect(document._source).to.eql({
        all: '1',
        new: '1',
        newIds: '[query matched,]',
        ongoing: '0',
        ongoingIds: '[]',
        recovered: '0',
        recoveredIds: '[]',
      });

      const document1 = resp.hits.hits[1];
      expect(document1._source).to.eql({
        all: '1',
        new: '0',
        newIds: '[]',
        ongoing: '1',
        ongoingIds: '[query matched,]',
        recovered: '0',
        recoveredIds: '[]',
      });
    });
  });
}
