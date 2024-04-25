/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlUserProfilePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  const getThemeTag = async (): Promise<string> => {
    return await browser.execute('return __kbnThemeTag__');
  };

  const getReloadWindowButton = async () => {
    return await testSubjects.find('windowReloadButton');
  };

  const changeUserProfileTheme = async (): Promise<void> => {
    const userMenuButton = await testSubjects.find('userMenuButton');
    expect(userMenuButton).not.to.be(null);
    await userMenuButton.click();

    const themeModeToggle = await testSubjects.find('darkModeToggle');
    expect(themeModeToggle).not.to.be(null);
    await themeModeToggle.click();

    let reloadWindowButton;
    await retry.try(async () => {
      reloadWindowButton = await getReloadWindowButton();
      expect(reloadWindowButton).not.to.be(null);
      await reloadWindowButton.click();
    });
  };

  return {
    async getProfileEmail() {
      return await testSubjects.getVisibleText('email');
    },

    async getProfileFullname() {
      return await testSubjects.getVisibleText('full_name');
    },

    getThemeTag,
    changeUserProfileTheme,
  };
}
