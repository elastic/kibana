/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function listConnectorTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('list_connectors', () => {
    it('should return 200 with list of connectors containing defaults', async () => {
      await supertest
        .get('/api/alerting/connectors')
        .expect(200)
        .then((resp: any) => {
          function createConnectorMatcher(id: string, name: string) {
            return (connector: { id: string; name: string }) => {
              return connector.id === id && connector.name === name;
            };
          }
          // Check for values explicitly in order to avoid this test failing each time plugins register
          // a new connector
          expect(resp.body.some(createConnectorMatcher('test', 'Test'))).to.be(true);
        });
    });
  });
}
