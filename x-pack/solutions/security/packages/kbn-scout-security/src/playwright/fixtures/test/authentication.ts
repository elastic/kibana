/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readRolesDescriptorsFromResource, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { ElasticsearchRoleDescriptor, ScoutTestConfig } from '@kbn/scout';
import { BrowserAuthFixture } from '@kbn/scout/src/playwright/fixtures/test';
import { SamlAuth, ScoutLogger } from '@kbn/scout/src/playwright/fixtures/worker';

export async function extendBrowserAuth(
  browserAuth: BrowserAuthFixture,
  config: ScoutTestConfig,
  samlAuth: SamlAuth,
  log: ScoutLogger
) {
  const resourcePath = `${SERVERLESS_ROLES_ROOT_PATH}/security/roles.yml`;
  const svlRoleDescriptors = new Map<string, ElasticsearchRoleDescriptor>(
    Object.entries(
      readRolesDescriptorsFromResource(resourcePath) as Record<string, ElasticsearchRoleDescriptor>
    )
  );

  const extendedAuth = {
    ...browserAuth,
    loginAsPlatformEngineer: async () => {
      const roleName = 'platform_engineer';
      if (!config.serverless) {
        const roleDesciptor = svlRoleDescriptors?.get(roleName) as ElasticsearchRoleDescriptor;
        if (!roleDesciptor) {
          throw new Error(`No role descriptors found for ${roleName}`);
        }
        await samlAuth.setCustomRole(roleDesciptor);
        log.debug(`Using "${roleName}" role to execute the test`);
        return browserAuth.loginAs(samlAuth.customRoleName);
      } else {
        await browserAuth.loginAs(roleName);
      }
    },
  };

  return extendedAuth;
}
