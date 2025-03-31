/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import { getUrlPrefix, resetRulesSettings } from '../../../../common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function getAlertDeletionPreview({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('alertDeletionPreview', () => {
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
        it('should handle get alert deletion preview request appropriately', async () => {
          const url = `/internal/alerting/rules/settings/_alert_deletion_preview?is_active_alerts_deletion_enabled=true&active_alerts_deletion_threshold=90&is_inactive_alerts_deletion_enabled=true&inactive_alerts_deletion_threshold=90`;

          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}${url}`)
            .auth(user.username, user.password)
            .send();

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'space_1_all_with_restricted_fixture at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(response.statusCode).to.eql(403);
              expect(response.body).to.eql({
                error: 'Forbidden',
                message: `API [GET ${url}] is unauthorized for user, this action is granted by the Kibana privileges [read-alert-deletion-settings]`,
                statusCode: 403,
              });
              break;
            case 'global_read at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
              expect(response.statusCode).to.eql(200);
              // TODO: 5 is the value returned by the fake alert deletion client.
              // Needs to be updated once we use the right client. Probably just 0
              expect(response.body.affected_alert_count).to.eql(5);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
