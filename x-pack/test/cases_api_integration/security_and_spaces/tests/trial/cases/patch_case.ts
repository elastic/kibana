/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { postCaseReq, postCaseResp } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  removeServerGeneratedPropertiesFromCase,
  updateCase,
} from '../../../../common/lib/api';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

export const defaultUser = { email: null, full_name: null, username: 'elastic' };
// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should filter out empty assignee.uid values', async () => {
      const randomUid = '7f3e9d2a-1b8c-4c5f-9e6d-8f2a4b1d3c7e';
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              assignees: [{ uid: '' }, { uid: randomUid }],
            },
          ],
        },
      });

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(),
        assignees: [{ uid: randomUid }],
        updated_by: defaultUser,
      });
    });
  });
};
