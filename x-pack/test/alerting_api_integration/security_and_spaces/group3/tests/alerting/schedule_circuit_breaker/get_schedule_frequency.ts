/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getUrlPrefix, getTestRuleData, ObjectRemover } from '../../../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function getScheduleFrequencyTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertest);

  describe('getScheduleFrequency', () => {
    before(async () => {
      const { body: createdRule1 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '30s' } }))
        .expect(200);
      objectRemover.add('space1', createdRule1.id, 'rule', 'alerting');

      const { body: createdRule2 } = await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '1m' } }))
        .expect(200);
      objectRemover.add('space1', createdRule2.id, 'rule', 'alerting');

      const { body: createdRule3 } = await supertest
        .post(`${getUrlPrefix('space2')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '2m' } }))
        .expect(200);
      objectRemover.add('space2', createdRule3.id, 'rule', 'alerting');

      const { body: createdRule4 } = await supertest
        .post(`${getUrlPrefix('space2')}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send(getTestRuleData({ schedule: { interval: '30s' } }))
        .expect(200);
      objectRemover.add('space2', createdRule4.id, 'rule', 'alerting');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;

      describe(scenario.id, () => {
        it('should get the total and remaining schedule frequency', async () => {
          const { body } = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/_schedule_frequency`)
            .set('kbn-xsrf', 'foo')
            .send()
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(body.total_scheduled_per_minute).eql(5.5);
              expect(body.remaining_schedules_per_minute).eql(4.5);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
