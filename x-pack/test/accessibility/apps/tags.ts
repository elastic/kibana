/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'home', 'tagManagement']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  describe('Kibana tags page meets a11y validations', () => {
    before(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.addSampleDataSet('flights');
      await PageObjects.settings.navigateTo();
      await testSubjects.click('tags');
    });

    after(async () => {
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.home.removeSampleDataSet('flights');
    });

    it('tags main page meets a11y validations', async () => {
      await a11y.testAppSnapshot();
    });

    it('create tag panel meets a11y validations', async () => {
      await testSubjects.click('createTagButton');
      await a11y.testAppSnapshot();
    });

    it('tag listing page meets a11y validations', async () => {
      await PageObjects.tagManagement.tagModal.fillForm(
        {
          name: 'a11yTag',
          color: '#fc03db',
          description: 'a11y test tag',
        },
        {
          submit: true,
        }
      );
      await a11y.testAppSnapshot();
    });

    it('edit tag panel meets a11y validations', async () => {
      const tagName = 'a11yTag';
      await PageObjects.tagManagement.tagModal.openEdit(tagName);
      await a11y.testAppSnapshot();
    });

    it('tag actions panel meets a11y requirements', async () => {
      await testSubjects.click('createModalCancelButton');

      await testSubjects.click('euiCollapsedItemActionsButton');
      await a11y.testAppSnapshot();
    });

    it('tag assignment panel meets a11y requirements', async () => {
      await testSubjects.click('euiCollapsedItemActionsButton');
      const actionOnTag = 'assign';
      await PageObjects.tagManagement.clickActionItem(actionOnTag);
      await a11y.testAppSnapshot();
    });

    it('tag management page with connections column populated meets a11y requirements', async () => {
      await testSubjects.click('assignFlyout-selectAllButton');

      await testSubjects.click('assignFlyoutConfirmButton');
      await toasts.dismissAllToasts();

      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
    });

    it('bulk actions panel meets a11y requirements', async () => {
      await testSubjects.click('createTagButton');
      await PageObjects.tagManagement.tagModal.fillForm(
        {
          name: 'a11yTag2',
          color: '#fc04db',
          description: 'a11y test tag2',
        },
        {
          submit: true,
        }
      );
      await testSubjects.click('checkboxSelectAll');
      await PageObjects.tagManagement.openActionMenu();
      await a11y.testAppSnapshot();
    });

    it('Delete tags panel meets a11y requirements', async () => {
      await testSubjects.click('actionBar-button-delete');
      await a11y.testAppSnapshot();
      await testSubjects.click('confirmModalConfirmButton');
    });
  });
}
