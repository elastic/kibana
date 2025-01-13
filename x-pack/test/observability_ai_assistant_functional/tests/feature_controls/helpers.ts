/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InheritedFtrProviderContext } from '../../ftr_provider_context';

const AI_ASSISTANT_ROLE_NAME = 'ai_assistant_role';
const AI_ASSISTANT_USER_NAME = 'ai_assistant_user';
const AI_ASSISTANT_USER_PASSWORD = `${AI_ASSISTANT_USER_NAME}-password`;

export const createAndLoginUserWithCustomRole = async (
  getPageObjects: InheritedFtrProviderContext['getPageObjects'],
  getService: InheritedFtrProviderContext['getService'],
  featurePrivileges: { [key: string]: string[] }
) => {
  const security = getService('security');
  const PageObjects = getPageObjects(['security']);

  const kibanaPrivileges = [
    {
      feature: featurePrivileges,
      spaces: ['*'],
    },
  ];

  await security.role.create(AI_ASSISTANT_ROLE_NAME, {
    kibana: kibanaPrivileges,
  });

  await security.user.create(AI_ASSISTANT_USER_NAME, {
    password: AI_ASSISTANT_USER_PASSWORD,
    roles: [AI_ASSISTANT_ROLE_NAME],
    full_name: 'test user',
  });

  await PageObjects.security.forceLogout();

  await PageObjects.security.login(AI_ASSISTANT_USER_NAME, AI_ASSISTANT_USER_PASSWORD, {
    expectSpaceSelector: false,
  });
};

export const deleteAndLogoutUser = async (
  getService: InheritedFtrProviderContext['getService'],
  getPageObjects: InheritedFtrProviderContext['getPageObjects']
) => {
  const security = getService('security');
  const PageObjects = getPageObjects(['security']);

  await PageObjects.security.forceLogout();
  await Promise.all([
    security.role.delete(AI_ASSISTANT_ROLE_NAME),
    security.user.delete(AI_ASSISTANT_USER_NAME),
  ]);
};
