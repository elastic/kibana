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
import { SuperuserAtSpace1 } from '../../../../scenarios';
import {
  getTestRuleData,
  getUrlPrefix,
  ObjectRemover,
  TaskManagerDoc,
} from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function deleteRuleForBackfillTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete rule with backfills', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    async function getAdHocRunSO(id: string) {
      const result = await es.get({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `ad_hoc_run_params:${id}`,
      });
      return result._source;
    }

    async function getScheduledTask(id: string): Promise<TaskManagerDoc> {
      const scheduledTask = await es.get<TaskManagerDoc>({
        id: `task:${id}`,
        index: '.kibana_task_manager',
      });
      return scheduledTask._source!;
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

    it('should delete backfills for rules when originating rule is deleted', async () => {
      const start1 = moment().utc().startOf('day').subtract(20, 'days').toISOString();
      const end1 = moment().utc().startOf('day').subtract(1, 'day').toISOString();
      const start2 = moment().utc().startOf('day').subtract(40, 'days').toISOString();
      const end2 = moment().utc().startOf('day').subtract(22, 'day').toISOString();
      const spaceId = SuperuserAtSpace1.space.id;

      // create 2 rules
      const rresponse1 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(getRule())
        .expect(200);
      const ruleId1 = rresponse1.body.id;

      const rresponse2 = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send(getRule())
        .expect(200);
      const ruleId2 = rresponse2.body.id;

      // schedule backfills
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix(spaceId)}/internal/alerting/rules/backfill/_schedule`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .send([
          { rule_id: ruleId1, start: start1, end: end1 },
          { rule_id: ruleId1, start: start2, end: end2 },
          { rule_id: ruleId2, start: start1, end: end1 },
        ])
        .expect(200);

      const result = response.body;
      expect(result.length).to.eql(3);
      const backfillId1 = result[0].id;
      const backfillId2 = result[1].id;
      const backfillId3 = result[2].id;

      // check that the ad hoc run SOs were created
      const adHocRunSO1 = (await getAdHocRunSO(backfillId1)) as SavedObject<AdHocRunSO>;
      const adHocRun1: AdHocRunSO = get(adHocRunSO1, 'ad_hoc_run_params');
      expect(adHocRun1).not.to.be(undefined);
      const adHocRunSO2 = (await getAdHocRunSO(backfillId2)) as SavedObject<AdHocRunSO>;
      const adHocRun2: AdHocRunSO = get(adHocRunSO2, 'ad_hoc_run_params');
      expect(adHocRun2).not.to.be(undefined);
      const adHocRunSO3 = (await getAdHocRunSO(backfillId3)) as SavedObject<AdHocRunSO>;
      const adHocRun3: AdHocRunSO = get(adHocRunSO3, 'ad_hoc_run_params');
      expect(adHocRun3).not.to.be(undefined);

      // check that the scheduled tasks were created
      const taskRecord1 = await getScheduledTask(backfillId1);
      expect(taskRecord1.type).to.eql('task');
      expect(taskRecord1.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord1.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord1.task.params)).to.eql({
        adHocRunParamsId: backfillId1,
        spaceId,
      });
      const taskRecord2 = await getScheduledTask(backfillId2);
      expect(taskRecord2.type).to.eql('task');
      expect(taskRecord2.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord2.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord2.task.params)).to.eql({
        adHocRunParamsId: backfillId2,
        spaceId,
      });
      const taskRecord3 = await getScheduledTask(backfillId3);
      expect(taskRecord3.type).to.eql('task');
      expect(taskRecord3.task.taskType).to.eql('ad_hoc_run-backfill');
      expect(taskRecord3.task.enabled).to.eql(true);
      expect(JSON.parse(taskRecord3.task.params)).to.eql({
        adHocRunParamsId: backfillId3,
        spaceId,
      });

      // delete both rules which should delete the backfills
      await supertestWithoutAuth
        .delete(`${getUrlPrefix(spaceId)}/api/alerting/rule/${ruleId1}`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .expect(204);
      await supertestWithoutAuth
        .delete(`${getUrlPrefix(spaceId)}/api/alerting/rule/${ruleId2}`)
        .set('kbn-xsrf', 'foo')
        .auth(SuperuserAtSpace1.user.username, SuperuserAtSpace1.user.password)
        .expect(204);

      // ensure the ad hoc run SOs were deleted
      try {
        await getAdHocRunSO(backfillId1);
        throw new Error(`Should have removed ad hoc run with id ${backfillId1}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      try {
        await getAdHocRunSO(backfillId2);
        throw new Error(`Should have removed ad hoc run with id ${backfillId2}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      try {
        await getAdHocRunSO(backfillId3);
        throw new Error(`Should have removed ad hoc run with id ${backfillId3}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      // ensure the tasks were deleted
      try {
        await getScheduledTask(backfillId1);
        throw new Error(`Should have removed task with id ${backfillId1}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      try {
        await getScheduledTask(backfillId2);
        throw new Error(`Should have removed tas with id ${backfillId2}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }

      try {
        await getScheduledTask(backfillId3);
        throw new Error(`Should have removed task with id ${backfillId3}`);
      } catch (e) {
        expect(e.meta.statusCode).to.eql(404);
      }
    });
  });
}
