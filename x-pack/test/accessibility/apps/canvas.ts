/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const { common } = getPageObjects(['common']);

  describe('Canvas Accessibility', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/canvas/default');
      await common.navigateToApp('canvas');
    });

    it('loads workpads', async function () {
      await retry.waitFor(
        'canvas workpads visible',
        async () => await testSubjects.exists('canvasWorkpadTable')
      );
      await a11y.testAppSnapshot();
    });

    it('provides bulk actions', async function () {
      await testSubjects.click('checkboxSelectAll');
      await retry.waitFor(
        'canvas bulk actions visible',
        async () => await testSubjects.exists('deleteWorkpadButton')
      );
      await a11y.testAppSnapshot();
    });

    it('can delete workpads', async function () {
      await testSubjects.click('deleteWorkpadButton');
      await retry.waitFor(
        'canvas delete modal visible',
        async () => await testSubjects.exists('canvasConfirmModal')
      );
      await a11y.testAppSnapshot();
    });

    it('can navigate to templates', async function () {
      await testSubjects.click('confirmModalCancelButton'); // close modal from previous test

      await testSubjects.click('workpadTemplates');
      await retry.waitFor(
        'canvas templates visible',
        async () => await testSubjects.exists('canvasTemplatesTable')
      );
      await a11y.testAppSnapshot();
    });
  });
}
