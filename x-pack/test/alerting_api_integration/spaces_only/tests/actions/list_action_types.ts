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
export default function listActionTypesTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('list_action_types', () => {
    it('should return 200 with list of action types containing defaults', async () => {
      const response = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/api/action/types`);

      function createActionTypeMatcher(id: string, name: string) {
        return (actionType: { id: string; name: string }) => {
          return actionType.id === id && actionType.name === name;
        };
      }

      expect(response.statusCode).to.eql(200);
      // Check for values explicitly in order to avoid this test failing each time plugins register
      // a new action type
      expect(
        response.body.some(createActionTypeMatcher('test.index-record', 'Test: Index Record'))
      ).to.be(true);
    });
  });
}
