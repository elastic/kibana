/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function PlatformSecurityUtilsProvider({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  return {
    // call it from 'samlAuth' service when tests are migrated to deployment-agnostic
    async clearAllRoles() {
      const existingRoles = await es.security.getRole();
      const esRolesNames = Object.entries(existingRoles)
        .filter(([roleName, esRole]) => {
          return !esRole.metadata?._reserved;
        })
        .map(([roleName]) => roleName);

      if (esRolesNames.length > 0) {
        await Promise.all(
          esRolesNames.map(async (roleName) => {
            await es.security.deleteRole({ name: roleName });
          })
        );
      } else {
        log.debug('No Roles to delete.');
      }
    },
  };
}
