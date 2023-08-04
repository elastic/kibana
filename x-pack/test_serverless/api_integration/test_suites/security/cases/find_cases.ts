/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { findCases, createCase, deleteAllCaseItems } from './helpers/api';
import { findCasesResp, postCaseReq } from './helpers/mock';

// eslint-disable-next-line import/no-default-export
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
    });
  });
};
