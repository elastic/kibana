/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');

  describe('get_case', () => {
    let roleCredentials: RoleCredentials;

    before(async () => {
      roleCredentials = await svlUserManager.createApiKeyForRole('admin');
    });

    after(async () => {
      await svlUserManager.invalidateApiKeyForRole(roleCredentials);
    });

    afterEach(async () => {
      await svlCases.api.deleteCases();
    });

    it('should return a case', async () => {
      const postedCase = await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest('observability'),
        { roleCredentials }
      );
      const theCase = await svlCases.api.getCase(
        {
          caseId: postedCase.id,
          includeComments: true,
        },
        { roleCredentials }
      );

      const data = svlCases.omit.removeServerGeneratedPropertiesFromCase(theCase);
      expect(data).to.eql(svlCases.api.postCaseResp('observability'));
      expect(data.comments?.length).to.eql(0);
    });
  });
};
