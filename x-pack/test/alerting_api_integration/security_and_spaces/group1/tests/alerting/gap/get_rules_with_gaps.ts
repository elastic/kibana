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
export default function getRuleIdsWithGapsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get rules with gaps', () => {
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

        describe(`get rules with gaps (${scenario.id})`, () => {
          beforeEach(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/delete_gaps`)
              .set('kbn-xsrf', 'foo')
              .send({})
              .expect(200);
          });

          it('should return rules with gaps in given time range', async () => {
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
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message:
                    'Failed to find rules with gaps: Unauthorized to find rules for any rule types',
                  statusCode: 403,
                });
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(2);
                expect(response.body.rule_ids).to.have.length(2);
                expect(response.body.rule_ids).to.contain(ruleId1);
                expect(response.body.rule_ids).to.contain(ruleId2);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should filter rules by gap status', async () => {
            // Create a rule
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            // Create an unfilled gap
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/report_gap`)
              .set('kbn-xsrf', 'foo')
              .send({
                ruleId,
                start: gap1Start,
                end: gap1End,
                spaceId: apiOptions.spaceId,
              });

            // Test filtering by unfilled status
            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                statuses: ['unfilled'],
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(1);
                expect(response.body.rule_ids).to.eql([ruleId]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }

            // Test filtering by filled status (should return empty)
            const filledResponse = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
                statuses: ['filled'],
              });

            if (
              !['no_kibana_privileges at space1', 'space_1_all at space2'].includes(scenario.id)
            ) {
              expect(filledResponse.statusCode).to.eql(200);
              expect(filledResponse.body.total).to.eql(0);
              expect(filledResponse.body.rule_ids).to.eql([]);
            }
          });

          it('should return empty result when no gaps exist', async () => {
            // Create a rule without gaps
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            const response = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({
                start: searchStart,
                end: searchEnd,
              });

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                break;

              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body.total).to.eql(0);
                expect(response.body.rule_ids).to.eql([]);
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should handle invalid parameters', async () => {
            const invalidBodies = [
              {
                body: {
                  start: 'invalid-date',
                  end: searchEnd,
                },
                expectedError: '[request body]: [start]: query start must be valid date',
              },
              {
                body: {
                  start: searchStart,
                  end: 'invalid-date',
                },
                expectedError: '[request body]: [end]: query end must be valid date',
              },
            ];

            for (const { body, expectedError } of invalidBodies) {
              const response = await supertestWithoutAuth
                .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_get_rules`)
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
