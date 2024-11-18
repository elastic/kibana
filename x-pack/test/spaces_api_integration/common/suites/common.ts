/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Agent as SuperTestAgent } from 'supertest';

import type {
  DeploymentAgnosticFtrProviderContext,
  SupertestWithRoleScopeType,
} from '../../deployment_agnostic/ftr_provider_context';
import { getRoleDefinitionForUser, isBuiltInRole } from '../lib/authentication';
import type { TestDefinitionAuthentication } from '../lib/types';

export async function getSupertest(
  { getService }: DeploymentAgnosticFtrProviderContext,
  user?: TestDefinitionAuthentication
): Promise<SupertestWithRoleScopeType | SuperTestAgent> {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  if (user) {
    const isBuiltIn = isBuiltInRole(user.role);
    if (!isBuiltIn) {
      await samlAuth.setCustomRole(getRoleDefinitionForUser(user));
    }

    return await roleScopedSupertest.getSupertestWithRoleScope(
      isBuiltIn ? user.role : 'customRole',
      {
        useCookieHeader: true,
        withInternalHeaders: true,
      }
    );
  }

  return supertestWithoutAuth;
}

export async function maybeDestroySupertest(
  supertest: SupertestWithRoleScopeType | SuperTestAgent
) {
  // @ts-expect-error
  if (typeof supertest.destroy === 'function') {
    await (supertest as SupertestWithRoleScopeType).destroy();
  }
}
