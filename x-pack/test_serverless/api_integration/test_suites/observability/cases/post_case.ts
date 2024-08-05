/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ConnectorTypes } from '@kbn/cases-plugin/common/types/domain';
import type { RoleCredentials } from '../../../../shared/services';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const svlCases = getService('svlCases');
  const svlUserManager = getService('svlUserManager');

  describe('post_case', () => {
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

    it('should create a case', async () => {
      expect(
        await svlCases.api.createCase(
          svlCases.api.getPostCaseRequest('observability', {
            connector: {
              id: '123',
              name: 'Jira',
              type: ConnectorTypes.jira,
              fields: { issueType: 'Task', priority: 'High', parent: null },
            },
          }),
          roleAuthc,
          200
        )
      );
    });

    it('should throw 403 when create a case with securitySolution as owner', async () => {
      expect(
        await svlCases.api.createCase(
          svlCases.api.getPostCaseRequest('observability', {
            owner: 'securitySolution',
          }),
          roleAuthc,
          403
        )
      );
    });

    it('should throw 403 when create a case with cases as owner', async () => {
      expect(
        await svlCases.api.createCase(
          svlCases.api.getPostCaseRequest('observability', {
            owner: 'cases',
          }),
          roleAuthc,
          403
        )
      );
    });
  });
};
