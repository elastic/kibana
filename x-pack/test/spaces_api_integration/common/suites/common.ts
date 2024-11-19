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
  const config = getService('config');
  const license = config.get('esTestCluster.license');
  let scopedSupertest: SupertestWithRoleScopeType | SuperTestAgent;

  if (user && license === 'trial') {
    const isBuiltIn = isBuiltInRole(user.role);
    if (!isBuiltIn) {
      await samlAuth.setCustomRole(getRoleDefinitionForUser(user));
    }

    scopedSupertest = await roleScopedSupertest.getSupertestWithRoleScope(
      isBuiltIn ? user.role : 'customRole',
      {
        useCookieHeader: true,
        withInternalHeaders: true,
      }
    );
  } else {
    scopedSupertest = supertestWithoutAuth;
  }

  // TODO: fix types
  const wrapRequestWithAuth = (method: keyof SuperTestAgent) => {
    return (...args: any[]) => {
      const request = (scopedSupertest as any)[method](...args);
      if (user && license === 'basic') {
        return request.auth(user.username, user.password);
      }
      return request;
    };
  };

  return new Proxy(scopedSupertest, {
    get(target, prop: string) {
      if (['post', 'get', 'put', 'delete', 'patch', 'head'].includes(prop)) {
        return wrapRequestWithAuth(prop as keyof SuperTestAgent);
      }
      return Reflect.get(target, prop);
    },
  });
}

export async function maybeDestroySupertest(
  supertest: SupertestWithRoleScopeType | SuperTestAgent
) {
  // @ts-expect-error
  if (typeof supertest.destroy === 'function') {
    await (supertest as SupertestWithRoleScopeType).destroy();
  }
}
