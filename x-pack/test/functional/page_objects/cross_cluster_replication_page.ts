/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function CrossClusterReplicationPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const comboBox = getService('comboBox');

  return {
    async appTitleText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async createFollowerIndexButton() {
      return await testSubjects.find('createFollowerIndexButton');
    },
    async clickAutoFollowerTab() {
      await testSubjects.click('autoFollowPatternsTab');
      await retry.waitFor('create auto follow button', async () => {
        return await testSubjects.isDisplayed('createAutoFollowPatternButton');
      });
    },
    async clickCreateFollowerIndexButton() {
      await (await this.createFollowerIndexButton()).click();
      await retry.waitFor('app title to say Add follower index', async () => {
        return (
          (await (await testSubjects.find('pageTitle')).getVisibleText()) === 'Add follower index'
        );
      });
    },
    async clickAutoFollowerPatternButton() {
      await testSubjects.click('createAutoFollowPatternButton');
      await retry.waitFor('name input to show up', async () => {
        return await testSubjects.isDisplayed('nameInput');
      });
    },
    async createFollowerIndex(
      leader: string,
      follower: string,
      advancedSettings: boolean = false,
      readPollTimeout?: string
    ) {
      await testSubjects.setValue('leaderIndexInput', leader);
      await testSubjects.setValue('followerIndexInput', follower);
      if (advancedSettings) {
        await this.clickAdvancedSettingsToggle();
        await retry.waitFor('advanced settings to be shown', async () => {
          return await testSubjects.isDisplayed('readPollTimeoutInput');
        });
        if (readPollTimeout) {
          await testSubjects.setValue('readPollTimeoutInput', readPollTimeout);
        }
      }
      await testSubjects.click('submitButton');
      await retry.waitForWithTimeout('follower index to be in table', 45000, async () => {
        return await testSubjects.isDisplayed('maxReadReqSize');
      });
    },
    async createAutoFollowerPattern(name: string, indexPattern: string) {
      await testSubjects.setValue('nameInput', name);
      await comboBox.setCustom('comboBoxInput', indexPattern);
      await testSubjects.click('submitButton');
      await retry.waitForWithTimeout('flyout title to show up', 20000, async () => {
        return await testSubjects.isDisplayed('settingsValues');
      });
    },
    async clickAdvancedSettingsToggle() {
      await testSubjects.click('advancedSettingsToggle');
    },
  };
}
