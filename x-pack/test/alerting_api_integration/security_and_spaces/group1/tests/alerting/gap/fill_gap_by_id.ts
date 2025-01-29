/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover, getTestRuleData } from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function fillGapByIdTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fill gap by id', () => {
    const objectRemover = new ObjectRemover(supertest);
    const gapStart = moment().subtract(14, 'days').startOf('day').toISOString();
    const gapEnd = moment().subtract(13, 'days').startOf('day').toISOString();

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

        describe(`fill gap by id (${scenario.id})`, () => {
          beforeEach(async () => {
            await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/_test/delete_gaps`)
              .set('kbn-xsrf', 'foo')
              .send({})
              .expect(200);
          });

          it('should schedule backfill for unfilled gap', async () => {
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
                start: gapStart,
                end: gapEnd,
                spaceId: apiOptions.spaceId,
              });

            // Find the gap to get its ID
            const findResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_find`)
              .set('kbn-xsrf', 'foo')
              .send({
                rule_id: ruleId,
                start: gapStart,
                end: gapEnd,
              });

            expect(findResponse.statusCode).to.eql(200);
            expect(findResponse.body.total).to.eql(1);
            const gapId = findResponse.body.data[0]._id;

            // Fill the gap
            const response = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/_fill_by_id?rule_id=${ruleId}&gap_id=${gapId}`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({});

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message: `Failed to find gap and schedule manual rule run for ruleId ${ruleId}: Unauthorized by "alertsFixture" to get "test.patternFiringAutoRecoverFalse" rule`,
                  statusCode: 403,
                });
                break;

              case 'global_read at space1':
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message: `Failed to find gap and schedule manual rule run for ruleId ${ruleId}: Unauthorized by "alertsFixture" to fillGaps "test.patternFiringAutoRecoverFalse" rule`,
                  statusCode: 403,
                });
                break;

              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(200);
                expect(response.body).to.have.length(1);

                const backfillResult = response.body[0];
                expect(backfillResult.duration).to.eql('12h');
                expect(backfillResult.enabled).to.eql(true);
                expect(backfillResult.start).to.eql(gapStart);
                expect(backfillResult.end).to.eql(gapEnd);
                expect(backfillResult.status).to.eql('pending');
                expect(backfillResult.space_id).to.eql(space.id);
                expect(typeof backfillResult.created_at).to.be('string');
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should handle non-existent gap', async () => {
            // Create a rule
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            const nonExistentGapId = 'non-existent-gap-id';

            const response = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/_fill_by_id?rule_id=${ruleId}&gap_id=${nonExistentGapId}`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({});

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
              case 'global_read at space1':
                expect(response.statusCode).to.eql(403);
                break;

              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response.statusCode).to.eql(404);
                expect(response.body).to.eql({
                  statusCode: 404,
                  error: 'Not Found',
                  message: `Failed to find gap and schedule manual rule run for ruleId ${ruleId}: Gap not found for ruleId ${ruleId} and gapId ${nonExistentGapId}`,
                });
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });

          it('should handle invalid parameters appropriately', async () => {
            // Create a rule
            const ruleResponse = await supertest
              .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
              .set('kbn-xsrf', 'foo')
              .send(getRule())
              .expect(200);
            const ruleId = ruleResponse.body.id;
            objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

            // Test with missing rule_id
            const response1 = await supertestWithoutAuth
              .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_fill_by_id`)
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({});

            // Test with missing gap_id
            const response2 = await supertestWithoutAuth
              .post(
                `${getUrlPrefix(
                  apiOptions.spaceId
                )}/internal/alerting/rules/gaps/_fill_by_id?rule_id=${ruleId}`
              )
              .set('kbn-xsrf', 'foo')
              .auth(apiOptions.username, apiOptions.password)
              .send({});

            switch (scenario.id) {
              case 'no_kibana_privileges at space1':
              case 'space_1_all at space2':
              case 'global_read at space1':
              case 'space_1_all_alerts_none_actions at space1':
              case 'superuser at space1':
              case 'space_1_all at space1':
              case 'space_1_all_with_restricted_fixture at space1':
                expect(response1.statusCode).to.eql(400);
                expect(response1.body).to.eql({
                  statusCode: 400,
                  error: 'Bad Request',
                  message:
                    '[request query.rule_id]: expected value of type [string] but got [undefined]',
                });

                expect(response2.statusCode).to.eql(400);
                expect(response2.body).to.eql({
                  statusCode: 400,
                  error: 'Bad Request',
                  message:
                    '[request query.gap_id]: expected value of type [string] but got [undefined]',
                });
                break;

              default:
                throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
            }
          });
        });
      });
    }
  });
}
