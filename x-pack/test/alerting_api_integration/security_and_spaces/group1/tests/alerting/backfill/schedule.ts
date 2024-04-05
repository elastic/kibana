/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERTING_CASES_SAVED_OBJECT_INDEX, SavedObject } from '@kbn/core-saved-objects-server';
import { AdHocRunSO } from '@kbn/alerting-plugin/server/data/ad_hoc_run/types';
import { get } from 'lodash';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server/saved_objects';
import { asyncForEach } from '../../../../../../functional/services/transform/api';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { checkAAD, getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function scheduleBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('schedule backfill', () => {
    let backfillIds: Array<{ id: string; spaceId: string }> = [];
    const objectRemover = new ObjectRemover(supertest);

    afterEach(async () => {
      asyncForEach(backfillIds, async ({ id, spaceId }: { id: string; spaceId: string }) => {
        await supertest
          .delete(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/${id}`)
          .set('kbn-xsrf', 'foo');
      });
      backfillIds = [];
      await objectRemover.removeAll();
    });

    async function getAdHocRunSO(id: string) {
      const result = await es.get({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `ad_hoc_run_params:${id}`,
      });
      return result._source;
    }

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

    function getLifecycleRule(overwrites = {}) {
      return getTestRuleData({
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
        it('should handle scheduling backfill job requests appropriately', async () => {
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

          // schedule backfill for both rules as current user
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: ruleId1,
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-25T12:00:00.000Z',
              },
              { rule_id: ruleId2, start: '2023-10-19T12:00:00.000Z' },
            ]);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
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
              expect(response.statusCode).to.eql(200);
              const result = response.body;

              expect(result.length).to.eql(2);
              expect(typeof result[0].id).to.be('string');
              backfillIds.push({ id: result[0].id, spaceId: apiOptions.spaceId });
              expect(result[0].duration).to.eql('12h');
              expect(result[0].enabled).to.eql(true);
              expect(result[0].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[0].end).to.eql('2023-10-25T12:00:00.000Z');
              expect(result[0].status).to.eql('pending');
              expect(result[0].space_id).to.eql(space.id);
              expect(typeof result[0].created_at).to.be('string');
              testExpectedRule(result[0], ruleId1, false);
              expect(result[0].schedule).to.eql([
                {
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-21T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-22T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-22T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-23T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-23T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-24T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-24T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-25T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  run_at: '2023-10-25T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              expect(typeof result[1].id).to.be('string');
              backfillIds.push({ id: result[1].id, spaceId: apiOptions.spaceId });
              expect(result[1].duration).to.eql('12h');
              expect(result[1].enabled).to.eql(true);
              expect(result[1].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[1].end).to.eql('2023-10-20T00:00:00.000Z');
              expect(result[1].status).to.eql('pending');
              expect(result[1].space_id).to.eql(space.id);
              expect(typeof result[1].created_at).to.be('string');
              testExpectedRule(result[1], ruleId2, false);
              expect(result[1].schedule).to.eql([
                {
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              // check that the ad hoc run SO was created
              const adHocRunSO1 = (await getAdHocRunSO(result[0].id)) as SavedObject<AdHocRunSO>;
              const adHocRun1: AdHocRunSO = get(adHocRunSO1, 'ad_hoc_run_params');
              const adHocRunSO2 = (await getAdHocRunSO(result[1].id)) as SavedObject<AdHocRunSO>;
              const adHocRun2: AdHocRunSO = get(adHocRunSO2, 'ad_hoc_run_params');

              expect(typeof adHocRun1.apiKeyId).to.be('string');
              expect(typeof adHocRun1.apiKeyToUse).to.be('string');
              expect(typeof adHocRun1.createdAt).to.be('string');
              expect(adHocRun1.duration).to.eql('12h');
              expect(adHocRun1.enabled).to.eql(true);
              expect(adHocRun1.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun1.end).to.eql('2023-10-25T12:00:00.000Z');
              expect(adHocRun1.status).to.eql('pending');
              expect(adHocRun1.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun1, undefined, true);
              expect(adHocRun1.schedule).to.eql([
                {
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-21T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-22T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-22T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-23T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-23T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-24T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-24T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-25T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
                {
                  runAt: '2023-10-25T12:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              expect(typeof adHocRun2.apiKeyId).to.be('string');
              expect(typeof adHocRun2.apiKeyToUse).to.be('string');
              expect(typeof adHocRun2.createdAt).to.be('string');
              expect(adHocRun2.duration).to.eql('12h');
              expect(adHocRun2.enabled).to.eql(true);
              expect(adHocRun2.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun2.end).to.eql('2023-10-20T00:00:00.000Z');
              expect(adHocRun2.status).to.eql('pending');
              expect(adHocRun2.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun2, undefined, true);
              expect(adHocRun2.schedule).to.eql([
                {
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              // check references are stored correctly
              expect(adHocRunSO1.references).to.eql([{ id: ruleId1, name: 'rule', type: 'alert' }]);
              expect(adHocRunSO2.references).to.eql([{ id: ruleId2, name: 'rule', type: 'alert' }]);

              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[0].id,
              });
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[1].id,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle scheduling multiple backfill job requests for a single rule appropriately', async () => {
          // create 1 rule as current user
          const rresponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule())
            .expect(200);
          const ruleId = rresponse.body.id;
          objectRemover.add(apiOptions.spaceId, ruleId, 'rule', 'alerting');

          // schedule 3 backfill jobs for rule as current user
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: ruleId,
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-21T12:00:00.000Z',
              },
              { rule_id: ruleId, start: '2023-10-18T12:00:00.000Z' },
              {
                rule_id: ruleId,
                start: '2023-12-30T12:00:00.000Z',
                end: '2024-01-01T12:00:00.000Z',
              },
            ]);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
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
              expect(response.statusCode).to.eql(200);
              const result = response.body;

              expect(result.length).to.eql(3);
              expect(typeof result[0].id).to.be('string');
              backfillIds.push({ id: result[0].id, spaceId: apiOptions.spaceId });
              expect(result[0].duration).to.eql('12h');
              expect(result[0].enabled).to.eql(true);
              expect(result[0].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[0].end).to.eql('2023-10-21T12:00:00.000Z');
              expect(result[0].status).to.eql('pending');
              expect(result[0].space_id).to.eql(space.id);
              expect(typeof result[0].created_at).to.be('string');
              testExpectedRule(result[0], ruleId, false);
              expect(result[0].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-10-21T12:00:00.000Z',
                  status: 'pending',
                },
              ]);

              expect(typeof result[1].id).to.be('string');
              backfillIds.push({ id: result[1].id, spaceId: apiOptions.spaceId });
              expect(result[1].duration).to.eql('12h');
              expect(result[1].enabled).to.eql(true);
              expect(result[1].start).to.eql('2023-10-18T12:00:00.000Z');
              expect(result[1].end).to.eql('2023-10-19T00:00:00.000Z');
              expect(result[1].status).to.eql('pending');
              expect(result[1].space_id).to.eql(space.id);
              expect(typeof result[1].created_at).to.be('string');
              testExpectedRule(result[1], ruleId, false);
              expect(result[1].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-10-19T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              expect(typeof result[2].id).to.be('string');
              backfillIds.push({ id: result[2].id, spaceId: apiOptions.spaceId });
              expect(result[2].duration).to.eql('12h');
              expect(result[2].enabled).to.eql(true);
              expect(result[2].start).to.eql('2023-12-30T12:00:00.000Z');
              expect(result[2].end).to.eql('2024-01-01T12:00:00.000Z');
              expect(result[2].status).to.eql('pending');
              expect(result[2].space_id).to.eql(space.id);
              expect(typeof result[2].created_at).to.be('string');
              testExpectedRule(result[2], ruleId, false);
              expect(result[2].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-12-31T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-12-31T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2024-01-01T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2024-01-01T12:00:00.000Z',
                  status: 'pending',
                },
              ]);

              // check that the ad hoc run SO was created
              const adHocRunSO1 = (await getAdHocRunSO(result[0].id)) as SavedObject<AdHocRunSO>;
              const adHocRun1: AdHocRunSO = get(adHocRunSO1, 'ad_hoc_run_params');
              const adHocRunSO2 = (await getAdHocRunSO(result[1].id)) as SavedObject<AdHocRunSO>;
              const adHocRun2: AdHocRunSO = get(adHocRunSO2, 'ad_hoc_run_params');
              const adHocRunSO3 = (await getAdHocRunSO(result[2].id)) as SavedObject<AdHocRunSO>;
              const adHocRun3: AdHocRunSO = get(adHocRunSO3, 'ad_hoc_run_params');

              expect(typeof adHocRun1.apiKeyId).to.be('string');
              expect(typeof adHocRun1.apiKeyToUse).to.be('string');
              expect(typeof adHocRun1.createdAt).to.be('string');
              expect(adHocRun1.duration).to.eql('12h');
              expect(adHocRun1.enabled).to.eql(true);
              expect(adHocRun1.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun1.end).to.eql('2023-10-21T12:00:00.000Z');
              expect(adHocRun1.status).to.eql('pending');
              expect(adHocRun1.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun1, undefined, true);
              expect(adHocRun1.schedule).to.eql([
                {
                  interval: '12h',
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-10-21T12:00:00.000Z',
                  status: 'pending',
                },
              ]);

              expect(typeof adHocRun2.apiKeyId).to.be('string');
              expect(typeof adHocRun2.apiKeyToUse).to.be('string');
              expect(typeof adHocRun2.createdAt).to.be('string');
              expect(adHocRun2.duration).to.eql('12h');
              expect(adHocRun2.enabled).to.eql(true);
              expect(adHocRun2.start).to.eql('2023-10-18T12:00:00.000Z');
              expect(adHocRun2.end).to.eql('2023-10-19T00:00:00.000Z');
              expect(adHocRun2.status).to.eql('pending');
              expect(adHocRun2.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun2, undefined, true);
              expect(adHocRun2.schedule).to.eql([
                {
                  interval: '12h',
                  runAt: '2023-10-19T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              expect(typeof adHocRun3.apiKeyId).to.be('string');
              expect(typeof adHocRun3.apiKeyToUse).to.be('string');
              expect(typeof adHocRun3.createdAt).to.be('string');
              expect(adHocRun3.duration).to.eql('12h');
              expect(adHocRun3.enabled).to.eql(true);
              expect(adHocRun3.start).to.eql('2023-12-30T12:00:00.000Z');
              expect(adHocRun3.end).to.eql('2024-01-01T12:00:00.000Z');
              expect(adHocRun3.status).to.eql('pending');
              expect(adHocRun3.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun3, undefined, true);
              expect(adHocRun3.schedule).to.eql([
                {
                  interval: '12h',
                  runAt: '2023-12-31T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-12-31T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2024-01-01T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2024-01-01T12:00:00.000Z',
                  status: 'pending',
                },
              ]);

              // check references are stored correctly
              expect(adHocRunSO1.references).to.eql([{ id: ruleId, name: 'rule', type: 'alert' }]);
              expect(adHocRunSO2.references).to.eql([{ id: ruleId, name: 'rule', type: 'alert' }]);
              expect(adHocRunSO3.references).to.eql([{ id: ruleId, name: 'rule', type: 'alert' }]);

              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[0].id,
              });
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[1].id,
              });
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[2].id,
              });

              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle schedule request with invalid params appropriately', async () => {
          // invalid start time
          const response1 = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: 'abc',
                start: 'foo',
              },
            ]);

          // invalid end time
          const response2 = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: 'abc',
                start: '2023-10-19T12:00:00.000Z',
                end: 'foo',
              },
            ]);

          // end time equals start time
          const response3 = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: 'abc',
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-19T12:00:00.000Z',
              },
            ]);

          // end time is before start time
          const response4 = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: 'abc',
                start: '2023-10-19T12:00:00.000Z',
                end: '2020-10-19T12:00:00.000Z',
              },
            ]);

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
                message: '[request body.0]: Backfill start must be valid date',
              });

              expect(response2.statusCode).to.eql(400);
              expect(response2.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.0]: Backfill end must be valid date',
              });

              expect(response3.statusCode).to.eql(400);
              expect(response3.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.0]: Backfill end must be greater than backfill start',
              });

              expect(response4.statusCode).to.eql(400);
              expect(response4.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: '[request body.0]: Backfill end must be greater than backfill start',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle schedule request with no matching rules appropriately', async () => {
          // schedule backfill for non-existent rule
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: 'ac612b4b-5d0c-46d7-855a-98dd920e3aa6',
                start: '2023-10-19T12:00:00.000Z',
              },
            ]);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
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
              expect(response.statusCode).to.eql(400);
              expect(response.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message:
                  'No rules matching ids ac612b4b-5d0c-46d7-855a-98dd920e3aa6 found to schedule backfill',
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should handle schedule request where some requests succeed and some requests fail appropriately', async () => {
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

          // create lifecycle rule
          const lifecycleresponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getLifecycleRule())
            .expect(200);
          const lifecycleRuleId = lifecycleresponse.body.id;
          objectRemover.add(apiOptions.spaceId, lifecycleRuleId, 'rule', 'alerting');

          // create disabled rule
          const disabledresponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule({ enabled: false }))
            .expect(200);
          const disabledRuleId = disabledresponse.body.id;
          objectRemover.add(apiOptions.spaceId, disabledRuleId, 'rule', 'alerting');

          // create rule to be deleted
          const deletedresponse = await supertest
            .post(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(getRule({ enabled: false }))
            .expect(200);
          const deletedRuleId = deletedresponse.body.id;

          // delete the deleted rule
          await supertest
            .delete(`${getUrlPrefix(apiOptions.spaceId)}/api/alerting/rule/${deletedRuleId}`)
            .set('kbn-xsrf', 'foo')
            .expect(204);

          // schedule backfill as current user
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(apiOptions.spaceId)}/internal/alerting/rules/backfill/_schedule`)
            .set('kbn-xsrf', 'foo')
            .auth(apiOptions.username, apiOptions.password)
            .send([
              {
                rule_id: ruleId1,
                start: '2023-10-19T12:00:00.000Z',
                end: '2023-10-21T00:00:00.000Z',
              },
              { rule_id: ruleId2, start: '2023-10-19T12:00:00.000Z' },
              { rule_id: lifecycleRuleId, start: '2023-10-19T12:00:00.000Z' },
              { rule_id: disabledRuleId, start: '2023-10-19T12:00:00.000Z' },
              { rule_id: deletedRuleId, start: '2023-10-19T12:00:00.000Z' },
              { rule_id: ruleId1, start: '2023-10-19T12:00:00.000Z' },
            ]);

          switch (scenario.id) {
            // User can't do anything in this space
            case 'no_kibana_privileges at space1':
            // User has no privileges in this space
            case 'space_1_all at space2':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `Unauthorized to find rules for any rule types`,
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
              expect(response.statusCode).to.eql(200);
              const result = response.body;

              expect(result.length).to.eql(6);

              // successful schedule
              expect(typeof result[0].id).to.be('string');
              backfillIds.push({ id: result[0].id, spaceId: apiOptions.spaceId });
              expect(result[0].duration).to.eql('12h');
              expect(result[0].enabled).to.eql(true);
              expect(result[0].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[0].end).to.eql('2023-10-21T00:00:00.000Z');
              expect(result[0].status).to.eql('pending');
              expect(result[0].space_id).to.eql(space.id);
              expect(typeof result[0].created_at).to.be('string');
              testExpectedRule(result[0], ruleId1, false);
              expect(result[0].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  run_at: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              // successful schedule
              expect(typeof result[1].id).to.be('string');
              backfillIds.push({ id: result[1].id, spaceId: apiOptions.spaceId });
              expect(result[1].duration).to.eql('12h');
              expect(result[1].enabled).to.eql(true);
              expect(result[1].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[1].end).to.eql('2023-10-20T00:00:00.000Z');
              expect(result[1].status).to.eql('pending');
              expect(result[1].space_id).to.eql(space.id);
              expect(typeof result[1].created_at).to.be('string');
              testExpectedRule(result[1], ruleId2, false);
              expect(result[1].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              // error scheduling due to unsupported rule type
              expect(result[2]).to.eql({
                error: {
                  error: 'Bad Request',
                  message: `Rule type "test.noop" for rule ${lifecycleRuleId} is not supported`,
                },
              });

              // error scheduling due to disabled rule
              expect(result[3]).to.eql({
                error: {
                  error: 'Bad Request',
                  message: `Rule ${disabledRuleId} is disabled`,
                },
              });

              // error scheduling due to deleted rule
              expect(result[4]).to.eql({
                error: {
                  error: 'Not Found',
                  message: `Saved object [alert/${deletedRuleId}] not found`,
                },
              });

              // successful schedule
              expect(typeof result[5].id).to.be('string');
              backfillIds.push({ id: result[5].id, spaceId: apiOptions.spaceId });
              expect(result[5].duration).to.eql('12h');
              expect(result[5].enabled).to.eql(true);
              expect(result[5].start).to.eql('2023-10-19T12:00:00.000Z');
              expect(result[5].end).to.eql('2023-10-20T00:00:00.000Z');
              expect(result[5].status).to.eql('pending');
              expect(result[5].space_id).to.eql(space.id);
              expect(typeof result[5].created_at).to.be('string');
              testExpectedRule(result[5], ruleId1, false);
              expect(result[5].schedule).to.eql([
                {
                  interval: '12h',
                  run_at: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              // check that the expected ad hoc run SOs were created
              const adHocRunSO1 = (await getAdHocRunSO(result[0].id)) as SavedObject<AdHocRunSO>;
              const adHocRun1: AdHocRunSO = get(adHocRunSO1, 'ad_hoc_run_params');
              const adHocRunSO2 = (await getAdHocRunSO(result[1].id)) as SavedObject<AdHocRunSO>;
              const adHocRun2: AdHocRunSO = get(adHocRunSO2, 'ad_hoc_run_params');
              const adHocRunSO3 = (await getAdHocRunSO(result[5].id)) as SavedObject<AdHocRunSO>;
              const adHocRun3: AdHocRunSO = get(adHocRunSO3, 'ad_hoc_run_params');

              expect(typeof adHocRun1.apiKeyId).to.be('string');
              expect(typeof adHocRun1.apiKeyToUse).to.be('string');
              expect(typeof adHocRun1.createdAt).to.be('string');
              expect(adHocRun1.duration).to.eql('12h');
              expect(adHocRun1.enabled).to.eql(true);
              expect(adHocRun1.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun1.end).to.eql('2023-10-21T00:00:00.000Z');
              expect(adHocRun1.status).to.eql('pending');
              expect(adHocRun1.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun1, undefined, true);
              expect(adHocRun1.schedule).to.eql([
                {
                  interval: '12h',
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-10-20T12:00:00.000Z',
                  status: 'pending',
                },
                {
                  interval: '12h',
                  runAt: '2023-10-21T00:00:00.000Z',
                  status: 'pending',
                },
              ]);

              expect(typeof adHocRun2.apiKeyId).to.be('string');
              expect(typeof adHocRun2.apiKeyToUse).to.be('string');
              expect(typeof adHocRun2.createdAt).to.be('string');
              expect(adHocRun2.duration).to.eql('12h');
              expect(adHocRun2.enabled).to.eql(true);
              expect(adHocRun2.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun2.end).to.eql('2023-10-20T00:00:00.000Z');
              expect(adHocRun2.status).to.eql('pending');
              expect(adHocRun2.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun2, undefined, true);
              expect(adHocRun2.schedule).to.eql([
                {
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              expect(typeof adHocRun3.apiKeyId).to.be('string');
              expect(typeof adHocRun3.apiKeyToUse).to.be('string');
              expect(typeof adHocRun3.createdAt).to.be('string');
              expect(adHocRun3.duration).to.eql('12h');
              expect(adHocRun3.enabled).to.eql(true);
              expect(adHocRun3.start).to.eql('2023-10-19T12:00:00.000Z');
              expect(adHocRun3.end).to.eql('2023-10-20T00:00:00.000Z');
              expect(adHocRun3.status).to.eql('pending');
              expect(adHocRun3.spaceId).to.eql(space.id);
              testExpectedRule(adHocRun3, undefined, true);
              expect(adHocRun3.schedule).to.eql([
                {
                  runAt: '2023-10-20T00:00:00.000Z',
                  status: 'pending',
                  interval: '12h',
                },
              ]);

              // check references are stored correctly
              expect(adHocRunSO1.references).to.eql([{ id: ruleId1, name: 'rule', type: 'alert' }]);
              expect(adHocRunSO2.references).to.eql([{ id: ruleId2, name: 'rule', type: 'alert' }]);
              expect(adHocRunSO3.references).to.eql([{ id: ruleId1, name: 'rule', type: 'alert' }]);

              // Ensure AAD isn't broken
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[0].id,
              });
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[1].id,
              });
              await checkAAD({
                supertest,
                spaceId: space.id,
                type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
                id: result[5].id,
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
