/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { UserAtSpaceScenarios, Superuser } from '../../../scenarios';
import { getUrlPrefix } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getFlappingSettingsTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const resetRulesSettings = (space: string) => {
    return supertestWithoutAuth
      .post(`${getUrlPrefix(space)}/internal/alerting/rules/settings/_flapping`)
      .set('kbn-xsrf', 'foo')
      .auth(Superuser.username, Superuser.password)
      .send(DEFAULT_FLAPPING_SETTINGS);
  };

  describe('getFlappingSettings', () => {
    afterEach(async () => {
      await resetRulesSettings('space1');
      await resetRulesSettings('space2');
    });

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should handle get flapping settings request appropriately', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_flapping`)
            .auth(user.username, user.password);

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
              expect(response.statusCode).to.eql(200);
              expect(response.body.enabled).to.eql(DEFAULT_FLAPPING_SETTINGS.enabled);
              expect(response.body.lookBackWindow).to.eql(DEFAULT_FLAPPING_SETTINGS.lookBackWindow);
              expect(response.body.statusChangeThreshold).to.eql(
                DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold
              );
              expect(response.body.createdBy).to.be.a('string');
              expect(response.body.updatedBy).to.be.a('string');
              expect(Date.parse(response.body.createdAt)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updatedAt)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
