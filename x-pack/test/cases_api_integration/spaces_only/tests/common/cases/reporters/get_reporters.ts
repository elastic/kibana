/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { getPostCaseRequest } from '../../../../../common/lib/mock';
import {
  createCase,
  deleteCasesByESQuery,
  getAuthWithSuperUser,
  getReporters,
} from '../../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const authSpace2 = getAuthWithSuperUser('space2');

  describe('get_reporters', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should not return reporters when security is disabled', async () => {
      await Promise.all([
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace2),
        createCase(supertestWithoutAuth, getPostCaseRequest(), 200, authSpace1),
      ]);

      const reportersSpace1 = await getReporters({
        supertest: supertestWithoutAuth,
        auth: authSpace1,
      });
      const reportersSpace2 = await getReporters({
        supertest: supertestWithoutAuth,
        auth: authSpace2,
      });

      expect(reportersSpace1).to.eql([]);
      expect(reportersSpace2).to.eql([]);
    });
  });
};
