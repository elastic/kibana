/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import {
  getUrlPrefix,
  ObjectRemover,
  getTestRuleData,
  getUnauthorizedErrorMessage,
} from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function findGapsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find gaps', () => {
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

        describe('find gaps with request body', () => {
          it('should handle finding gaps with various parameters', async () => {
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
                ruleId: ruleId1,
                start: gap2Start,
                end: gap2End,
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

            // Test cases for finding gaps
            const testCases = [
              // Find gaps for rule 1
              {
                body: {
                  rule_id: ruleId1,
                  start: searchStart,
                  end: searchEnd,
                },
                expectedTotal: 2,
                description: 'should find gaps for rule 1',
              },
              // Find gaps for rule 2
              {
                body: {
                  rule_id: ruleId2,
                  start: searchStart,
                  end: searchEnd,
                },
                expectedTotal: 1,
                description: 'should find gaps for rule 2',
              },
              // Test pagination
              {
                body: {
                  rule_id: ruleId1,
                  start: searchStart,
                  end: searchEnd,
                  per_page: 1,
                  page: 1,
                },
                expectedTotal: 2,
                expectedPerPage: 1,
                description: 'should return first page of gaps',
              },
              // Test response schema and data validation
              {
                body: {
                  rule_id: ruleId1,
                  start: searchStart,
                  end: searchEnd,
                },
                expectedTotal: 2,
                validate: (response: any) => {
                  expect(response.body).to.have.keys(['page', 'per_page', 'total', 'data']);
                  const data = response.body.data;
                  expect(data[0].range.gte).to.eql(gap2Start);
                  expect(data[0].range.lte).to.eql(gap2End);
                  expect(data[0].filled_intervals).to.eql([]);
                  expect(data[0].in_progress_intervals).to.eql([]);
                  expect(data[0].unfilled_intervals).to.eql([
                    {
                      gte: gap2Start,
                      lte: gap2End,
                    },
                  ]);
                  expect(data[0].status).to.eql('unfilled');
                  expect(data[0].total_gap_duration_ms).to.eql(86400000);
                  expect(data[0].filled_duration_ms).to.eql(0);
                  expect(data[0].unfilled_duration_ms).to.eql(86400000);
                  expect(data[0].in_progress_duration_ms).to.eql(0);

                  expect(data[0]).to.have.keys('_id', '@timestamp');
                },
                description: 'should return correct response schema',
              },
              // Test sorting order validation
              {
                body: {
                  rule_id: ruleId1,
                  start: searchStart,
                  end: searchEnd,
                  sort_field: '@timestamp',
                  sort_order: 'desc',
                },
                expectedTotal: 2,
                validate: (response: any) => {
                  const timestamps = response.body.data.map((gap: any) => gap['@timestamp']);
                  expect(timestamps[0]).to.be.greaterThan(timestamps[1]);
                },
                description: 'should return gaps sorted by @timestamp in descending order',
              },
              // Test non-overlapping date range
              {
                body: {
                  rule_id: ruleId1,
                  start: '2024-02-01T00:00:00.000Z',
                  end: '2024-02-28T00:00:00.000Z',
                },
                expectedTotal: 0,
                description: 'should return no gaps for non-overlapping date range',
              },
              // Test partially overlapping ranges
              {
                body: {
                  rule_id: ruleId1,
                  start: '2024-01-05T11:30:00.000Z',
                  end: '2024-01-05T12:30:00.000Z',
                },
                expectedTotal: 1,
                validate: (response: any) => {
                  expect(response.body.data[0].range.gte).to.equal(gap1Start);
                  expect(response.body.data[0].range.lte).to.equal(gap1End);
                },
                description: 'should return gap when search range partially overlaps',
              },
            ];

            for (const testCase of testCases) {
              const response = await supertestWithoutAuth
                .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_find`)
                .set('kbn-xsrf', 'foo')
                .auth(apiOptions.username, apiOptions.password)
                .send(testCase.body);

              switch (scenario.id) {
                case 'no_kibana_privileges at space1':
                case 'space_1_all at space2':
                  expect(response.statusCode).to.eql(403);
                  expect(response.body).to.eql({
                    error: 'Forbidden',
                    message: `Failed to find gaps: ${getUnauthorizedErrorMessage(
                      'get',
                      'test.patternFiringAutoRecoverFalse',
                      'alertsFixture'
                    )}`,
                    statusCode: 403,
                  });
                  break;

                case 'global_read at space1':
                case 'space_1_all_alerts_none_actions at space1':
                case 'superuser at space1':
                case 'space_1_all at space1':
                case 'space_1_all_with_restricted_fixture at space1':
                  expect(response.statusCode).to.eql(200);
                  expect(response.body.total).to.eql(testCase.expectedTotal);
                  if (testCase.expectedPerPage) {
                    expect(response.body.per_page).to.eql(testCase.expectedPerPage);
                  }
                  // Execute additional validations if present
                  if (testCase.validate) {
                    testCase.validate(response);
                  }
                  break;

                default:
                  throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
              }
            }
          });
        });

        describe('find gaps with invalid parameters', () => {
          it('should handle invalid parameters appropriately', async () => {
            const invalidBodies = [
              {
                body: {
                  start: searchStart,
                  end: searchEnd,
                },
                expectedError:
                  '[request body.rule_id]: expected value of type [string] but got [undefined]',
              },
              {
                body: {
                  rule_id: '1',
                  start: 'invalid-date',
                  end: searchEnd,
                },
                expectedError: '[request body]: [start]: query start must be valid date',
              },
              {
                body: {
                  rule_id: '1',
                  start: searchStart,
                  end: 'invalid-date',
                },
                expectedError: '[request body]: [end]: query end must be valid date',
              },
              {
                body: {
                  rule_id: '1',
                  start: searchStart,
                  end: searchStart,
                },
                expectedError: '[request body]: [start]: query start must be before end',
              },
            ];

            for (const { body, expectedError } of invalidBodies) {
              const response = await supertestWithoutAuth
                .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/gaps/_find`)
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
