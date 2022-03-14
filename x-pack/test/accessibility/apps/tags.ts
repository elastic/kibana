/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common',
  'settings',
  'header',
    'tagManagement']);
  const a11y = getService('a11y');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');


  describe('Kibana tags page meets a11y validations', () => {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await testSubjects.click('tags');
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
        //await PageObjects.tagManagement.tagModal.clickConfirm();
        //await PageObjects.tagManagement.tagModal.clickCancel();
        await a11y.testAppSnapshot();
      });







  });
}
