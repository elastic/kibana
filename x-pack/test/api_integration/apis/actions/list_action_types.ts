/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function listActionTypesTests({ getService }: KibanaFunctionalTestDefaultProviders) {
  const supertest = getService('supertest');

  describe('list_action_types', () => {
    it('should return 200 with list of action types containing defaults', async () => {
      await supertest
        .get('/api/action/types')
        .expect(200)
        .then((resp: any) => {
          function createActionTypeMatcher(id: string, name: string) {
            return (actionType: { id: string; name: string }) => {
              return actionType.id === id && actionType.name === name;
            };
          }
          // Check for values explicitly in order to avoid this test failing each time plugins register
          // a new action type
          expect(
            resp.body.some(createActionTypeMatcher('test.index-record', 'Test: Index Record'))
          ).to.be(true);
        });
    });
  });
}
