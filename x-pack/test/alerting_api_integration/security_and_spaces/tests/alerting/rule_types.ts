/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
    action_groups: [
      { id: 'default', name: 'Default' },
      { id: 'recovered', name: 'Recovered' },
    ],
    default_action_group_id: 'default',
    does_set_recovery_context: false,
    id: 'test.noop',
    name: 'Test: Noop',
    action_variables: {
      state: [],
      context: [],
      params: [],
    },
    producer: 'alertsFixture',
    minimum_license_required: 'basic',
    is_exportable: true,
    recovery_action_group: {
      id: 'recovered',
      name: 'Recovered',
    },
    enabled_in_license: true,
    config: {
      execution: {
        actions: {
          max: 100000,
        },
        timeout: '5m',
      },
    },
  };

  const expectedRestrictedNoOpType = {
    action_groups: [
      { id: 'default', name: 'Default' },
      { id: 'restrictedRecovered', name: 'Restricted Recovery' },
    ],
    recovery_action_group: {
      id: 'restrictedRecovered',
      name: 'Restricted Recovery',
    },
    default_action_group_id: 'default',
    does_set_recovery_context: false,
    id: 'test.restricted-noop',
    name: 'Test: Restricted Noop',
    action_variables: {
      state: [],
      context: [],
      params: [],
    },
    producer: 'alertsRestrictedFixture',
    minimum_license_required: 'basic',
    is_exportable: true,
    enabled_in_license: true,
    config: {
      execution: {
        actions: {
          max: 100000,
        },
        timeout: '5m',
      },
    },
  };

  describe('rule_types', () => {
    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      describe(scenario.id, () => {
        it('should return 200 with list of globally available alert types', async () => {
          const response = await supertestWithoutAuth
            .get(`${getUrlPrefix(space.id)}/api/alerting/rule_types`)
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
              expect(omit(noOpAlertType, 'authorized_consumers')).to.eql(expectedNoOpType);
              expect(restrictedNoOpAlertType).to.eql(undefined);
              expect(noOpAlertType.authorized_consumers).to.eql({
                alerts: { read: true, all: true },
                alertsFixture: { read: true, all: true },
              });
              break;
            case 'global_read at space1':
              expect(omit(noOpAlertType, 'authorized_consumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorized_consumers.alertsFixture).to.eql({
                read: true,
                all: false,
              });
              expect(noOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: false,
              });

              expect(omit(restrictedNoOpAlertType, 'authorized_consumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(Object.keys(restrictedNoOpAlertType.authorized_consumers)).not.to.contain(
                'alertsFixture'
              );
              expect(restrictedNoOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: false,
              });
              break;
            case 'space_1_all_with_restricted_fixture at space1':
              expect(omit(noOpAlertType, 'authorized_consumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorized_consumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });

              expect(omit(restrictedNoOpAlertType, 'authorized_consumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(Object.keys(restrictedNoOpAlertType.authorized_consumers)).not.to.contain(
                'alertsFixture'
              );
              expect(restrictedNoOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });
              break;
            case 'superuser at space1':
              expect(omit(noOpAlertType, 'authorized_consumers')).to.eql(expectedNoOpType);
              expect(noOpAlertType.authorized_consumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
                read: true,
                all: true,
              });

              expect(omit(restrictedNoOpAlertType, 'authorized_consumers')).to.eql(
                expectedRestrictedNoOpType
              );
              expect(noOpAlertType.authorized_consumers.alertsFixture).to.eql({
                read: true,
                all: true,
              });
              expect(noOpAlertType.authorized_consumers.alertsRestrictedFixture).to.eql({
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
