/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

import { CASES_URL } from '../../../../../plugins/case/common/constants';
import {
  defaultUser,
  postCaseReq,
  postCaseResp,
  removeServerGeneratedPropertiesFromCase,
} from '../../../common/lib/mock';
import { deleteCases, deleteCasesUserActions } from '../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('legacyEs');

  describe('patch_cases', () => {
    afterEach(async () => {
      await deleteCases(es);
      await deleteCasesUserActions(es);
    });

    it('should patch a case', async () => {
      const { body: postedCase } = await supertest
        .post(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send(postCaseReq)
        .expect(200);
      const { body: patchedCases } = await supertest
        .patch(CASES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: 'closed',
            },
          ],
        })
        .expect(200);

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(postedCase.id),
        closed_by: defaultUser,
        status: 'closed',
        updated_by: defaultUser,
      });
    });
  });
};
