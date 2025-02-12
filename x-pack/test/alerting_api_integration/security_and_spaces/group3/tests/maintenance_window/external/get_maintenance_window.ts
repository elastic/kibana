/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      start: '2026-02-07T09:17:06.790Z',
      duration: 3 * 60 * 60 * 1000, // 3 hr
      // TODO schedule schema
      // every possible field should be passed
      // recurring: {
      //   end: '',
      //   every: '',
      //   onWeekDay: '',
      //   onMonthDay: '',
      //   onMonth: '',
      //   ocurrences: 1234,
      // },
    };
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should get maintenance window correctly', async () => {
          const { body: createdMaintenanceWindow } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createParams);

          objectRemover.add(
            space.id,
            createdMaintenanceWindow.id,
            'maintenance_window',
            'alerting'
          );

          const response = await supertestWithoutAuth
            .get(
              `${getUrlPrefix(space.id)}/api/alerting/maintenance_window/${
                createdMaintenanceWindow.id
              }`
            )
            .auth(user.username, user.password);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [GET /api/alerting/maintenance_window/${createdMaintenanceWindow.id}] is unauthorized for user, this action is granted by the Kibana privileges [read-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.title).to.eql('test-maintenance-window');
              expect(response.body.status).to.eql('upcoming');
              expect(response.body.enabled).to.eql(true);

              expect(response.body.created_by).to.eql('elastic');
              expect(response.body.updated_by).to.eql('elastic');

              // TODO schedule schema
              // We want to guarantee every field is returned as expected
              expect(response.body.duration).to.eql(createParams.duration);
              expect(response.body.start).to.eql(createParams.start);
              // expect(response.body.expiration_date).to.eql('???');
              // expect(response.body.recurring.end).to.eql();
              // expect(response.body.recurring.every).to.eql();
              // expect(response.body.recurring.onWeekDay).to.eql();
              // expect(response.body.recurring.onMonthDay).to.eql();
              // expect(response.body.recurring.onMonth).to.eql();
              // expect(response.body.recurring.occurrences).to.eql();
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
