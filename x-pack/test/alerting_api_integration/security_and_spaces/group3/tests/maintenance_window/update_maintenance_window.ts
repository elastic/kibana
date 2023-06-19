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

  describe('updateMaintenanceWindow', () => {
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
        it('should handle update maintenance window request appropriately', async () => {
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
              }`
            )
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              ...createParams,
              enabled: true,
              title: 'updated-title',
              duration: 2 * 60 * 60 * 1000, // 2 hrs
            });

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
              expect(response.statusCode).to.eql(200);
              expect(response.body.title).to.eql('updated-title');
              expect(response.body.duration).to.eql(7200000);
              expect(response.body.r_rule.dtstart).to.eql(createParams.r_rule.dtstart);
              expect(response.body.events.length).to.be.greaterThan(0);
              expect(response.body.status).to.eql('running');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should update fields correctly', async () => {
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          title: 'test-maintenance-window',
          duration: 60 * 60 * 1000, // 1 hr
          r_rule: {
            dtstart: new Date().toISOString(),
            tzid: 'UTC',
            freq: 2, // weekly
            count: 1,
          },
        })
        .expect(200);

      objectRemover.add(
        'space1',
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const newRRule = {
        dtstart: moment.utc().add(1, 'day').toISOString(),
        tzid: 'CET',
        freq: 3,
        count: 5,
      };

      const { body: updatedMW } = await supertest
        .post(
          `${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          title: 'test-maintenance-window-new',
          duration: 60 * 1000,
          r_rule: newRRule,
          enabled: false,
        })
        .expect(200);

      expect(updatedMW.title).eql('test-maintenance-window-new');
      expect(updatedMW.duration).eql(60 * 1000);
      expect(updatedMW.r_rule).eql(newRRule);
      expect(updatedMW.title).eql('test-maintenance-window-new');
    });

    it('should update RRule correctly when removing fields', async () => {
      const { body: createdMaintenanceWindow } = await supertest
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window`)
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: {
            ...createParams.r_rule,
            count: 1,
            until: moment.utc().add(1, 'week').toISOString(),
          },
        })
        .expect(200);

      objectRemover.add(
        'space1',
        createdMaintenanceWindow.id,
        'rules/maintenance_window',
        'alerting',
        true
      );

      const updatedRRule = {
        ...createParams.r_rule,
        count: 2,
      };

      await supertest
        .post(
          `${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window/${
            createdMaintenanceWindow.id
          }`
        )
        .set('kbn-xsrf', 'foo')
        .send({
          ...createParams,
          r_rule: updatedRRule,
        })
        .expect(200);

      const response = await supertest
        .get(`${getUrlPrefix('space1')}/internal/alerting/rules/maintenance_window/_find`)
        .set('kbn-xsrf', 'foo')
        .send({});

      expect(response.body.data[0].id).to.eql(createdMaintenanceWindow.id);
      expect(response.body.data[0].r_rule).to.eql(updatedRRule);
    });
  });
}
