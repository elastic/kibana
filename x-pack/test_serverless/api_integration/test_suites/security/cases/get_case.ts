/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getCase, createCase, deleteCasesByESQuery } from './helpers/api';
import { getPostCaseRequest, postCaseResp } from './helpers/mock';
import { removeServerGeneratedPropertiesFromCase } from './helpers/omit';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('get_case', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
    });

    it('should return a case', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const theCase = await getCase({ supertest, caseId: postedCase.id, includeComments: true });

      const data = removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql(postCaseResp());
      expect(data.comments?.length).to.eql(0);
    });
  });
};
