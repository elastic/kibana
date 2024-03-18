/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_QUERY_DELAY_SETTINGS } from '@kbn/alerting-plugin/common';
import { UserAtSpaceScenarios, Superuser } from '../../../scenarios';
import { getUrlPrefix, resetRulesSettings } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function updateQueryDelaySettingsTest({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('updateQueryDelaySettings', () => {
    afterEach(async () => {
      await resetRulesSettings(supertestWithoutAuth, 'space1');
      await resetRulesSettings(supertestWithoutAuth, 'space2');
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle update query delay settings request appropriately', async () => {
          const response = await supertestWithoutAuth
            .post(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_query_delay`)
            .set('kbn-xsrf', 'foo')
            .auth(user.username, user.password)
            .send({
              delay: 20,
            });

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'global_read at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: 'Forbidden',
                statusCode: 403,
              });
              break;
            case 'superuser at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.delay).to.eql(20);
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
      const response = await supertestWithoutAuth
        .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_query_delay`)
        .set('kbn-xsrf', 'foo')
        .auth(Superuser.username, Superuser.password)
        .send({
          delay: 200,
        })
        .expect(400);

      expect(response.body.message).to.eql(
        'Invalid query delay value, must be between 0 and 60, but got: 200.'
      );
    });

    describe('updateQueryDelaySettings for other spaces', () => {
      it('should update specific isolated settings depending on space', async () => {
        // Update the rules setting in space1
        const postResponse = await supertestWithoutAuth
          .post(`${getUrlPrefix('space1')}/internal/alerting/rules/settings/_query_delay`)
          .set('kbn-xsrf', 'foo')
          .auth(Superuser.username, Superuser.password)
          .send({
            delay: 20,
          });

        expect(postResponse.statusCode).to.eql(200);
        expect(postResponse.body.delay).to.eql(20);

        // Get the rules settings in space2
        const getResponse = await supertestWithoutAuth
          .get(`${getUrlPrefix('space2')}/internal/alerting/rules/settings/_query_delay`)
          .auth(Superuser.username, Superuser.password);

        expect(getResponse.statusCode).to.eql(200);
        expect(getResponse.body.delay).to.eql(DEFAULT_QUERY_DELAY_SETTINGS.delay);
      });
    });
  });
}
