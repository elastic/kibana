/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function listAlertTypes({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('list_alert_types', () => {
    it('should return 200 with list of alert types', async () => {
      await supertest
        .get('/api/alert/types')
        .expect(200)
        .then((resp: any) => {
          const fixtureAlertType = resp.body.find((alertType: any) => alertType.id === 'test.noop');
          expect(fixtureAlertType).to.eql({
            id: 'test.noop',
            name: 'Test: Noop',
          });
        });
    });
  });
}
