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

  const start = new Date();
  const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

  describe('getMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      schedule: {
        custom: {
          duration: '1d',
          start: start.toISOString(),
          recurring: {
            every: '2d',
            end: end.toISOString(),
            onWeekDay: ['MO', 'FR'],
          },
        },
      },
      scope: {
        query: {
          kql: "_id: '1234'",
          solutionId: 'securitySolution',
        },
      },
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
              expect(response.body.status).to.eql('running');
              expect(response.body.enabled).to.eql(true);

              expect(response.body.scope.query.kql).to.eql("_id: '1234'");
              expect(response.body.scope.query.solutionId).to.eql('securitySolution');

              expect(response.body.created_by).to.eql('elastic');
              expect(response.body.updated_by).to.eql('elastic');

              expect(response.body.schedule.custom.duration).to.eql('24h');
              expect(response.body.schedule.custom.start).to.eql(start.toISOString());
              expect(response.body.schedule.custom.recurring.every).to.eql('2d');
              expect(response.body.schedule.custom.recurring.end).to.eql(end.toISOString());
              expect(response.body.schedule.custom.recurring.onWeekDay).to.eql(['MO', 'FR']);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
