/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios, Superuser } from '../../../scenarios';
import { getUrlPrefix, resetRulesSettings } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateAlertDeletionSettingsTest({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('updateAlertDeletionSettings', () => {
    afterEach(async () => {
      await resetRulesSettings(supertestWithoutAuth, 'space1');
      await resetRulesSettings(supertestWithoutAuth, 'space2');
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle update alert deletion settings request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_alert_deletion`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              is_active_alerts_deletion_enabled: true,
              is_inactive_alerts_deletion_enabled: false,
              active_alerts_deletion_threshold: 70,
              inactive_alerts_deletion_threshold: 50,
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
                message:
                  'API [POST /internal/alerting/rules/settings/_alert_deletion] is unauthorized for user, this action is granted by the Kibana privileges [write-alert-deletion-settings]',
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.is_active_alerts_deletion_enabled).to.eql(true);
              expect(response.body.is_inactive_alerts_deletion_enabled).to.eql(false);
              expect(response.body.active_alerts_deletion_threshold).to.eql(70);
              expect(response.body.inactive_alerts_deletion_threshold).to.eql(50);
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }

    it('should error if provided with invalid inputs', async () => {
      let response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          is_active_alerts_deletion_enabled: true,
          is_inactive_alerts_deletion_enabled: false,
          active_alerts_deletion_threshold: 2000,
          inactive_alerts_deletion_threshold: 50,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        '[request body.active_alerts_deletion_threshold]: Value must be equal to or lower than [1000].'
      );

      response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          is_active_alerts_deletion_enabled: true,
          is_inactive_alerts_deletion_enabled: false,
          active_alerts_deletion_threshold: 70,
          inactive_alerts_deletion_threshold: 2000,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        '[request body.inactive_alerts_deletion_threshold]: Value must be equal to or lower than [1000].'
      );

      response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          is_active_alerts_deletion_enabled: true,
          is_inactive_alerts_deletion_enabled: false,
          active_alerts_deletion_threshold: 0,
          inactive_alerts_deletion_threshold: 20,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        '[request body.active_alerts_deletion_threshold]: Value must be equal to or greater than [1].'
      );

      response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_alert_deletion`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          is_active_alerts_deletion_enabled: true,
          is_inactive_alerts_deletion_enabled: false,
          active_alerts_deletion_threshold: 20,
          inactive_alerts_deletion_threshold: 0,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        '[request body.inactive_alerts_deletion_threshold]: Value must be equal to or greater than [1].'
      );
    });

    describe('updateAlertDeletionSettings for other spaces', () => {
      it('should update specific isolated settings depending on space', async () => {
        // Update the rules setting in space1
        const postResponse = await supertestWithoutAuth
          .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_alert_deletion`)
          .set('kbn-xsrf', 'foo')
          .auth(Superuser.username, Superuser.password)
          .send({
            is_active_alerts_deletion_enabled: true,
            is_inactive_alerts_deletion_enabled: true,
            active_alerts_deletion_threshold: 10,
            inactive_alerts_deletion_threshold: 100,
          });

        expect(postResponse.statusCode).to.eql(200);
        expect(postResponse.body.is_active_alerts_deletion_enabled).to.eql(true);
        expect(postResponse.body.is_inactive_alerts_deletion_enabled).to.eql(true);
        expect(postResponse.body.active_alerts_deletion_threshold).to.eql(10);
        expect(postResponse.body.inactive_alerts_deletion_threshold).to.eql(100);

        // Get the rules settings in space2
        const getResponse = await supertestWithoutAuth
          .get(`${getUrlPrefix('space2')}/internal/alerting/rules/settings/_alert_deletion`)
          .auth(Superuser.username, Superuser.password);

        expect(getResponse.statusCode).to.eql(200);
        expect(getResponse.body.is_active_alerts_deletion_enabled).to.eql(false);
        expect(getResponse.body.is_active_alerts_deletion_enabled).to.eql(false);
        expect(getResponse.body.active_alerts_deletion_threshold).to.eql(90);
        expect(getResponse.body.inactive_alerts_deletion_threshold).to.eql(90);
      });
    });
  });
}
