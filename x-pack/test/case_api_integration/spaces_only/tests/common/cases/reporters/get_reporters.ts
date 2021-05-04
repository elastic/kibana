/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { defaultUser, getPostCaseRequest } from '../../../../../common/lib/mock';
import {
  createCase,
  deleteCasesByESQuery,
  getAuthWithSuperUser,
  getReporters,
} from '../../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_reporters', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return reporters in space1', async () => {
      await Promise.all([
        createCase(supertest, getPostCaseRequest(), 200, getAuthWithSuperUser('space2')),
        createCase(supertest, getPostCaseRequest(), 200, authSpace1),
      ]);

      const reporters = await getReporters({ supertest, auth: authSpace1 });

      expect(reporters).to.eql([defaultUser]);
    });
  });
};
