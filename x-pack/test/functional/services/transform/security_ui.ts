/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { TransformSecurityCommon, USER } from './security_common';

export function TransformSecurityUIProvider(
  { getPageObjects }: FtrProviderContext,
  transformSecurityCommon: TransformSecurityCommon
) {
  const PageObjects = getPageObjects(['security']);

  return {
    async loginAs(user: USER) {
      const password = transformSecurityCommon.getPasswordForUser(user);

      await PageObjects.security.forceLogout();

      await PageObjects.security.login(user, password, {
        expectSuccess: true,
      });
    },

    async loginAsTransformPowerUser() {
      await this.loginAs(USER.TRANSFORM_POWERUSER);
    },

    async loginAsTransformViewer() {
      await this.loginAs(USER.TRANSFORM_VIEWER);
    },

    async logout() {
      await PageObjects.security.forceLogout();
    },
  };
}
