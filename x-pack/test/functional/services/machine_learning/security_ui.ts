/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlSecurityCommon } from './security_common';

export function MachineLearningSecurityUIProvider(
  { getPageObjects }: FtrProviderContext,
  mlSecurityCommon: MlSecurityCommon
) {
  const PageObjects = getPageObjects(['security']);

  return {
    async loginAs(username: string) {
      const password = mlSecurityCommon.getPasswordForUser(username);

      await PageObjects.security.forceLogout();

      await PageObjects.security.login(username, password, {
        expectSuccess: true,
      });
    },
  };
}
