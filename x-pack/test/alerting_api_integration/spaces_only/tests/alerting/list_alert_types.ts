/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('list_alert_types', () => {
    it('should return 200 with list of alert types', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/list_alert_types`
      );
      expect(response.status).to.eql(200);
      const fixtureAlertType = response.body.find((alertType: any) => alertType.id === 'test.noop');
      expect(fixtureAlertType).to.eql({
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        id: 'test.noop',
        name: 'Test: Noop',
        actionVariables: {
          state: [],
          context: [],
        },
        producer: 'alerting',
      });
    });

    it('should return actionVariables with both context and state', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/list_alert_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.always-firing'
      );

      expect(fixtureAlertType.actionVariables).to.eql({
        state: [{ name: 'instanceStateValue', description: 'the instance state value' }],
        context: [{ name: 'instanceContextValue', description: 'the instance context value' }],
      });
    });

    it('should return actionVariables with just context', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/list_alert_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.onlyContextVariables'
      );

      expect(fixtureAlertType.actionVariables).to.eql({
        state: [],
        context: [{ name: 'aContextVariable', description: 'this is a context variable' }],
      });
    });

    it('should return actionVariables with just state', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(Spaces.space1.id)}/api/alerts/list_alert_types`
      );
      expect(response.status).to.eql(200);

      const fixtureAlertType = response.body.find(
        (alertType: any) => alertType.id === 'test.onlyStateVariables'
      );

      expect(fixtureAlertType.actionVariables).to.eql({
        state: [{ name: 'aStateVariable', description: 'this is a state variable' }],
        context: [],
      });
    });
  });
}
