/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { SearchHit } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  ALERT_ACTION_GROUP,
  ALERT_SEVERITY_IMPROVING,
  ALERT_PREVIOUS_ACTION_GROUP,
} from '@kbn/rule-data-utils';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getEventLog, getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { Spaces } from '../../../scenarios';

// eslint-disable-next-line import/no-default-export
export default function createAlertSeverityTests({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const space = Spaces.default;

  const alertsAsDataIndex = '.alerts-test.severity.alerts-default';

  describe('improving alert severity', () => {
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      await objectRemover.removeAll();
    });
    after(async () => {
      await es.deleteByQuery({
        index: alertsAsDataIndex,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    });

    it('should correctly set severity_improving and previous_action_group data in alert document', async () => {
      const pattern = [
        'low',
        'low',
        'medium',
        'high',
        'high',
        'low',
        'high',
        'medium',
        'medium',
        'low',
      ];
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.severity',
            schedule: { interval: '1d' },
            throttle: null,
            params: {
              pattern,
            },
          })
        )
        .expect(200);
      const ruleId = createdRule.id;
      objectRemover.add(space.id, ruleId, 'rule', 'alerting');

      const allAlertDocs: Alert[] = [];
      for (let i = 0; i < pattern.length; i++) {
        // Wait for execution to finish
        await waitForEventLogDocs(ruleId, new Map([['execute', { equal: i + 1 }]]));

        // Get alert after last execution
        const alertDocs = await queryForAlertDocs<Alert>();
        expect(alertDocs.length).to.eql(1);
        allAlertDocs.push(alertDocs[0]._source!);

        // Run another execution
        await supertest
          .post(`${getUrlPrefix(space.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo')
          .expect(204);
      }

      // Verify action group and previous action group are set as expected
      for (let i = 0; i < pattern.length; i++) {
        expect(allAlertDocs[i][ALERT_ACTION_GROUP]).to.eql(pattern[i]);

        if (i >= 1) {
          expect(allAlertDocs[i][ALERT_PREVIOUS_ACTION_GROUP]).to.eql(pattern[i - 1]);
        } else {
          expect(allAlertDocs[i][ALERT_PREVIOUS_ACTION_GROUP]).to.be(undefined);
        }
      }

      // Verify severity_improving is set correctly
      expect(allAlertDocs[0][ALERT_SEVERITY_IMPROVING]).to.eql(false);
      expect(allAlertDocs[1][ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(allAlertDocs[2][ALERT_SEVERITY_IMPROVING]).to.eql(false);
      expect(allAlertDocs[3][ALERT_SEVERITY_IMPROVING]).to.eql(false);
      expect(allAlertDocs[4][ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(allAlertDocs[5][ALERT_SEVERITY_IMPROVING]).to.eql(true);
      expect(allAlertDocs[6][ALERT_SEVERITY_IMPROVING]).to.eql(false);
      expect(allAlertDocs[7][ALERT_SEVERITY_IMPROVING]).to.eql(true);
      expect(allAlertDocs[8][ALERT_SEVERITY_IMPROVING]).to.be(undefined);
      expect(allAlertDocs[9][ALERT_SEVERITY_IMPROVING]).to.eql(true);
    });
  });

  async function queryForAlertDocs<T>(): Promise<Array<SearchHit<T>>> {
    const searchResult = await es.search({
      index: alertsAsDataIndex,
      body: { query: { match_all: {} } },
    });
    return searchResult.hits.hits as Array<SearchHit<T>>;
  }

  async function waitForEventLogDocs(
    id: string,
    actions: Map<string, { gte: number } | { equal: number }>
  ) {
    return await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: space.id,
        type: 'alert',
        id,
        provider: 'alerting',
        actions,
      });
    });
  }
}
