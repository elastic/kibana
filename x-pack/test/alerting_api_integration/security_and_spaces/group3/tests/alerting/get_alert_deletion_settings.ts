/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_ALERT_DELETION_SETTINGS } from '@kbn/alerting-plugin/common';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, resetRulesSettings } from '../../../../common/lib';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getAlertDeletionSettingsTests({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('getAlertDeletionSettings', () => {
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
        it('should handle get alert deletion request appropriately', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/internal/alerting/rules/settings/_alert_deletion`)
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
                  'API [GET /internal/alerting/rules/settings/_alert_deletion] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-deletion-settings]',
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              expect(response.body.is_active_alerts_deletion_enabled).to.eql(
                DEFAULT_ALERT_DELETION_SETTINGS.isActiveAlertsDeletionEnabled
              );
              expect(response.body.is_inactive_alerts_deletion_enabled).to.eql(
                DEFAULT_ALERT_DELETION_SETTINGS.isInactiveAlertsDeletionEnabled
              );
              expect(response.body.active_alerts_deletion_threshold).to.eql(
                DEFAULT_ALERT_DELETION_SETTINGS.activeAlertsDeletionThreshold
              );
              expect(response.body.inactive_alerts_deletion_threshold).to.eql(
                DEFAULT_ALERT_DELETION_SETTINGS.inactiveAlertsDeletionThreshold
              );
              expect(response.body.updated_by).to.be.a('string');
              expect(response.body.created_by).to.be.a('string');
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
