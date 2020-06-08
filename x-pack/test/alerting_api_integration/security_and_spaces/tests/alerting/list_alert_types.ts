/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('list_alert_types', () => {
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 200 with list of globally available alert types', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerts/list_alert_types`)
            .auth(user.username, user.password);

          expect(response.statusCode).to.eql(200);
          const noOpAlertType = response.body.find(
            (alertType: any) => alertType.id === 'test.noop'
          );
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql([]);
              break;
            case 'global_read at space1':
            case 'space_1_all at space1':
              expect(noOpAlertType).to.eql({
                actionGroups: [{ id: 'default', name: 'Default' }],
                defaultActionGroupId: 'default',
                id: 'test.noop',
                name: 'Test: Noop',
                actionVariables: {
                  state: [],
                  context: [],
                },
                authorizedConsumers: ['alertsFixture'],
                producer: 'alertsFixture',
              });
              break;
            case 'space_1_all_with_restricted_fixture at space1':
              expect(noOpAlertType).to.eql({
                actionGroups: [{ id: 'default', name: 'Default' }],
                defaultActionGroupId: 'default',
                id: 'test.noop',
                name: 'Test: Noop',
                actionVariables: {
                  state: [],
                  context: [],
                },
                authorizedConsumers: ['alertsRestrictedFixture', 'alertsFixture'],
                producer: 'alertsFixture',
              });
              break;
            case 'superuser at space1':
              const { authorizedConsumers, ...superUserFixtureAlertType } = noOpAlertType;
              expect(superUserFixtureAlertType).to.eql({
                actionGroups: [{ id: 'default', name: 'Default' }],
                defaultActionGroupId: 'default',
                id: 'test.noop',
                name: 'Test: Noop',
                actionVariables: {
                  state: [],
                  context: [],
                },
                producer: 'alertsFixture',
              });
              expect(authorizedConsumers).to.contain('alertsFixture');
              expect(authorizedConsumers).to.contain('alertsRestrictedFixture');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
