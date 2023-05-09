/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function findMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('finishMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: new Date().toISOString(),
        tzid: 'UTC',
        freq: 2, // weekly
      },
    };

    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle finish maintenance window request appropriately', async () => {
          const { body: createdMaintenanceWindow } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createParams);

          objectRemover.add(
            space.id,
            createdMaintenanceWindow.id,
            'rules/maintenance_window',
            'alerting',
            true
          );

          expect(createdMaintenanceWindow.status).to.eql('running');

          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/${
                createdMaintenanceWindow.id
              }/_finish`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send();

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Forbidden',
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.body.status).to.eql('upcoming');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should error when trying to finish a finished maintenance window', async () => {
      const space1 = UserAtSpaceScenarios[1].space.id;
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: {
            ...createParams.r_rule,
            count: 1,
          },
        })
        .expect(200);

      objectRemover.add(
        space1,
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const { body: finish } = await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_finish`
        )
        .set('kbn-xsrf', 'foo')
        .send()
        .expect(200);
      expect(finish.status).eql('finished');

      // Cant finish a finished maintenance window
      await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_finish`
        )
        .set('kbn-xsrf', 'foo')
        .send()
        .expect(400);
    });

    it('should error when trying to finish a upcoming maintenance window', async () => {
      const space1 = UserAtSpaceScenarios[1].space.id;
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: {
            ...createParams.r_rule,
            count: 2, // 2 occurrences
          },
        })
        .expect(200);

      objectRemover.add(
        space1,
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const { body: finish } = await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_finish`
        )
        .set('kbn-xsrf', 'foo')
        .send()
        .expect(200);

      // Status now upcoming, new start and end dates reflect the upcoming event
      expect(finish.status).eql('upcoming');
      expect(finish.event_start_time).eql(createdMaintenanceWindow.events[1].gte);
      expect(finish.event_end_time).eql(createdMaintenanceWindow.events[1].lte);

      // Cannot finish an upcoming maintenance window
      await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_finish`
        )
        .set('kbn-xsrf', 'foo')
        .send()
        .expect(400);
    });
  });
}
