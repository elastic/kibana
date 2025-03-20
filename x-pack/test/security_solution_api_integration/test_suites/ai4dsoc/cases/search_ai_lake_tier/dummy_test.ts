/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RoleCredentials, InternalRequestHeader } from '@kbn/ftr-common-functional-services';
import { DeploymentAgnosticFtrProviderContext } from '../../../../../api_integration/deployment_agnostic/ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  let roleAuthc: RoleCredentials;
  let internalHeaders: InternalRequestHeader;

  describe('@serverless Dummy test', () => {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('platform_engineer');
      internalHeaders = samlAuth.getInternalRequestHeader();
    });
    after(async () => {
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('returns autocomplete definitions', async () => {
      const body = {
        tags: ['tag-1'],
        owner: 'securitySolution',
        title: 'Case title 1',
        settings: {
          syncAlerts: true,
        },
        connector: {
          id: '131d4448-abe0-4789-939d-8ef60680b498',
          name: 'My connector',
          type: '.jira',
          fields: {
            parent: null,
            priority: 'High',
            issueType: '10006',
          },
        },
        description: 'A case description.',
      };

      await supertestWithoutAuth
        .post('/api/cases')
        .set(roleAuthc.apiKeyHeader)
        .set(internalHeaders)
        .set('kbn-xsrf', 'true')
        .send(body)
        .expect(200);
    });
  });
}
