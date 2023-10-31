/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  KNOWN_ESS_ROLE_DEFINITIONS,
  KNOWN_SERVERLESS_ROLE_DEFINITIONS,
} from '@kbn/security-solution-plugin/common/test';
import { SecurityService } from '../../../../../test/common/services/security/security';

export async function setupUsers(securityService: SecurityService): Promise<void> {
  const KNOWN_ROLE_DEFINITIONS = [
    ...Object.values(KNOWN_SERVERLESS_ROLE_DEFINITIONS),
    ...Object.values(KNOWN_ESS_ROLE_DEFINITIONS),
  ];

  for (const roleDefinition of KNOWN_ROLE_DEFINITIONS) {
    await securityService.role.create(roleDefinition.name, roleDefinition);

    await securityService.user.create(roleDefinition.name, {
      password: 'changeme',
      roles: [roleDefinition.name],
      full_name: roleDefinition.name,
      email: 'detections-reader@example.com',
    });
  }
}
