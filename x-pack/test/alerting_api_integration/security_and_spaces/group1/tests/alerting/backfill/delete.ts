/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete backfill', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    function getRule(overwrites = {}) {
      return getTestRuleData({
        rule_type_id: 'test.patternFiringAutoRecoverFalse',
        params: {
          pattern: {
            instance: [true, false, true],
          },
        },
        schedule: { interval: '12h' },
        ...overwrites,
      });
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        const apiOptions = {
          spaceId: space.id,
          username: user.username,
          password: user.password,
        };
        it('should handle delete backfill request appropriately', async () => {
          // create 2 rules
          const rresponse1 = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId1 = rresponse1.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId1, 'rule', 'alerting');

          const rresponse2 = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId2 = rresponse2.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId2, 'rule', 'alerting');

          // schedule backfill for both rules
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .send([
              {
                rule_id: ruleId1,
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-25T12:00:00.000Z',
              },
              { rule_id: ruleId2, start: '2023-10-19T12:00:00.000Z' },
            ]);

          const scheduleResult = scheduleResponse.body;
          expect(scheduleResult.length).to.eql(2);
          const backfillId1 = scheduleResult[0].id;
          const backfillId2 = scheduleResult[1].id;

          // ensure backfills exist
          await supertest
            .get(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId1}`
            )
            .set('kbn-xsrf', 'foo')
            .expect(200);

          await supertest
            .get(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId2}`
            )
            .set('kbn-xsrf', 'foo')
            .expect(200);

          // delete them
          const deleteResponse1 = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId1}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          const deleteResponse2 = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId2}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(deleteResponse1.statusCode).to.eql(403);
              expect(deleteResponse1.body).to.eql({
                error: 'Forbidden',
                message: `Failed to delete backfill by id: ${backfillId1}: Unauthorized by "alertsFixture" to deleteBackfill "test.patternFiringAutoRecoverFalse" rule`,
                statusCode: 403,
              });
              expect(deleteResponse2.statusCode).to.eql(403);
              expect(deleteResponse2.body).to.eql({
                error: 'Forbidden',
                message: `Failed to delete backfill by id: ${backfillId2}: Unauthorized by "alertsFixture" to deleteBackfill "test.patternFiringAutoRecoverFalse" rule`,
                statusCode: 403,
              });
              break;
            // User has read privileges in this space
            case 'global_read at space1':
            // User doesn't have access to actions but that doesn't matter for backfill jobs
            case 'space_1_all_alerts_none_actions at space1':
            // Superuser has access to everything
            case 'superuser at space1':
            // User has all privileges in this space
            case 'space_1_all at space1':
            // User has all privileges in this space
            case 'space_1_all_with_restricted_fixture at space1':
              expect(deleteResponse1.statusCode).to.eql(204);
              expect(deleteResponse2.statusCode).to.eql(204);

              await supertest
                .get(
                  `${getUrlPrefix(
                    apiOptions.spaceId
                  )}/internal/alerting/rules/backfill/${backfillId1}`
                )
                .set('kbn-xsrf', 'foo')
                .expect(404);

              await supertest
                .get(
                  `${getUrlPrefix(
                    apiOptions.spaceId
                  )}/internal/alerting/rules/backfill/${backfillId2}`
                )
                .set('kbn-xsrf', 'foo')
                .expect(404);

              // TODO - add check that scheduled task no longer exists
              // after merging with task runner branch
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle delete request appropriately when backfill does not exist', async () => {
          // get backfill as current user
          const response = await supertestWithoutAuth
            .delete(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/does-not-exist`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // These should all be the same 404 response
          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
            // User has read privileges in this space
            case 'global_read at space1':
            // User doesn't have access to actions but that doesn't matter for backfill jobs
            case 'space_1_all_alerts_none_actions at space1':
            // Superuser has access to everything
            case 'superuser at space1':
            // User has all privileges in this space
            case 'space_1_all at space1':
            // User has all privileges in this space
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Failed to delete backfill by id: does-not-exist: Saved object [ad_hoc_run_params/does-not-exist] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should not get backfill from another space', async () => {
          // create rule
          const rresponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId = rresponse.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // schedule backfill
          const scheduleResponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .send([
              {
                rule_id: ruleId,
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-25T12:00:00.000Z',
              },
            ]);

          const scheduleResult = scheduleResponse.body;
          expect(scheduleResult.length).to.eql(1);
          const backfillId = scheduleResult[0].id;

          // delete backfill as current user
          const response = await supertestWithoutAuth
            .delete(`${getUrlPrefix('other')}/internal/alerting/rules/backfill/${backfillId}`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // These should all be the same 404 response
          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
            // User has read privileges in this space
            case 'global_read at space1':
            // User doesn't have access to actions but that doesn't matter for backfill jobs
            case 'space_1_all_alerts_none_actions at space1':
            // Superuser has access to everything
            case 'superuser at space1':
            // User has all privileges in this space
            case 'space_1_all at space1':
            // User has all privileges in this space
            case 'space_1_all_with_restricted_fixture at space1':
              expect(response.statusCode).to.eql(404);
              expect(response.body).to.eql({
                statusCode: 404,
                error: 'Not Found',
                message: `Failed to delete backfill by id: ${backfillId}: Saved object [ad_hoc_run_params/${backfillId}] not found`,
              });

              // backfill should still exist
              await supertest
                .get(
                  `${getUrlPrefix(
                    apiOptions.spaceId
                  )}/internal/alerting/rules/backfill/${backfillId}`
                )
                .set('kbn-xsrf', 'foo')
                .expect(200);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
