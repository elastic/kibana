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
export default function updateFlappingSettingsTest({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('updateFlappingSettings', () => {
    afterEach(async () => {
      await resetRulesSettings(supertestWithoutAuth, 'space1');
      await resetRulesSettings(supertestWithoutAuth, 'space2');
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle update flapping settings request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              enabled: false,
              look_back_window: 20,
              status_change_threshold: 20,
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
              expect(response.body.enabled).to.eql(false);
              expect(response.body.look_back_window).to.eql(20);
              expect(response.body.status_change_threshold).to.eql(20);
              expect(response.body.updated_by).to.eql(user.username);
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
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          enabled: true,
          look_back_window: 200,
          status_change_threshold: 200,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        'Invalid lookBackWindow value, must be between 2 and 20, but got: 200.'
      );

      response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          enabled: true,
          look_back_window: 20,
          status_change_threshold: 200,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        'Invalid statusChangeThreshold value, must be between 2 and 20, but got: 200.'
      );

      response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_flapping`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          enabled: true,
          look_back_window: 5,
          status_change_threshold: 10,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        'Invalid values,lookBackWindow (5) must be equal to or greater than statusChangeThreshold (10).'
      );
    });

    describe('updateFlappingSettings for other spaces', () => {
      it('should update specific isolated settings depending on space', async () => {
        // Update the rules setting in space1
        const postResponse = await supertestWithoutAuth
          .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_flapping`)
          .set('kbn-xsrf', 'foo')
          .auth(Superuser.username, Superuser.password)
          .send({
            enabled: false,
            look_back_window: 20,
            status_change_threshold: 20,
          });

        expect(postResponse.statusCode).to.eql(200);
        expect(postResponse.body.enabled).to.eql(false);
        expect(postResponse.body.look_back_window).to.eql(20);
        expect(postResponse.body.status_change_threshold).to.eql(20);

        // Get the rules settings in space2
        const getResponse = await supertestWithoutAuth
          .get(`${getUrlPrefix('space2')}/internal/alerting/rules/settings/_flapping`)
          .auth(Superuser.username, Superuser.password);

        expect(getResponse.statusCode).to.eql(200);
        expect(getResponse.body.enabled).to.eql(true);
        expect(getResponse.body.look_back_window).to.eql(20);
        expect(getResponse.body.status_change_threshold).to.eql(4);
      });
    });
  });
}
