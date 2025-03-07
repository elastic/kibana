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
export default function createMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe.only('updateMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createRequestBody = {
      title: 'test-maintenance-window',
      enabled: false,
      start: '2026-02-07T09:17:06.790Z',
      duration: 60 * 60 * 1000, // 1 hr
      scope: { query: { kql: "_id: '1234'" } },
    };

    const updateRequestBody = {
      title: 'updated-maintenance-window',
      enabled: true,

      // TODO categoryIds
      // Updating the scope depends on the removal of categoryIds from the client
      // See: https://github.com/elastic/kibana/issues/197530
      // scope: { query: { kql: "_id: '12345'" } },

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
        it('should handle an update maintenance window request appropriately', async () => {
          const { body: createdMaintenanceWindow } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createRequestBody);

          if (createdMaintenanceWindow.id) {
            objectRemover.add(
              space.id,
              createdMaintenanceWindow.id,
              'rules/maintenance_window',
              'alerting',
              true
            );
          }

          const response = await supertestWithoutAuth
            .patch(
              `${getUrlPrefix(space.id)}/api/alerting/maintenance_window/${
                createdMaintenanceWindow.id
              }`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send(updateRequestBody);

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [PATCH /api/alerting/maintenance_window/${createdMaintenanceWindow.id}] is unauthorized for user, this action is granted by the Kibana privileges [write-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.title).to.eql('updated-maintenance-window');
              expect(response.body.enabled).to.eql(true);

              expect(response.body.updated_by).to.eql(scenario.user.username);

              // TODO schedule schema
              // We want to guarantee every field is returned as expected
              // expect(response.body.duration).to.eql(updateRequestBody.schedule.custom.duration);
              // expect(response.body.start).to.eql(updateRequestBody.schedule.custom.start);
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

    it('should throw if creating maintenance window with invalid scoped query', async () => {
      await supertest
        .post(`${getUrlPrefix('space1')}/api/alerting/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...updateRequestBody,
          scope: {
            query: {
              kql: 'invalid_kql:',
            },
          },
        })
        .expect(400);
    });
  });
}
