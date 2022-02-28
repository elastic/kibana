/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AlertExecutionStatusErrorReasons } from '../../../../../plugins/alerting/common';
import { Spaces } from '../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const supertest = getService('supertest');
  const spaceId = Spaces[0].id;

  // the only tests here are those that can't be run in spaces_only
  describe('executionStatus', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(async () => await objectRemover.removeAll());

    it('should eventually have error reason "decrypt" when appropriate', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.noop',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(spaceId, alertId, 'rule', 'alerting');

      let executionStatus = await waitForStatus(alertId, new Set(['ok']), 10000);

      await retry.try(async () => {
        // break AAD
        await supertest
          .put(`${getUrlPrefix(spaceId)}/api/alerts_fixture/saved_object/alert/${alertId}`)
          .set('kbn-xsrf', 'foo')
          .send({
            attributes: {
              name: 'bar',
            },
          })
          .expect(200);
      });

      executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus.error).to.be.ok();
      expect(executionStatus.error.reason).to.be(AlertExecutionStatusErrorReasons.Decrypt);
      expect(executionStatus.error.message).to.be('Unable to decrypt attribute "apiKey"');
    });
  });

  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = 10000
  ): Promise<Record<string, any>> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(`${getUrlPrefix(spaceId)}/api/alerting/rule/${id}`);
    expect(response.status).to.eql(200);
    const { status } = response.body.execution_status;
    if (statuses.has(status)) return response.body.execution_status;

    // eslint-disable-next-line no-console
    console.log(
      `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
        response.body.execution_status
      )}, retrying`
    );

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }
}

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
