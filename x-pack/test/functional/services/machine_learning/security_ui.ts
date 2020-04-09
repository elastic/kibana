/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlSecurityCommon, USER } from './security_common';

export function MachineLearningSecurityUIProvider(
  { getPageObjects }: FtrProviderContext,
  mlSecurityCommon: MlSecurityCommon
) {
  const PageObjects = getPageObjects(['security']);

  return {
    async loginAs(user: USER) {
      const password = mlSecurityCommon.getPasswordForUser(user);

      await PageObjects.security.forceLogout();

      await PageObjects.security.login(user, password, {
        expectSuccess: true,
      });
    },

    async loginAsMlPowerUser() {
      await this.loginAs(USER.ML_POWERUSER);
    },

    async loginAsMlViewer() {
      await this.loginAs(USER.ML_VIEWER);
    },
  };
}
