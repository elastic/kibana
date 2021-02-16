/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const a11y = getService('a11y');
  const { click, exists } = getService('testSubjects');
  const { common } = getPageObjects(['common']);
  const { load } = getService('esArchiver');
  const { waitFor } = getService('retry');

  describe('Canvas', () => {
    before(async () => {
      await load('canvas/default');
      await common.navigateToApp('canvas');
    });

    it('loads workpads', async function () {
      await waitFor(
        'canvas workpads visible',
        async () => await exists('canvasWorkpadLoaderTable')
      );
      await a11y.testAppSnapshot();
    });

    it('provides bulk actions', async function () {
      await click('checkboxSelectAll');
      await waitFor('canvas bulk actions visible', async () => await exists('deleteWorkpadButton'));
      await a11y.testAppSnapshot();
    });

    it('can delete workpads', async function () {
      await click('deleteWorkpadButton');
      await waitFor('canvas delete modal visible', async () => await exists('canvasConfirmModal'));
      await a11y.testAppSnapshot();
    });

    it('can navigate to templates', async function () {
      await click('confirmModalCancelButton'); // close modal from previous test

      await click('workpadTemplates');
      await waitFor('canvas templates visible', async () => await exists('canvasTemplatesTable'));
      await a11y.testAppSnapshot();
    });
  });
}
