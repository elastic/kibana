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
    let roleAuthc: RoleCredentials;

    before(async () => {
      roleAuthc = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    afterEach(async () => {
      await svlCases.api.deleteCases();
    });

    it('should return a case', async () => {
      const postedCase = await svlCases.api.createCase(
        svlCases.api.getPostCaseRequest('observability'),
        roleAuthc
      );
      const theCase = await svlCases.api.getCase(
        {
          caseId: postedCase.id,
          expectedHttpCode: 200,
        },
        roleAuthc
      );

      const {
        created_by: createdBy,
        comments,
        ...data
      } = svlCases.omit.removeServerGeneratedPropertiesFromCase(theCase);

      const {
        created_by: _,
        comments: _comments,
        ...expectedData
      } = svlCases.api.postCaseResp('observability');

      expect(data).to.eql(expectedData);
      expect(createdBy).to.have.keys('full_name', 'email', 'username');
    });
  });
};
