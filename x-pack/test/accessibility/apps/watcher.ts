/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'spaceSelector',
    'home',
    'header',
    'watcher',
    'security',
  ]);
  const a11y = getService('a11y');
  // const testSubjects = getService('testSubjects');
  // private readonly find = this.ctx.getService('find');

  describe('Kibana Stack Management Watcher a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('watcher');
      // await a11y.testAppSnapshot();
    });

    it('renders the page without a11y errors', async () => {
      await PageObjects.common.navigateToApp('watcher');
      await a11y.testAppSnapshot();
    });

    // //add noWatchesPage() in watcher page
    // it('a11y tests for no watches found', async () => {
    //   await PageObjects.watcher.noWatchesPage();
    //   await a11y.testAppSnapshot();
    // });

    it('a11y tests for create watch button', async function () {
      await PageObjects.watcher.createWatch('test', 'test');
      await a11y.testAppSnapshot();
    });

    it('a11y tests for getting the watches', async function () {
      await PageObjects.watcher.getWatch('test');
      await a11y.testAppSnapshot();
    });

    it('a11y tests for deleting the watches', async function () {
      await PageObjects.watcher.deleteWatch();
      await a11y.testAppSnapshot();
    });
  });
}
