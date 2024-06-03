/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');

  let findCasesResp: any;
  let postCaseReq: any;

  describe('find_cases', () => {
    let roleCredentials: RoleCredentials;
    describe('basic tests', () => {
      before(async () => {
        findCasesResp = svlCases.api.getFindCasesResp();
        postCaseReq = svlCases.api.getPostCaseReq('securitySolution');
        roleCredentials = await svlUserManager.createApiKeyForRole('admin');
      });

      afterEach(async () => {
        await svlCases.api.deleteAllCaseItems();
      });

      it('should return empty response', async () => {
        const cases = await svlCases.api.findCases({}, { roleCredentials });
        expect(cases).to.eql(findCasesResp);
      });

      it('should return cases', async () => {
        const a = await svlCases.api.createCase(postCaseReq, { roleCredentials });
        const b = await svlCases.api.createCase(postCaseReq, { roleCredentials });
        const c = await svlCases.api.createCase(postCaseReq, { roleCredentials });

        const cases = await svlCases.api.findCases({}, { roleCredentials });

        expect(cases).to.eql({
          ...findCasesResp,
          total: 3,
          cases: [a, b, c],
          count_open_cases: 3,
        });
      });

      it('returns empty response when trying to find cases with owner as cases', async () => {
        const cases = await svlCases.api.findCases(
          { query: { owner: 'cases' } },
          { roleCredentials }
        );
        expect(cases).to.eql(findCasesResp);
      });

      it('returns empty response when trying to find cases with owner as observability', async () => {
        const cases = await svlCases.api.findCases(
          {
            query: { owner: 'observability' },
          },
          { roleCredentials }
        );
        expect(cases).to.eql(findCasesResp);
      });
    });
  });
};
