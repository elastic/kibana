/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { SpaceScenarios } from '../../scenarios';
import { getUrlPrefix } from '../../../common/lib/space_test_utils';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('list_alert_types', () => {
    for (const scenario of SpaceScenarios) {
      describe(scenario.id, () => {
        it('should return 200 with list of alert types', async () => {
          const response = await supertest.get(`${getUrlPrefix(scenario.id)}/api/alert/types`);

          expect(response.statusCode).to.eql(200);
          const fixtureAlertType = response.body.find(
            (alertType: any) => alertType.id === 'test.noop'
          );
          expect(fixtureAlertType).to.eql({
            id: 'test.noop',
            name: 'Test: Noop',
          });
        });
      });
    }
  });
}
