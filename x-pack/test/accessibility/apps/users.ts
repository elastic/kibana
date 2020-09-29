/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// a11y tests for spaces, space selection and spacce creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['security', 'settings', 'common', 'header']);
  const a11y = getService('a11y');
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const toasts = getService('toasts');

  describe('Kibana users page meets a11y validations', () => {
    before(async () => {
      await esArchiver.load('empty_kibana');
      await PageObjects.security.clickElasticsearchUsers();
    });

    it('a11y test for user page', async () => {
      await a11y.testAppSnapshot();
    });

    it('a11y test for search user input box', async () => {
      await a11y.testAppSnapshot();
    });
  });
}
