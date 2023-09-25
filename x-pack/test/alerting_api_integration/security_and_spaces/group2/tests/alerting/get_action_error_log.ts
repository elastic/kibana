/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { Spaces, UserAtSpaceScenarios } from '../../../scenarios';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestRuleData,
  getEventLog,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetActionErrorLogTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
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

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('gets action error logs for rules with action errors with appropriate authorization', async () => {
          const { body: createdConnector } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/actions/connector`)
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'connector that throws',
              connector_type_id: 'test.throw',
              config: {},
              secrets: {},
            })
            .expect(200);
          objectRemover.add(space.id, createdConnector.id, 'action', 'actions');

          const { body: createdRule } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
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
          objectRemover.add(space.id, createdRule.id, 'rule', 'alerting');

          await waitForEvents(
            createdRule.id,
            'alerting',
            new Map([['execute', { gte: 1 }]]),
            space.id
          );
          await waitForEvents(
            createdRule.id,
            'actions',
            new Map([['execute', { gte: 1 }]]),
            space.id
          );

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/internal/alerting/rule/${
                createdRule.id
              }/_action_error_log?date_start=${dateStart}`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage(
                  'get',
                  'test.cumulative-firing',
                  'alertsFixture'
                ),
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.totalErrors).to.eql(1);
              expect(response.body.errors.length).to.eql(1);

              for (const errors of response.body.errors) {
                expect(errors.type).to.equal('actions');
                expect(errors.message).to.equal(
                  `action execution failure: test.throw:${createdConnector.id}: connector that throws - an error occurred while running the action: this action is intended to fail; retry: true`
                );
              }
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('gets action error logs from an alternate space', async () => {
      const { body: createdConnector } = await supertest
        .post(`${getUrlPrefix(Spaces[1].id)}/api/actions/connector`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'connector that throws',
          connector_type_id: 'test.throw',
          config: {},
          secrets: {},
        })
        .expect(200);
      objectRemover.add(Spaces[1].id, createdConnector.id, 'action', 'actions');

      // Create 2 rules, and then only pull the logs for one of them
      let watchedRuleId;
      for (let i = 0; i < 2; i++) {
        const { body: createdRule } = await supertest
          .post(`${getUrlPrefix(Spaces[1].id)}/api/alerting/rule`)
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
        objectRemover.add(Spaces[1].id, createdRule.id, 'rule', 'alerting');
        await waitForEvents(createdRule.id, 'alerting', new Map([['execute', { gte: 1 }]]));
        await waitForEvents(createdRule.id, 'actions', new Map([['execute', { gte: 1 }]]));

        if (i === 0) watchedRuleId = createdRule.id;
      }

      const response = await supertest.get(
        `${getUrlPrefix(
          Spaces[0].id
        )}/internal/alerting/rule/${watchedRuleId}/_action_error_log?date_start=${dateStart}&with_auth=true&namespace=${
          Spaces[1].id
        }`
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
  });

  async function waitForEvents(
    id: string,
    provider: string,
    actions: Map<
      string,
      {
        gte: number;
      }
    >,
    spaceId = Spaces[1].id
  ) {
    await retry.try(async () => {
      return await getEventLog({
        getService,
        spaceId,
        type: 'alert',
        id,
        provider,
        actions,
      });
    });
  }
}
