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
export default function findBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('find backfill', () => {
    let backfillIds: Array<{ id: string; spaceId: string }> = [];
    const objectRemover = new ObjectRemover(supertest);
    const start1 = moment().utc().startOf('day').subtract(14, 'days').toISOString();
    const end1 = moment().utc().startOf('day').subtract(8, 'day').toISOString();
    const start2 = moment().utc().startOf('day').subtract(12, 'days').toISOString();
    const end2 = moment().utc().startOf('day').subtract(10, 'day').toISOString();

    afterEach(async () => {
      asyncForEach(backfillIds, async ({ id, spaceId }: { id: string; spaceId: string }) => {
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

    function testExpectedBackfill1(data: any, id: string, ruleId: string, spaceId: string) {
      expect(data.id).to.eql(id);
      expect(data.duration).to.eql('12h');
      expect(data.enabled).to.eql(true);
      expect(data.start).to.eql(start1);
      expect(data.end).to.eql(end1);
      expect(data.status).to.eql('pending');
      expect(data.space_id).to.eql(spaceId);
      expect(typeof data.created_at).to.be('string');
      testExpectedRule(data, ruleId, false);
      expect(data.schedule.length).to.eql(12);

      let currentStart = start1;
      data.schedule.forEach((sched: any) => {
        expect(sched.interval).to.eql('12h');
        expect(sched.status).to.match(/complete|pending|running|error|timeout/);
        const runAt = moment(currentStart).add(12, 'hours').toISOString();
        expect(sched.run_at).to.eql(runAt);
        currentStart = runAt;
      });
    }

    function testExpectedBackfill2(data: any, id: string, ruleId: string, spaceId: string) {
      expect(data.id).to.eql(id);
      expect(data.duration).to.eql('12h');
      expect(data.enabled).to.eql(true);
      expect(data.start).to.eql(start2);
      expect(data.end).to.eql(end2);
      expect(data.status).to.eql('pending');
      expect(data.space_id).to.eql(spaceId);
      expect(typeof data.created_at).to.be('string');
      testExpectedRule(data, ruleId, false);
      expect(data.schedule.length).to.eql(4);

      let currentStart = start2;
      data.schedule.forEach((sched: any) => {
        expect(sched.interval).to.eql('12h');
        expect(sched.status).to.match(/complete|pending|running|error|timeout/);
        const runAt = moment(currentStart).add(12, 'hours').toISOString();
        expect(sched.run_at).to.eql(runAt);
        currentStart = runAt;
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
      // FLAKY: https://github.com/elastic/kibana/issues/181862
      describe.skip(scenario.id, () => {
        const apiOptions = {
          spaceId: space.id,
          username: user.username,
          password: user.password,
        };
        it('should handle finding backfill requests with query string appropriately', async () => {
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
              { rule_id: ruleId1, start: start1, end: end1 },
              { rule_id: ruleId2, start: start2, end: end2 },
            ]);

          const scheduleResult = scheduleResponse.body;
          expect(scheduleResult.length).to.eql(2);
          const backfillId1 = scheduleResult[0].id;
          const backfillId2 = scheduleResult[1].id;
          backfillIds.push({ id: backfillId1, spaceId: apiOptions.spaceId });
          backfillIds.push({ id: backfillId2, spaceId: apiOptions.spaceId });

          // find backfills for rule 1
          const findRule1Response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?rule_ids=${ruleId1}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfills for rule 2
          const findRule2Response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?rule_ids=${ruleId2}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfills for both rules
          const findBothRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?rule_ids=${ruleId1},${ruleId2}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfills with no query params
          const findNoQueryParamsResponse = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_find`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfills for rule id that does not exist
          const findNoRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?rule_ids=not-a-real-rule`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with start time that is before both backfill starts
          const findWithStartBothRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(15, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with start time that is before one backfill start
          const findWithStartOneRuleResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(13, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with start time that is before no backfills
          const findWithStartNoRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(5, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with end time that is after both backfills ends
          const findWithEndBothRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?end=${moment()
                .utc()
                .startOf('day')
                .subtract(5, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with end time that is after one backfill ends
          const findWithEndOneRuleResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?end=${moment()
                .utc()
                .startOf('day')
                .subtract(9, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with end time that is after no backfills
          const findWithEndNoRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?end=${moment()
                .utc()
                .startOf('day')
                .subtract(15, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill for start and end time that encompasses both backfills
          const findWithStartAndEndBothRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(15, 'days')
                .toISOString()}&end=${moment()
                .utc()
                .startOf('day')
                .subtract(7, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill for start and end time that encompasses one backfill
          const findWithStartAndEndOneRuleResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(13, 'days')
                .toISOString()}&end=${moment()
                .utc()
                .startOf('day')
                .subtract(9, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill for start and end time that encompasses no backfills
          const findWithStartAndEndNoRulesResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=${moment()
                .utc()
                .startOf('day')
                .subtract(20, 'days')
                .toISOString()}&end=${moment()
                .utc()
                .startOf('day')
                .subtract(15, 'days')
                .toISOString()}`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with sort and page, sort by start ascending and first page
          const findWithSortAndPageResponse1 = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?per_page=1&page=1&sort_field=start&sort_order=asc`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with sort and page, sort by start ascending and second page
          const findWithSortAndPageResponse2 = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?per_page=1&page=2&sort_field=start&sort_order=asc`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // find backfill with sort by start descending
          const findWithSortResponse = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?sort_field=start&sort_order=desc`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              [
                findRule1Response,
                findRule2Response,
                findBothRulesResponse,
                findNoRulesResponse,
                findWithStartBothRulesResponse,
                findWithStartOneRuleResponse,
                findWithStartNoRulesResponse,
                findWithEndBothRulesResponse,
                findWithEndOneRuleResponse,
                findWithEndNoRulesResponse,
                findWithStartAndEndBothRulesResponse,
                findWithStartAndEndOneRuleResponse,
                findWithStartAndEndNoRulesResponse,
                findNoQueryParamsResponse,
                findWithSortAndPageResponse1,
                findWithSortAndPageResponse2,
                findWithSortResponse,
              ].forEach((response) => {
                expect(response.statusCode).to.eql(403);
                expect(response.body).to.eql({
                  error: 'Forbidden',
                  message: `Failed to find backfills: Unauthorized to find rules for any rule types`,
                  statusCode: 403,
                });
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
              [
                findRule1Response,
                findRule2Response,
                findBothRulesResponse,
                findNoRulesResponse,
                findWithStartBothRulesResponse,
                findWithStartOneRuleResponse,
                findWithStartNoRulesResponse,
                findWithEndBothRulesResponse,
                findWithEndOneRuleResponse,
                findWithEndNoRulesResponse,
                findWithStartAndEndBothRulesResponse,
                findWithStartAndEndOneRuleResponse,
                findWithStartAndEndNoRulesResponse,
                findNoQueryParamsResponse,
                findWithSortAndPageResponse1,
                findWithSortAndPageResponse2,
                findWithSortResponse,
              ].forEach((response) => {
                expect(response.statusCode).to.eql(200);
              });

              const resultFindRule1 = findRule1Response.body;
              expect(resultFindRule1.page).to.eql(1);
              expect(resultFindRule1.per_page).to.eql(10);
              expect(resultFindRule1.total).to.eql(1);
              expect(resultFindRule1.data.length).to.eql(1);
              testExpectedBackfill1(resultFindRule1.data[0], backfillId1, ruleId1, space.id);

              const resultFindRule2 = findRule2Response.body;
              expect(resultFindRule2.page).to.eql(1);
              expect(resultFindRule2.per_page).to.eql(10);
              expect(resultFindRule2.total).to.eql(1);
              expect(resultFindRule2.data.length).to.eql(1);
              testExpectedBackfill2(resultFindRule2.data[0], backfillId2, ruleId2, space.id);

              const resultFindBothRules = findBothRulesResponse.body;
              expect(resultFindBothRules.page).to.eql(1);
              expect(resultFindBothRules.per_page).to.eql(10);
              expect(resultFindBothRules.total).to.eql(2);
              expect(resultFindBothRules.data.length).to.eql(2);

              testExpectedBackfill1(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindNoRules = findNoRulesResponse.body;
              expect(resultFindNoRules.page).to.eql(1);
              expect(resultFindNoRules.per_page).to.eql(10);
              expect(resultFindNoRules.total).to.eql(0);
              expect(resultFindNoRules.data).to.eql([]);

              const resultFindWithStartBothRulesResponse = findWithStartBothRulesResponse.body;
              expect(resultFindWithStartBothRulesResponse.page).to.eql(1);
              expect(resultFindWithStartBothRulesResponse.per_page).to.eql(10);
              expect(resultFindWithStartBothRulesResponse.total).to.eql(2);
              expect(resultFindWithStartBothRulesResponse.data.length).to.eql(2);
              testExpectedBackfill1(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithStartOneRuleResponse = findWithStartOneRuleResponse.body;
              expect(resultFindWithStartOneRuleResponse.page).to.eql(1);
              expect(resultFindWithStartOneRuleResponse.per_page).to.eql(10);
              expect(resultFindWithStartOneRuleResponse.total).to.eql(1);
              expect(resultFindWithStartOneRuleResponse.data.length).to.eql(1);
              testExpectedBackfill2(
                resultFindWithStartOneRuleResponse.data[0],
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithStartNoRulesResponse = findWithStartNoRulesResponse.body;
              expect(resultFindWithStartNoRulesResponse.page).to.eql(1);
              expect(resultFindWithStartNoRulesResponse.per_page).to.eql(10);
              expect(resultFindWithStartNoRulesResponse.total).to.eql(0);
              expect(resultFindWithStartNoRulesResponse.data).to.eql([]);

              const resultFindWithEndBothRulesResponse = findWithEndBothRulesResponse.body;
              expect(resultFindWithEndBothRulesResponse.page).to.eql(1);
              expect(resultFindWithEndBothRulesResponse.per_page).to.eql(10);
              expect(resultFindWithEndBothRulesResponse.total).to.eql(2);
              expect(resultFindWithEndBothRulesResponse.data.length).to.eql(2);
              testExpectedBackfill1(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithEndOneRuleResponse = findWithEndOneRuleResponse.body;
              expect(resultFindWithEndOneRuleResponse.page).to.eql(1);
              expect(resultFindWithEndOneRuleResponse.per_page).to.eql(10);
              expect(resultFindWithEndOneRuleResponse.total).to.eql(1);
              expect(resultFindWithEndOneRuleResponse.data.length).to.eql(1);
              testExpectedBackfill2(
                resultFindWithEndOneRuleResponse.data[0],
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithEndNoRulesResponse = findWithEndNoRulesResponse.body;
              expect(resultFindWithEndNoRulesResponse.page).to.eql(1);
              expect(resultFindWithEndNoRulesResponse.per_page).to.eql(10);
              expect(resultFindWithEndNoRulesResponse.total).to.eql(0);
              expect(resultFindWithEndNoRulesResponse.data).to.eql([]);

              const resultFindWithStartAndEndBothRulesResponse =
                findWithStartAndEndBothRulesResponse.body;
              expect(resultFindWithStartAndEndBothRulesResponse.page).to.eql(1);
              expect(resultFindWithStartAndEndBothRulesResponse.per_page).to.eql(10);
              expect(resultFindWithStartAndEndBothRulesResponse.total).to.eql(2);
              expect(resultFindWithStartAndEndBothRulesResponse.data.length).to.eql(2);
              testExpectedBackfill1(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindBothRules.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithStartAndEndOneRuleResponse =
                findWithStartAndEndOneRuleResponse.body;
              expect(resultFindWithStartAndEndOneRuleResponse.page).to.eql(1);
              expect(resultFindWithStartAndEndOneRuleResponse.per_page).to.eql(10);
              expect(resultFindWithStartAndEndOneRuleResponse.total).to.eql(1);
              expect(resultFindWithStartAndEndOneRuleResponse.data.length).to.eql(1);
              testExpectedBackfill2(
                resultFindWithStartAndEndOneRuleResponse.data[0],
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithStartAndEndNoRulesResponse =
                findWithStartAndEndNoRulesResponse.body;
              expect(resultFindWithStartAndEndNoRulesResponse.page).to.eql(1);
              expect(resultFindWithStartAndEndNoRulesResponse.per_page).to.eql(10);
              expect(resultFindWithStartAndEndNoRulesResponse.total).to.eql(0);
              expect(resultFindWithStartAndEndNoRulesResponse.data).to.eql([]);

              const resultFindNoQueryParams = findNoQueryParamsResponse.body;
              expect(resultFindNoQueryParams.page).to.eql(1);
              expect(resultFindNoQueryParams.per_page).to.eql(10);
              expect(resultFindNoQueryParams.total).to.eql(2);
              expect(resultFindNoQueryParams.data.length).to.eql(2);

              testExpectedBackfill1(
                resultFindNoQueryParams.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindNoQueryParams.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithSortAndPageResponse1 = findWithSortAndPageResponse1.body;
              expect(resultFindWithSortAndPageResponse1.page).to.eql(1);
              expect(resultFindWithSortAndPageResponse1.per_page).to.eql(1);
              expect(resultFindWithSortAndPageResponse1.total).to.eql(2);
              expect(resultFindWithSortAndPageResponse1.data.length).to.eql(1);
              testExpectedBackfill1(
                resultFindWithSortAndPageResponse1.data[0],
                backfillId1,
                ruleId1,
                space.id
              );

              const resultFindWithSortAndPageResponse2 = findWithSortAndPageResponse2.body;
              expect(resultFindWithSortAndPageResponse2.page).to.eql(2);
              expect(resultFindWithSortAndPageResponse2.per_page).to.eql(1);
              expect(resultFindWithSortAndPageResponse2.total).to.eql(2);
              expect(resultFindWithSortAndPageResponse2.data.length).to.eql(1);
              testExpectedBackfill2(
                resultFindWithSortAndPageResponse2.data[0],
                backfillId2,
                ruleId2,
                space.id
              );

              const resultFindWithSort = findWithSortResponse.body;
              expect(resultFindWithSort.page).to.eql(1);
              expect(resultFindWithSort.per_page).to.eql(10);
              expect(resultFindWithSort.total).to.eql(2);
              expect(resultFindWithSort.data.length).to.eql(2);

              testExpectedBackfill1(
                resultFindWithSort.data.find((b: { id: string }) => b.id === backfillId1),
                backfillId1,
                ruleId1,
                space.id
              );
              testExpectedBackfill2(
                resultFindWithSort.data.find((b: { id: string }) => b.id === backfillId2),
                backfillId2,
                ruleId2,
                space.id
              );
              const sortedStart1 = new Date(resultFindWithSort.data[0].start).valueOf();
              const sortedStart2 = new Date(resultFindWithSort.data[1].start).valueOf();
              expect(sortedStart1).to.be.greaterThan(sortedStart2);

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle find request with invalid query params appropriately', async () => {
          // invalid start time
          const response1 = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_find?start=foo`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // invalid end time
          const response2 = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(
                apiOptions.spaceId
              )}/internal/alerting/rules/backfill/_find?start=2023-10-19T12:00:00.000Z&end=foo`
            )
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password);

          // These should all be the same 400 response because it is
          // testing validation at the API level, which occurs before any
          // alerting RBAC checks
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
              expect(response1.statusCode).to.eql(400);
              expect(response1.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request query]: [start]: query start must be valid date',
              });

              expect(response2.statusCode).to.eql(400);
              expect(response2.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request query]: [end]: query end must be valid date',
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
