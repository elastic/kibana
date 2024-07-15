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
      roleAuthc = await svlUserManager.createApiKeyForRole('admin');
    });

    afterEach(async () => {
      await svlCases.api.deleteCases();
    });

    it('should create a case', async () => {
      const payload = svlCases.api.getPostCaseRequest('securitySolution', {
        connector: {
          id: '123',
          name: 'Jira',
          type: ConnectorTypes.jira,
          fields: { issueType: 'Task', priority: 'High', parent: null },
        },
      });
      const postedCase = await svlCases.api.createCase(payload, roleAuthc);

      const { created_by: createdBy, ...data } =
        svlCases.omit.removeServerGeneratedPropertiesFromCase(postedCase);
      const { created_by: _, ...expected } = svlCases.api.postCaseResp(
        'securitySolution',
        null,
        payload
      );

      expect(data).to.eql(expected);
      expect(createdBy).to.have.keys('full_name', 'email', 'username');
    });

    it('should throw 403 when trying to create a case with observability as owner', async () => {
      expect(
        await svlCases.api.createCase(
          svlCases.api.getPostCaseRequest('securitySolution', {
            owner: 'observability',
          }),
          roleAuthc,
          403
        )
      );
    });

    it('should throw 403 when trying to create a case with cases as owner', async () => {
      expect(
        await svlCases.api.createCase(
          svlCases.api.getPostCaseRequest('securitySolution', {
            owner: 'cases',
          }),
          roleAuthc,
          403
        )
      );
    });
  });
};
