/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function globalExecutionLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const retry = getService('retry');

  describe('globalExecutionLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    it('should return logs only from the current space', async () => {
      const startTime = new Date().toISOString();

      const spaceId = UserAtSpaceScenarios[1].space.id;
      const user = UserAtSpaceScenarios[1].user;
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(spaceId, alertId, 'rule', 'alerting');

      const spaceId2 = UserAtSpaceScenarios[4].space.id;
      const response2 = await supertest
        .post(`${getUrlPrefix(spaceId2)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response2.status).to.eql(200);
      const alertId2 = response2.body.id;
      objectRemover.add(spaceId2, alertId2, 'rule', 'alerting');

      const logs = await retry.try(async () => {
        // there can be a successful execute before the error one
        const logResponse = await supertestWithoutAuth
          .get(
            `${getUrlPrefix(
              spaceId
            )}/internal/alerting/_global_execution_logs?date_start=${startTime}&date_end=9999-12-31T23:59:59Z&per_page=50&page=1`
          )
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password);
        expect(logResponse.statusCode).to.be(200);

        return logResponse.body.data;
      });

      // Filter out any excess logs from rules not created by this test
      const sanitizedLogs = logs.filter((l: any) => [alertId, alertId2].includes(l.rule_id));
      const allLogsSpace0 = sanitizedLogs.every((l: any) => l.rule_id === alertId);
      expect(allLogsSpace0).to.be(true);
    });

    it('should return logs from multiple spaces when passed the namespaces param', async () => {
      const startTime = new Date().toISOString();

      const spaceId = UserAtSpaceScenarios[1].space.id;
      const user = UserAtSpaceScenarios[1].user;
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(spaceId, alertId, 'rule', 'alerting');

      const spaceId2 = UserAtSpaceScenarios[4].space.id;
      const response2 = await supertest
        .post(`${getUrlPrefix(spaceId2)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
            throttle: null,
          })
        );

      expect(response2.status).to.eql(200);
      const alertId2 = response2.body.id;
      objectRemover.add(spaceId2, alertId2, 'rule', 'alerting');

      const logs = await retry.try(async () => {
        // there can be a successful execute before the error one
        const logResponse = await supertestWithoutAuth
          .get(
            `${getUrlPrefix(
              spaceId
            )}/internal/alerting/_global_execution_logs?date_start=${startTime}&date_end=9999-12-31T23:59:59Z&per_page=50&page=1&namespaces=${JSON.stringify(
              [spaceId, spaceId2]
            )}`
          )
          .set('kbn-xsrf', 'foo')
          .auth(user.username, user.password);
        expect(logResponse.statusCode).to.be(200);

        return logResponse.body.data;
      });

      // Filter out any excess logs from rules not created by this test
      const sanitizedLogs = logs.filter((l: any) => [alertId, alertId2].includes(l.rule_id));
      const allLogsSpaces0and1 = sanitizedLogs.every((l: any) =>
        [alertId, alertId2].includes(l.rule_id)
      );
      expect(allLogsSpaces0and1).to.be(true);
    });
  });
}
