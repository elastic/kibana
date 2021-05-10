/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { nullUser, postCaseReq, postCaseResp } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  updateCase,
  removeServerGeneratedPropertiesFromCase,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should patch a case in space1', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
      const patchedCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: 'new title',
            },
          ],
        },
        auth: authSpace1,
      });

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(),
        title: 'new title',
        updated_by: nullUser,
        created_by: nullUser,
      });
    });

    it('should not patch a case in a different space', async () => {
      const postedCase = await createCase(supertest, postCaseReq, 200, authSpace1);
      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              title: 'new title',
            },
          ],
        },
        expectedHttpCode: 404,
        auth: getAuthWithSuperUser('space2'),
      });
    });
  });
};
