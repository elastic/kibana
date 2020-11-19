/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { omit } from 'lodash';
import { UserAtSpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const expectedNoOpType = {
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'resolved', name: 'Resolved' },
    ],
    defaultActionGroupId: 'default',
    id: 'test.noop',
    name: 'Test: Noop',
    actionVariables: {
      state: [],
      context: [],
      params: [],
    },
    producer: 'alertsFixture',
  };

  const expectedRestrictedNoOpType = {
    actionGroups: [
      { id: 'default', name: 'Default' },
      { id: 'resolved', name: 'Resolved' },
    ],
    defaultActionGroupId: 'default',
    id: 'test.restricted-noop',
    name: 'Test: Restricted Noop',
    actionVariables: {
      state: [],
      context: [],
      params: [],
    },
    producer: 'alertsRestrictedFixture',
  };

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
          const restrictedNoOpAlertType = response.body.find(
            (alertType: any) => alertType.id === 'test.restricted-noop'
          );
          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
              expect(response.body).to.eql([]);
              break;
            case 'space_1_all at space1':
            case 'space_1_all_alerts_none_actions at space1':
              expect(omit(noOpAlertType, 'authorizedConsumers')).to.eql(expectedNoOpType);
              expect(restrictedNoOpAlertType).to.eql(undefined);
              expect(noOpAlertType.authorizedConsumers).to.eql({
                alerts: { read: true, all: true },
                alertsFixture: { read: true, all: true },
              });
              break;
            case 'global_read at space1':
              expect(omit(noOpAlertType, 'authorizedConsumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorizedConsumers.alertsFixture).to.eql({
                read: true,
                all: false,
              });
              expect(noOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: false,
              });

              expect(omit(restrictedNoOpAlertType, 'authorizedConsumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(Object.keys(restrictedNoOpAlertType.authorizedConsumers)).not.to.contain(
                'alertsFixture'
              );
              expect(restrictedNoOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: false,
              });
              break;
            case 'space_1_all_with_restricted_fixture at space1':
              expect(omit(noOpAlertType, 'authorizedConsumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorizedConsumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });

              expect(omit(restrictedNoOpAlertType, 'authorizedConsumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(Object.keys(restrictedNoOpAlertType.authorizedConsumers)).not.to.contain(
                'alertsFixture'
              );
              expect(restrictedNoOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });
              break;
            case 'superuser at space1':
              expect(omit(noOpAlertType, 'authorizedConsumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorizedConsumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });

              expect(omit(restrictedNoOpAlertType, 'authorizedConsumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(noOpAlertType.authorizedConsumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorizedConsumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
