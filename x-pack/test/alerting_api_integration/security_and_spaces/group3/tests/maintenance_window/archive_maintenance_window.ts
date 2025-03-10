/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, ObjectRemover } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('archiveMaintenanceWindow', () => {
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
        it('should handle archive maintenance window request appropriately', async () => {
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

          const response = await supertestWithoutAuth
            .post(
              `${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/${
                createdMaintenanceWindow.id
              }/_archive`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({ archive: true });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [POST /internal/alerting/rules/maintenance_window/${createdMaintenanceWindow.id}/_archive] is unauthorized for user, this action is granted by the Kibana privileges [write-maintenance-window]`,
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(
                moment
                  .utc(createdMaintenanceWindow.expirationDate)
                  .isAfter(response.body.expirationDate)
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('can archive and unarchive a maintenance window', async () => {
      const space1 = UserAtSpaceScenarios[1].space.id;
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send(createParams)
        .expect(200);

      objectRemover.add(
        space1,
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      expect(createdMaintenanceWindow.status).eql('running');

      const { body: archive } = await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_archive`
        )
        .set('kbn-xsrf', 'foo')
        .send({ archive: true })
        .expect(200);

      expect(archive.status).eql('archived');

      const { body: unarchived } = await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_archive`
        )
        .set('kbn-xsrf', 'foo')
        .send({ archive: false })
        .expect(200);

      expect(unarchived.status).eql('running');
    });

    it('archiving a finished maintenance window does not change the events', async () => {
      const space1 = UserAtSpaceScenarios[1].space.id;
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: {
            ...createParams.r_rule,
            dtstart: moment.utc().subtract(1, 'day').toISOString(),
            freq: 3, // daily
            count: 4,
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

      // The finished maintenance window has a different end date for the first event
      expect(finish.events[0].lte).eql(createdMaintenanceWindow.events[0].lte);
      expect(finish.events[1].lte).not.eql(createdMaintenanceWindow.events[1].lte);
      expect(finish.events[2].lte).eql(createdMaintenanceWindow.events[2].lte);
      expect(finish.events[3].lte).eql(createdMaintenanceWindow.events[3].lte);

      const { body: archive } = await supertest
        .post(
          `${getUrlPrefix(space1)}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }/_archive`
        )
        .set('kbn-xsrf', 'foo')
        .send({ archive: true })
        .expect(200);

      // Archiving should not change the events
      expect(finish.events[0].lte).eql(archive.events[0].lte);
      expect(finish.events[1].lte).eql(archive.events[1].lte);
    });
  });
}
