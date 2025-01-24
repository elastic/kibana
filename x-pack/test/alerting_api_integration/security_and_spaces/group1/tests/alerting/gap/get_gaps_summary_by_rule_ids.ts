/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function getGapsSummaryByRuleIdsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get gaps summary by rule ids', () => {
    const objectRemover = new ObjectRemover(supertest);
    const searchStart = '2024-01-01T00:00:00.000Z';
    const searchEnd = '2024-01-31T00:00:00.000Z';
    const gap1Start = '2024-01-05T00:00:00.000Z';
    const gap1End = '2024-01-06T00:00:00.000Z';
    const gap2Start = '2024-01-15T00:00:00.000Z';
    const gap2End = '2024-01-16T00:00:00.000Z';

    afterEach(async () => {
      await objectRemover.removeAll();
    });

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

        describe(`get gaps summary by rule ids (${scenario.id})`, () => {
          beforeEach(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/delete_gaps`)
              .set('kbn-xsrf', 'foo')
              .send({})
              .expect(200);
          });

          it('should return gaps summary for multiple rules', async () => {
            // Create 2 rules
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

            // Create gaps for both rules
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId1,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId: ruleId2,
                start: gap2Start,
                end: gap2End,
                spaceId: apiOptions.spaceId,
              });

            const response = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/_get_gaps_summary_by_rule_ids`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                rule_ids: [ruleId1, ruleId2],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message:
                    'Failed to find gaps summary for rules: Unauthorized to find rules for any rule types',
                  statusCode: 403,
                });
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.data).to.have.length(2);

                const rule1Data = response.body.data.find((d: any) => d.rule_id === ruleId1);
                const rule2Data = response.body.data.find((d: any) => d.rule_id === ruleId2);

                expect(rule1Data).to.not.be(undefined);
                expect(rule2Data).to.not.be(undefined);

                // Verify gap durations are calculated correctly
                expect(rule1Data.total_unfilled_duration_ms).to.eql(86400000);
                expect(rule2Data.total_unfilled_duration_ms).to.eql(86400000);
                expect(rule1Data.total_in_progress_duration_ms).to.eql(0);
                expect(rule2Data.total_in_progress_duration_ms).to.eql(0);
                expect(rule1Data.total_filled_duration_ms).to.eql(0);
                expect(rule2Data.total_filled_duration_ms).to.eql(0);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should handle request with non-existent rule ids', async () => {
            const nonExistentRuleId = 'ac612b4b-5d0c-46d7-855a-98dd920e3aa6';

            const response = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/_get_gaps_summary_by_rule_ids`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                rule_ids: [nonExistentRuleId],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message:
                    'Failed to find gaps summary for rules: Unauthorized to find rules for any rule types',
                  statusCode: 403,
                });
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(400);
                expect(response.body).to.eql({
                  statusCode: 400,
                  error: 'Bad Request',
                  message: `Failed to find gaps summary for rules: No rules matching ids ${nonExistentRuleId} found to get gaps summary`,
                });
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should handle invalid parameters', async () => {
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            const invalidBodies = [
              {
                body: {
                  start: 'invalid-date',
                  end: searchEnd,
                  rule_ids: [ruleId],
                },
                expectedError: '[request body]: [start]: query start must be valid date',
              },
              {
                body: {
                  start: searchStart,
                  end: 'invalid-date',
                  rule_ids: [ruleId],
                },
                expectedError: '[request body]: [end]: query end must be valid date',
              },
            ];

            for (const { body, expectedError } of invalidBodies) {
              const response = await supertestWithoutAuth
                .post(
                  `${getUrlPrefix(
                    apiOptions.spaceId
                  )}/internal/alerting/rules/gaps/_get_gaps_summary_by_rule_ids`
                )
                .set('kbn-xsrf', 'foo')
                .auth(apiOptions.username, apiOptions.password)
                .send(body);

              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: expectedError,
              });
            }
          });
        });
      });
    }
  });
}
