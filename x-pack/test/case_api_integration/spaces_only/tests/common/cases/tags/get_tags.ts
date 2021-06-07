/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import {
  deleteCasesByESQuery,
  createCase,
  getTags,
  getAuthWithSuperUser,
} from '../../../../../common/lib/utils';
import { getPostCaseRequest } from '../../../../../common/lib/mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();
  const authSpace2 = getAuthWithSuperUser('space2');

  describe('get_tags', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return case tags in space1', async () => {
      await createCase(supertest, getPostCaseRequest(), 200, authSpace1);
      await createCase(supertest, getPostCaseRequest({ tags: ['unique'] }), 200, authSpace2);

      const tagsSpace1 = await getTags({ supertest, auth: authSpace1 });
      const tagsSpace2 = await getTags({ supertest, auth: authSpace2 });

      expect(tagsSpace1).to.eql(['defacement']);
      expect(tagsSpace2).to.eql(['unique']);
    });
  });
};
