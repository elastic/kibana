/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import { ALERTING_CASES_SAVED_OBJECT_INDEX, SavedObject } from '@kbn/core-saved-objects-server';
import { AdHocRunSO } from '@kbn/alerting-plugin/server/data/ad_hoc_run/types';
import { get } from 'lodash';
import {
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '@kbn/alerting-plugin/server/saved_objects';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';
import { SuperuserAtSpace1 } from '../../../../scenarios';
import {
  getEventLog,
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
} from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function apiKeyBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('backfill api key invalidation', () => {
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await runInvalidateTask();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
    });

    async function getAdHocRunSO(id: string) {
      const result = await es.get({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `ad_hoc_run_params:${id}`,
      });
      return result._source;
    }

    async function runInvalidateTask() {
      // Invoke the invalidate API key task
      await supertest
        .post('/api/alerts_fixture/api_key_invalidation/_run_soon')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    }

    async function getApiKeysPendingInvalidation() {
      const result = await es.search({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        body: {
          query: {
            term: { type: 'api_key_pending_invalidation' },
          },
        },
      });
      return result.hits.hits.map((hit) => hit._source);
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
        expect(result.rule.apiKeyOwner).to.eql('superuser');
        expect(result.rule.apiKeyCreatedByUser).to.eql(false);
        expect(result.rule.createdBy).to.eql('superuser');
        expect(result.rule.updatedBy).to.eql('superuser');
        expect(typeof result.rule.createdAt).to.be('string');
        expect(typeof result.rule.updatedAt).to.be('string');
      }
    }

    it('should wait to invalidate API key until backfill for rule is complete', async () => {
      const start = moment().utc().startOf('day').subtract(13, 'days').toISOString();
      const end = moment().utc().startOf('day').subtract(4, 'day').toISOString();
      const spaceId = SuperuserAtSpace1.space.id;

      // create 2 rules
      const rresponse1 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(getRule())
        .expect(200);
      const ruleId1 = rresponse1.body.id;
      objectRemover.add(spaceId, ruleId1, 'rule', 'alerting');

      const rresponse2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(getRule())
        .expect(200);
      const ruleId2 = rresponse2.body.id;
      objectRemover.add(spaceId, ruleId2, 'rule', 'alerting');

      // wait for each rule to run once
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId1,
          provider: 'alerting',
          actions: new Map([['execute', { equal: 1 }]]),
        });
      });
      await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId,
          type: RULE_SAVED_OBJECT_TYPE,
          id: ruleId2,
          provider: 'alerting',
          actions: new Map([['execute', { equal: 1 }]]),
        });
      });

      // schedule backfill for rule 1
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([{ rule_id: ruleId1, start, end }])
        .expect(200);

      const result = response.body;
      const backfillId = result[0].id;
      const schedule = result[0].schedule;

      // check that the ad hoc run SO was created
      const adHocRunSO1 = (await getAdHocRunSO(result[0].id)) as SavedObject<AdHocRunSO>;
      const adHocRun1: AdHocRunSO = get(adHocRunSO1, 'ad_hoc_run_params')!;
      expect(typeof adHocRun1.apiKeyId).to.be('string');
      expect(typeof adHocRun1.apiKeyToUse).to.be('string');
      expect(typeof adHocRun1.createdAt).to.be('string');
      expect(adHocRun1.duration).to.eql('12h');
      expect(adHocRun1.enabled).to.eql(true);
      expect(adHocRun1.start).to.eql(start);
      expect(adHocRun1.end).to.eql(end);
      expect(adHocRun1.status).to.eql('pending');
      expect(adHocRun1.spaceId).to.eql(spaceId);
      testExpectedRule(adHocRun1, undefined, true);

      let currentStart = start;
      adHocRun1.schedule.forEach((sched: any) => {
        expect(sched.interval).to.eql('12h');
        expect(sched.status).to.eql('pending');
        const runAt = moment(currentStart).add(12, 'hours').toISOString();
        expect(sched.runAt).to.eql(runAt);
        currentStart = runAt;
      });

      // update API key both rules which will mark the api keys for invalidation
      await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule/${ruleId1}/_update_api_key`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .expect(204);

      await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule/${ruleId2}/_update_api_key`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .expect(204);

      // get the "api_key_pending_invalidation" saved objects
      await retry.try(async () => {
        const results = await getApiKeysPendingInvalidation();
        expect(results.length).to.eql(2);
        return results;
      });

      // invoke the invalidate task
      await runInvalidateTask();

      // wait until one of the api_key_pending_invalidation SOs is deleted
      await retry.try(async () => {
        const results = await getApiKeysPendingInvalidation();
        expect(results.length).to.eql(1);
        return results;
      });

      // wait for the backfill to complete and periodically check that one API key is still awaiting invalidation
      const executeBackfillEvents: IValidatedEvent[] = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId,
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          id: backfillId,
          provider: 'alerting',
          actions: new Map([['execute-backfill', { equal: schedule.length }]]),
        });
      });

      // all the executions should have ended in success
      for (const e of executeBackfillEvents) {
        expect(e?.event?.outcome).to.eql('success');
      }

      // wait for all the ad hoc run SO to be deleted
      await retry.try(async () => {
        try {
          // throws when not found
          await getAdHocRunSO(backfillId);
          throw new Error('should have thrown');
        } catch (e) {
          expect(e.message).not.to.eql('should have thrown');
        }
      });

      // pending API key should now be deleted because backfill is done
      await retry.try(async () => {
        // invoke the invalidate task
        await runInvalidateTask();

        const results = await getApiKeysPendingInvalidation();
        expect(results.length).to.eql(0);
        return results;
      });
    });
  });
}
