/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['searchSessionsManagement']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const esArchiver = getService('esArchiver');

  describe('Search sessions a11y tests', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/data/search_sessions');
      await PageObjects.searchSessionsManagement.goTo();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/data/search_sessions');
    });

    it('Search sessions management page populated with search sessions meets a11y requirements', async () => {
      await a11y.testAppSnapshot();
    });

    it('Toggle status panel meets a11y requirements', async () => {
      await (await find.byCssSelector('[data-text="Status"]')).click();
      await a11y.testAppSnapshot();
    });

    // https://github.com/elastic/kibana/issues/128009
    it.skip('Search sessions management toggled on a single status meets a11y requirements ', async () => {
      await (await find.byCssSelector('[title="expired"]')).click();

      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
      await testSubjects.click('clearSearchButton');
    });

    it('App filter panel meets a11y requirements', async () => {
      await (await find.byCssSelector('[data-text="App"]')).click();
      await a11y.testAppSnapshot();
    });

    it('Session management filtered by applications meets a11y requirements', async () => {
      await (await find.byCssSelector('[title="dashboards"]')).click();
      await a11y.testAppSnapshot();
    });

    it('Session management more actions panel pop-over meets a111y requirements', async () => {
      await testSubjects.click('sessionManagementActionsCol');
      await a11y.testAppSnapshot();
    });

    it('Session management inspect panel from actions pop-over meets a111y requirements', async () => {
      await testSubjects.click('sessionManagementPopoverAction-inspect');
      await a11y.testAppSnapshot();
    });

    it('Session management edit name panel from actions pop-over meets a11y requirements ', async () => {
      await testSubjects.click('euiFlyoutCloseButton');
      await testSubjects.click('sessionManagementActionsCol');
      await testSubjects.click('sessionManagementPopoverAction-rename');
      await a11y.testAppSnapshot();
    });

    it('Session management delete panel from actions pop-over meets a11y requirements ', async () => {
      await testSubjects.click('cancelEditName');
      await testSubjects.click('sessionManagementActionsCol');
      await testSubjects.click('sessionManagementPopoverAction-delete');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalCancelButton');

      await testSubjects.click('clearSearchButton');
    });
  });
}
