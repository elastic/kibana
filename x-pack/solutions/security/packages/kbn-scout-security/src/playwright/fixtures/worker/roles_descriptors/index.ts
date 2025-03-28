/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readRolesDescriptorsFromResource, SERVERLESS_ROLES_ROOT_PATH } from '@kbn/es';
import { ElasticsearchRoleDescriptor, ScoutLogger, playwrightTest as base } from '@kbn/scout';

export interface RoleDescriptorsFixture {
  serverless: Map<string, ElasticsearchRoleDescriptor>;
}

/**
 * Fixture that provides the role descriptors for the serverless prebuilt roles.
 * Using worker scope to avoid reading the file for each test.
 */
export const roleDescriptorsFixture = base.extend<
  {},
  { roleDescriptors: RoleDescriptorsFixture; log: ScoutLogger }
>({
  roleDescriptors: [
    ({ log }, use) => {
      const resourcePath = `${SERVERLESS_ROLES_ROOT_PATH}/security/roles.yml`;
      const serverless = new Map<string, ElasticsearchRoleDescriptor>(
        Object.entries(
          readRolesDescriptorsFromResource(resourcePath) as Record<
            string,
            ElasticsearchRoleDescriptor
          >
        )
      );
      log.serviceLoaded('roleDescriptors');
      use({ serverless });
    },
    { scope: 'worker' },
  ],
});
