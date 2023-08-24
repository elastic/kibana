/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

import {
  findCases,
  createCase,
  deleteAllCaseItems,
  findCasesResp,
  postCaseReq,
} from './helpers/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_cases', () => {
    describe('basic tests', () => {
      afterEach(async () => {
        await deleteAllCaseItems(es);
      });

      it('should return empty response', async () => {
        const cases = await findCases({ supertest });
        expect(cases).to.eql(findCasesResp);
      });

      it('should return cases', async () => {
        const a = await createCase(supertest, postCaseReq);
        const b = await createCase(supertest, postCaseReq);
        const c = await createCase(supertest, postCaseReq);

        const cases = await findCases({ supertest });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 3,
          cases: [a, b, c],
          count_open_cases: 3,
        });
      });

      it('returns empty response when trying to find cases with owner as cases', async () => {
        const cases = await findCases({ supertest, query: { owner: 'cases' } });
        expect(cases).to.eql(findCasesResp);
      });

      it('returns empty response when trying to find cases with owner as observability', async () => {
        const cases = await findCases({ supertest, query: { owner: 'observability' } });
        expect(cases).to.eql(findCasesResp);
      });
    });
  });
};
