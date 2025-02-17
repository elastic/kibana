/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getCaseWithoutCommentsResp,
  getPostCaseRequest,
  nullUser,
} from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  createCase,
  getCase,
  removeServerGeneratedPropertiesFromCase,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return a case in space1', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        authSpace1
      );
      const theCase = await getCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: authSpace1,
      });

      const data = removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql({ ...getCaseWithoutCommentsResp(), created_by: nullUser });
    });

    it('should not return a case in the wrong space', async () => {
      const postedCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        authSpace1
      );
      await getCase({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
