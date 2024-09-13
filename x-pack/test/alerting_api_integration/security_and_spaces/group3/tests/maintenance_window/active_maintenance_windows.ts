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
export default function activeMaintenanceWindowTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('activeMaintenanceWindow', () => {
    const objectRemover = new ObjectRemover(supertest);
    const createParams = {
      title: 'test-maintenance-window',
      duration: 60 * 60 * 1000, // 1 hr
      r_rule: {
        dtstart: new Date().toISOString(),
        tzid: 'UTC',
        count: 10,
        freq: 2, // weekly
      },
    };
    afterEach(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle get active maintenance window request appropriately', async () => {
          // Create 2 active and 1 inactive maintenance window
          const { body: createdMaintenanceWindow1 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createParams);

          const { body: createdMaintenanceWindow2 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send(createParams);

          const { body: createdMaintenanceWindow3 } = await supertest
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window`)
            .set('kbn-xsrf', 'foo')
            .send({
              ...createParams,
              r_rule: {
                ...createParams.r_rule,
                dtstart: moment.utc().add(1, 'day').toISOString(),
              },
            });

          objectRemover.add(
            space.id,
            createdMaintenanceWindow1.id,
            'rules/maintenance_window',
            'alerting',
            true
          );
          objectRemover.add(
            space.id,
            createdMaintenanceWindow2.id,
            'rules/maintenance_window',
            'alerting',
            true
          );
          objectRemover.add(
            space.id,
            createdMaintenanceWindow3.id,
            'rules/maintenance_window',
            'alerting',
            true
          );

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/maintenance_window/_active`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({});

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
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
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.body.length).to.eql(2);
              expect(response.statusCode).to.eql(200);
              expect(response.body[0].title).to.eql('test-maintenance-window');
              expect(response.body[0].duration).to.eql(3600000);
              expect(response.body[0].r_rule.dtstart).to.eql(createParams.r_rule.dtstart);
              expect(response.body[0].events.length).to.be.greaterThan(0);
              expect(response.body[0].status).to.eql('running');

              const ids = response.body.map(
                (maintenanceWindow: { id: string }) => maintenanceWindow.id
              );
              expect(ids.sort()).to.eql(
                [createdMaintenanceWindow1.id, createdMaintenanceWindow2.id].sort()
              );
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should return active maintenance windows', async () => {
      const { body: window1 } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          duration: 30 * 60 * 1000,
          r_rule: {
            ...createParams.r_rule,
            dtstart: moment().subtract(1, 'hour').toISOString(),
          },
        })
        .expect(200);

      objectRemover.add('space1', window1.id, 'rules/maintenance_window', 'alerting', true);

      const { body: window2 } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          duration: 30 * 60 * 1000,
          r_rule: {
            ...createParams.r_rule,
            dtstart: moment().subtract(5, 'minutes').toISOString(),
          },
        })
        .expect(200);

      objectRemover.add('space1', window2.id, 'rules/maintenance_window', 'alerting', true);

      const { body: window3 } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          duration: 30 * 60 * 1000,
          r_rule: {
            ...createParams.r_rule,
            dtstart: moment().add(1, 'hour').toISOString(),
          },
        })
        .expect(200);

      objectRemover.add('space1', window3.id, 'rules/maintenance_window', 'alerting', true);

      const { body: activeWindows } = await supertest
        .get(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window/_active`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(200);

      expect(activeWindows.length).eql(1);
      expect(activeWindows[0].id).eql(window2.id);
    });

    it('should return an empty array if there are no active maintenance windows', async () => {
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: {
            ...createParams.r_rule,
            dtstart: moment.utc().add(1, 'day').toISOString(),
          },
        });

      objectRemover.add(
        'space1',
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const response = await supertest
        .get(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window/_active`)
        .set('kbn-xsrf', 'foo')
        .send({})
        .expect(200);

      expect(response.body).to.eql([]);
    });
  });
}
