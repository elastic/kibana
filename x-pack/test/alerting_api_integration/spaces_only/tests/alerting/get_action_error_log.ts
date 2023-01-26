/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';

import { Spaces } from '../../scenarios';
import { getUrlPrefix, ObjectRemover, getTestRuleData, getEventLog } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetActionErrorLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const es = getService('es');
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  const dateStart = new Date(Date.now() - 600000).toISOString();

  describe('getActionErrorLog', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(() => objectRemover.removeAll());

    it(`handles non-existent rule`, async () => {
      await supertest
        .get(
          `${getUrlPrefix(
            Spaces.space1.id
          )}/internal/alerting/rule/1/_action_error_log?date_start=${dateStart}`
        )
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Saved object [alert/1] not found',
        });
    });

    it('returns no action error logs if rule action did not error', async () => {
      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '5s' } }))
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?date_start=${dateStart}`
      );

      expect(response.body.totalErrors).to.eql(0);
      expect(response.body.errors).to.eql([]);
    });

    it('gets action error logs for rules with action errors', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'connector that throws',
          connector_type_id: 'test.throw',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector.id, 'action', 'actions');

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.cumulative-firing',
            actions: [
              {
                id: createdConnector.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      await waitForEvents(createdRule.id, 'actions', new Map([['execute', { gte: 1 }]]));

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?date_start=${dateStart}`
      );

      expect(response.body.totalErrors).to.eql(1);
      expect(response.body.errors.length).to.eql(1);

      for (const errors of response.body.errors) {
        expect(errors.type).to.equal('actions');
        expect(errors.message).to.equal(
          `action execution failure: test.throw:${createdConnector.id}: connector that throws - an error occurred while running the action: this action is intended to fail; retry: true`
        );
      }
    });

    it('get and filter action error logs for rules with multiple action errors', async () => {
      const { body: createdConnector1 } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'throws_1',
          connector_type_id: 'test.throw',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector1.id, 'action', 'actions');

      const { body: createdConnector2 } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'throws_2',
          connector_type_id: 'test.throw',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdConnector2.id, 'action', 'actions');

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestRuleData({
            rule_type_id: 'test.cumulative-firing',
            schedule: { interval: '5s' },
            actions: [
              {
                id: createdConnector1.id,
                group: 'default',
                params: {},
              },
              {
                id: createdConnector2.id,
                group: 'default',
                params: {},
              },
            ],
          })
        )
        .expect(200);
      objectRemover.add(Spaces.space1.id, createdRule.id, 'rule', 'alerting');

      await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
      await waitForEvents(createdRule.id, 'actions', new Map([['execute', { gte: 2 }]]));

      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?date_start=${dateStart}`
      );

      expect(response.body.totalErrors).to.eql(2);

      const filteredResponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?filter=message:"throws_1"&date_start=${dateStart}`
      );

      expect(filteredResponse.body.totalErrors).to.eql(1);

      // Fetch rule execution, try to filter on that
      const execResponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_execution_log?date_start=${dateStart}`
      );

      const runId = execResponse.body.data[0].id;

      const filteredByIdResponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?filter=kibana.alert.rule.execution.uuid:${runId}&date_start=${dateStart}`
      );
      expect(filteredByIdResponse.body.totalErrors).to.eql(2);

      const filteredByInvalidResponse = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${
          createdRule.id
        }/_action_error_log?filter=kibana.alert.rule.execution.uuid:doesnt_exist&date_start=${dateStart}`
      );
      expect(filteredByInvalidResponse.body.totalErrors).to.eql(0);
    });
  });

  async function waitForEvents(
    id: string,
    provider: string,
    actions: Map<
      string,
      {
        gte: number;
      }
    >
  ) {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id,
        provider,
        actions,
      });
    });
  }
}
