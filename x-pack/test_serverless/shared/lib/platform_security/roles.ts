/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

export async function clearAllRoles(esClient: Client, logger?: ToolingLog) {
  const existingRoles = await esClient.security.getRole();
  const esRolesNames = Object.entries(existingRoles)
    .filter(([roleName, esRole]) => {
      return !esRole.metadata?._reserved;
    })
    .map(([roleName]) => roleName);

  if (esRolesNames.length > 0) {
    await Promise.all(
      esRolesNames.map(async (roleName) => {
        await esClient.security.deleteRole({ name: roleName });
      })
    );
  } else {
    logger?.debug('No Roles to delete.');
  }
}
