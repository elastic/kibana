/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  describe('Triggers Actions UI plugin API', function () {
    const pageObjects = getPageObjects(['common']);
    const testSubjects = getService('testSubjects');
    const browser = getService('browser');
    const esArchiver = getService('esArchiver');

    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    afterEach(async () => {
      await browser.clearLocalStorage();
    });

    describe('when navigation to a page with one of our alert tables', function () {
      before(async () => {
        await pageObjects.common.navigateToApp('triggersActionsUiTest');
      });

      it('renders the alerts table correctly', async () => {
        await testSubjects.existOrFail('events-viewer-panel');
      });
    });
  });
}
