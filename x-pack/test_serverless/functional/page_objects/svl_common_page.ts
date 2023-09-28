/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import expect from 'expect';

export function SvlCommonPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const config = getService('config');
  const pageObjects = getPageObjects(['security']);

  return {
    async login() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });
      return await pageObjects.security.login(config.get('servers.kibana.username'));
    },

    async forceLogout() {
      await pageObjects.security.forceLogout({ waitForLoginPage: false });
    },

    async assertProjectHeaderExists() {
      await testSubjects.existOrFail('kibanaProjectHeader');
    },

    async assertNavExistsWithFixedSize() {
      const res = await testSubjects.find('projectLayoutSideNav');
      // EuiBottomBar expect side nav to be 248px if this change we may have to update src/core/public/styles/_base.scss
      expect((await res.getSize()).width).toBe(248);
    },

    async clickUserAvatar() {
      testSubjects.click('userMenuAvatar');
    },

    async assertUserAvatarExists() {
      await testSubjects.existOrFail('userMenuAvatar');
    },

    async assertUserMenuExists() {
      await testSubjects.existOrFail('userMenu');
    },
  };
}
