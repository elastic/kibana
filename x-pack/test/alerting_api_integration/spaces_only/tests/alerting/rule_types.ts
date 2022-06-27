/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('rule_types', () => {
    it('should return 200 with list of alert types', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule_types`
      );
      expect(response.status).to.eql(200);
      const { authorized_consumers: authorizedConsumers, ...fixtureAlertType } = response.body.find(
        (alertType: any) => alertType.id === 'test.noop'
      );
      expect(fixtureAlertType).to.eql({
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
          params: [],
          context: [],
        },
        recovery_action_group: {
          id: 'recovered',
          name: 'Recovered',
        },
        producer: 'alertsFixture',
        minimum_license_required: 'basic',
        is_exportable: true,
        enabled_in_license: true,
        rule_task_timeout: '5m',
      });
      expect(Object.keys(authorizedConsumers)).to.contain('alertsFixture');
    });

    it('should return actionVariables with both context and state', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.always-firing'
      );

      expect(fixtureAlertType.action_variables).to.eql({
        state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
        params: [{ name: 'instanceParamsValue', description: 'the instance params value' }],
        context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
      });
    });

    it('should return actionVariables with just context', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.onlyContextVariables'
      );

      expect(fixtureAlertType.action_variables).to.eql({
        state: [],
        params: [],
        context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
      });
    });

    it('should return actionVariables with just state', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.onlyStateVariables'
      );

      expect(fixtureAlertType.action_variables).to.eql({
        state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
        context: [],
        params: [],
      });
    });

    describe('legacy', () => {
      it('should return 200 with list of alert types', async () => {
        const response = await supertest.get(
          `${getUrlPrefix(Spaces.space1.id)}/api/alerts/list_alert_types`
        );
        expect(response.status).to.eql(200);
        const { authorizedConsumers, ...fixtureAlertType } = response.body.find(
          (alertType: any) => alertType.id === 'test.noop'
        );
        expect(fixtureAlertType).to.eql({
          actionGroups: [
            { id: 'default', name: 'Default' },
            { id: 'recovered', name: 'Recovered' },
          ],
          defaultActionGroupId: 'default',
          doesSetRecoveryContext: false,
          id: 'test.noop',
          name: 'Test: Noop',
          actionVariables: {
            state: [],
            params: [],
            context: [],
          },
          recoveryActionGroup: {
            id: 'recovered',
            name: 'Recovered',
          },
          producer: 'alertsFixture',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          enabledInLicense: true,
          ruleTaskTimeout: '5m',
        });
        expect(Object.keys(authorizedConsumers)).to.contain('alertsFixture');
      });
    });
  });
}
