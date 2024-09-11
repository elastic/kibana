/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { asyncForEach } from '@kbn/std';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('get backfill', () => {
    let backfillIds: Array<{ id: string; spaceId: string }> = [];
    const objectRemover = new ObjectRemover(supertest);
    const start = moment().utc().startOf('day').subtract(7, 'days').toISOString();
    const end1 = moment().utc().startOf('day').subtract(1, 'day').toISOString();
    const end2 = moment().utc().startOf('day').subtract(3, 'day').toISOString();

    afterEach(async () => {
      await asyncForEach(backfillIds, async ({ id, spaceId }: { id: string; spaceId: string }) => {
        await supertest
          .delete(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/${id}`)
          .set('kbn-xsrf', 'foo');
      });
      backfillIds = [];
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

    function testExpectedRule(result: any, ruleId: string | undefined, isSO: boolean) {
      if (!isSO) {
        expect(result.rule.id).to.eql(ruleId);
        expect(result.rule.name).to.eql('abc');
        expect(result.rule.tags).to.eql(['foo']);
        expect(result.rule.params).to.eql({
          pattern: {
            instance: [true, false, true],
          },
        });
        expect(result.rule.enabled).to.eql(true);
        expect(result.rule.consumer).to.eql('alertsFixture');
        expect(result.rule.schedule.interval).to.eql('12h');
        expect(result.rule.rule_type_id).to.eql('test.patternFiringAutoRecoverFalse');
        expect(result.rule.api_key_owner).to.eql('elastic');
        expect(result.rule.api_key_created_by_user).to.eql(false);
        expect(result.rule.created_by).to.eql('elastic');
        expect(result.rule.updated_by).to.eql('elastic');
        expect(typeof result.rule.created_at).to.be('string');
        expect(typeof result.rule.updated_at).to.be('string');
      } else {
        expect(result.rule.name).to.eql('abc');
        expect(result.rule.tags).to.eql(['foo']);
        expect(result.rule.params).to.eql({
          pattern: {
            instance: [true, false, true],
          },
        });
        expect(result.rule.enabled).to.eql(true);
        expect(result.rule.consumer).to.eql('alertsFixture');
        expect(result.rule.schedule.interval).to.eql('12h');
        expect(result.rule.alertTypeId).to.eql('test.patternFiringAutoRecoverFalse');
        expect(result.rule.apiKeyOwner).to.eql('elastic');
        expect(result.rule.apiKeyCreatedByUser).to.eql(false);
        expect(result.rule.createdBy).to.eql('elastic');
        expect(result.rule.updatedBy).to.eql('elastic');
        expect(typeof result.rule.createdAt).to.be('string');
        expect(typeof result.rule.updatedAt).to.be('string');
      }
    }

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        const apiOptions = {
          spaceId: space.id,
          username: user.username,
          password: user.password,
        };
        it('should handle getting backfill job requests appropriately', async () => {
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
              { rule_id: ruleId1, start, end: end1 },
              { rule_id: ruleId2, start, end: end2 },
            ]);

          const scheduleResult = scheduleResponse.body;
          expect(scheduleResult.length).to.eql(2);
          const backfillId1 = scheduleResult[0].id;
          const backfillId2 = scheduleResult[1].id;
          backfillIds.push({ id: backfillId1, spaceId: apiOptions.spaceId });
          backfillIds.push({ id: backfillId2, spaceId: apiOptions.spaceId });

          // get backfill as current user
          const getResponse1 = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId1}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          const getResponse2 = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/${backfillId2}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(getResponse1.statusCode).to.eql(403);
              expect(getResponse1.body).to.eql({
                error: 'Forbidden',
                message: `Failed to get backfill by id: ${backfillId1}: Unauthorized by "alertsFixture" to getBackfill "test.patternFiringAutoRecoverFalse" rule`,
                statusCode: 403,
              });
              expect(getResponse2.statusCode).to.eql(403);
              expect(getResponse2.body).to.eql({
                error: 'Forbidden',
                message: `Failed to get backfill by id: ${backfillId2}: Unauthorized by "alertsFixture" to getBackfill "test.patternFiringAutoRecoverFalse" rule`,
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
              expect(getResponse1.statusCode).to.eql(200);
              expect(getResponse2.statusCode).to.eql(200);

              expect(getResponse1.body.id).to.eql(backfillId1);
              expect(getResponse1.body.duration).to.eql('12h');
              expect(getResponse1.body.enabled).to.eql(true);
              expect(getResponse1.body.start).to.eql(start);
              expect(getResponse1.body.end).to.eql(end1);
              expect(getResponse1.body.status).to.eql('pending');
              expect(getResponse1.body.space_id).to.eql(space.id);
              expect(typeof getResponse1.body.created_at).to.be('string');
              testExpectedRule(getResponse1.body, ruleId1, false);
              expect(getResponse1.body.schedule.length).to.eql(12);

              let currentStart = start;
              getResponse1.body.schedule.forEach((sched: any) => {
                expect(sched.interval).to.eql('12h');
                expect(sched.status).to.match(/complete|pending|running|error|timeout/);
                const runAt = moment(currentStart).add(12, 'hours').toISOString();
                expect(sched.run_at).to.eql(runAt);
                currentStart = runAt;
              });

              expect(getResponse2.body.id).to.eql(backfillId2);
              expect(getResponse2.body.duration).to.eql('12h');
              expect(getResponse2.body.enabled).to.eql(true);
              expect(getResponse2.body.start).to.eql(start);
              expect(getResponse2.body.end).to.eql(end2);
              expect(getResponse2.body.status).to.eql('pending');
              expect(getResponse2.body.space_id).to.eql(space.id);
              expect(typeof getResponse2.body.created_at).to.be('string');
              testExpectedRule(getResponse2.body, ruleId2, false);
              expect(getResponse2.body.schedule.length).to.eql(8);

              currentStart = start;
              getResponse2.body.schedule.forEach((sched: any) => {
                expect(sched.interval).to.eql('12h');
                expect(sched.status).to.match(/complete|pending|running|error|timeout/);
                const runAt = moment(currentStart).add(12, 'hours').toISOString();
                expect(sched.run_at).to.eql(runAt);
                currentStart = runAt;
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle get request appropriately when backfill does not exist', async () => {
          // get backfill as current user
          const response = await supertestWithoutAuth
            .get(
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
                message: `Failed to get backfill by id: does-not-exist: Saved object [ad_hoc_run_params/does-not-exist] not found`,
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
            .send([{ rule_id: ruleId, start, end: end1 }]);

          const scheduleResult = scheduleResponse.body;
          expect(scheduleResult.length).to.eql(1);
          const backfillId = scheduleResult[0].id;
          backfillIds.push({ id: backfillId, spaceId: apiOptions.spaceId });

          // get backfill as current user
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix('other')}/internal/alerting/rules/backfill/${backfillId}`)
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
                message: `Failed to get backfill by id: ${backfillId}: Saved object [ad_hoc_run_params/${backfillId}] not found`,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
