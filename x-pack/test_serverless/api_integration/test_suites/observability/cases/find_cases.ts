/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest } from '@kbn/cases-plugin/common/types/api';
import expect from '@kbn/expect';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');

  let findCasesResp: any;
  let postCaseReq: CasePostRequest;

  describe('find_cases', () => {
    let roleAuthc: RoleCredentials;
    before(async () => {
      findCasesResp = svlCases.api.getFindCasesResp();
      postCaseReq = svlCases.api.getPostCaseReq('observability');
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    afterEach(async () => {
      await svlCases.api.deleteAllCaseItems();
    });

    it('should return empty response', async () => {
      const cases = await svlCases.api.findCases({}, roleAuthc);
      expect(cases).to.eql(findCasesResp);
    });

    it('should return cases', async () => {
      const a = await svlCases.api.createCase(postCaseReq, roleAuthc);
      const b = await svlCases.api.createCase(postCaseReq, roleAuthc);
      const c = await svlCases.api.createCase(postCaseReq, roleAuthc);

      const cases = await svlCases.api.findCases({}, roleAuthc);

      expect(cases).to.eql({
        ...findCasesResp,
        total: 3,
        cases: [a, b, c],
        count_open_cases: 3,
      });
    });

    it('returns empty response when trying to find cases with owner as cases', async () => {
      const cases = await svlCases.api.findCases(
        {
          query: { owner: 'cases' },
        },
        roleAuthc
      );
      expect(cases).to.eql(findCasesResp);
    });

    it('returns empty response when trying to find cases with owner as securitySolution', async () => {
      const cases = await svlCases.api.findCases(
        {
          query: { owner: 'securitySolution' },
        },
        roleAuthc
      );
      expect(cases).to.eql(findCasesResp);
    });
  });
};
