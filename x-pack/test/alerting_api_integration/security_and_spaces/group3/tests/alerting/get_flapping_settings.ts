/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, resetRulesSettings } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getFlappingSettingsTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getFlappingSettings', () => {
    beforeEach(async () => {
      await resetRulesSettings(supertestWithoutAuth, 'space1');
      await resetRulesSettings(supertestWithoutAuth, 'space2');
    });

    after(async () => {
      await resetRulesSettings(supertestWithoutAuth, 'space1');
      await resetRulesSettings(supertestWithoutAuth, 'space2');
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
                message:
                  'API [GET /internal/alerting/rules/settings/_flapping] is unauthorized for user, this action is granted by the Kibana privileges [read-flapping-settings]',
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.enabled).to.eql(DEFAULT_FLAPPING_SETTINGS.enabled);
              expect(response.body.look_back_window).to.eql(
                DEFAULT_FLAPPING_SETTINGS.lookBackWindow
              );
              expect(response.body.status_change_threshold).to.eql(
                DEFAULT_FLAPPING_SETTINGS.statusChangeThreshold
              );
              expect(response.body.updated_by).to.be.a('string');
              expect(Date.parse(response.body.created_at)).to.be.greaterThan(0);
              expect(Date.parse(response.body.updated_at)).to.be.greaterThan(0);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
