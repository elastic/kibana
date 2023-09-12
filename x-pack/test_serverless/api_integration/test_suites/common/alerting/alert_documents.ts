/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { unset } from 'lodash';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { createEsQueryRule } from './helpers/alerting_api_helper';
import { waitForAlertInIndex, waitForNumRuleRuns } from './helpers/alerting_wait_for_helpers';
import { ObjectRemover } from '../../../../shared/lib';

const OPEN_OR_ACTIVE = new Set(['open', 'active']);

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');
  const objectRemover = new ObjectRemover(supertest);

  describe('Alert documents', () => {
    const RULE_TYPE_ID = '.es-query';
    const ALERT_INDEX = '.alerts-stack.alerts-default';
    let ruleId: string;

    afterEach(async () => {
      objectRemover.removeAll();
    });

    it('should generate an alert document for an active alert', async () => {
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
          esQuery: JSON.stringify({ query: { match_all: {} } }),
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);
      objectRemover.add('default', ruleId, 'rule', 'alerting');

      // get the first alert document written
      const testStart1 = new Date();
      await waitForNumRuleRuns({
        supertest,
        numOfRuns: 1,
        ruleId,
        esClient,
        testStart: testStart1,
      });

      const alResp1 = await waitForAlertInIndex({
        esClient,
        filter: testStart1,
        indexName: ALERT_INDEX,
        ruleId,
        num: 1,
      });

      const hits1 = alResp1.hits.hits[0]._source as Record<string, any>;

      expect(new Date(hits1['@timestamp'])).to.be.a(Date);
      // should be open, first time, but also seen sometimes active; timing?
      expect(OPEN_OR_ACTIVE.has(hits1.event.action)).to.be(true);
      expect(hits1.kibana.alert.flapping_history).to.be.an(Array);
      expect(hits1.kibana.alert.maintenance_window_ids).to.be.an(Array);
      expect(typeof hits1.kibana.alert.reason).to.be('string');
      expect(typeof hits1.kibana.alert.rule.execution.uuid).to.be('string');
      expect(typeof hits1.kibana.alert.duration).to.be('object');
      expect(new Date(hits1.kibana.alert.start)).to.be.a(Date);
      expect(typeof hits1.kibana.alert.time_range).to.be('object');
      expect(typeof hits1.kibana.alert.uuid).to.be('string');
      expect(typeof hits1.kibana.alert.url).to.be('string');
      expect(typeof hits1.kibana.alert.duration.us).to.be('string');
      expect(typeof hits1.kibana.version).to.be('string');

      // remove fields we aren't going to compare directly
      const fields = [
        '@timestamp',
        'event.action',
        'kibana.alert.duration.us',
        'kibana.alert.flapping_history',
        'kibana.alert.maintenance_window_ids',
        'kibana.alert.reason',
        'kibana.alert.rule.execution.uuid',
        'kibana.alert.rule.duration',
        'kibana.alert.start',
        'kibana.alert.time_range',
        'kibana.alert.uuid',
        'kibana.alert.url',
        'kibana.version',
      ];

      for (const field of fields) {
        unset(hits1, field);
      }

      const expected = {
        event: {
          kind: 'signal',
        },
        tags: [],
        kibana: {
          space_ids: ['default'],
          alert: {
            title: "rule 'always fire' matched query",
            evaluation: {
              conditions: 'Number of matching documents is greater than -1',
              value: 0,
            },
            action_group: 'query matched',
            flapping: false,
            duration: {},
            instance: { id: 'query matched' },
            status: 'active',
            workflow_status: 'open',
            rule: {
              category: 'Elasticsearch query',
              consumer: 'alerts',
              name: 'always fire',
              execution: {},
              parameters: {
                size: 100,
                thresholdComparator: '>',
                threshold: [-1],
                index: ['alert-test-data'],
                timeField: 'date',
                esQuery: '{"query":{"match_all":{}}}',
                timeWindowSize: 20,
                timeWindowUnit: 's',
                excludeHitsFromPreviousRun: true,
                aggType: 'count',
                groupBy: 'all',
                searchType: 'esQuery',
              },
              producer: 'stackAlerts',
              revision: 0,
              rule_type_id: '.es-query',
              tags: [],
              uuid: ruleId,
            },
          },
        },
      };

      expect(hits1).to.eql(expected);
    });

    it('should update an alert document for an ongoing alert', async () => {
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
          esQuery: JSON.stringify({ query: { match_all: {} } }),
          timeWindowSize: 20,
          timeWindowUnit: 's',
        },
      });
      ruleId = createdRule.id;
      expect(ruleId).not.to.be(undefined);
      objectRemover.add('default', ruleId, 'rule', 'alerting');

      // get the first alert document written
      const testStart1 = new Date();
      await waitForNumRuleRuns({
        supertest,
        numOfRuns: 1,
        ruleId,
        esClient,
        testStart: testStart1,
      });

      const alResp1 = await waitForAlertInIndex({
        esClient,
        filter: testStart1,
        indexName: ALERT_INDEX,
        ruleId,
        num: 1,
      });

      // wait for another run, get the updated alert document
      const testStart2 = new Date();
      await waitForNumRuleRuns({
        supertest,
        numOfRuns: 1,
        ruleId,
        esClient,
        testStart: testStart2,
      });

      const alResp2 = await waitForAlertInIndex({
        esClient,
        filter: testStart2,
        indexName: ALERT_INDEX,
        ruleId,
        num: 1,
      });

      // check for differences we can check and expect
      const hits1 = alResp1.hits.hits[0]._source as Record<string, any>;
      const hits2 = alResp2.hits.hits[0]._source as Record<string, any>;

      expect(hits2['@timestamp']).to.be.greaterThan(hits1['@timestamp']);
      expect(OPEN_OR_ACTIVE.has(hits1?.event?.action)).to.be(true);
      expect(hits2?.event?.action).to.be('active');
      expect(parseInt(hits1?.kibana?.alert?.duration?.us, 10)).to.not.be.lessThan(0);
      expect(hits2?.kibana?.alert?.duration?.us).not.to.be('0');

      // remove fields we know will be different
      const fields = [
        '@timestamp',
        'event.action',
        'kibana.alert.duration.us',
        'kibana.alert.flapping_history',
        'kibana.alert.reason',
        'kibana.alert.rule.execution.uuid',
      ];

      for (const field of fields) {
        unset(hits1, field);
        unset(hits2, field);
      }

      expect(hits1).to.eql(hits2);
    });
  });
}
