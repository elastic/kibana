/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  getCaseUserActions,
  getAuthWithSuperUser,
} from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_all_user_actions', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it(`should get user actions in space1`, async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest(), 200, authSpace1);
      const body = await getCaseUserActions({ supertest, caseID: postedCase.id, auth: authSpace1 });

      expect(body.length).to.eql(1);
    });

    it(`should not get user actions in the wrong space`, async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest(), 200, authSpace1);
      const body = await getCaseUserActions({
        supertest,
        caseID: postedCase.id,
        auth: getAuthWithSuperUser('space2'),
      });

      expect(body.length).to.eql(0);
    });
  });
};
