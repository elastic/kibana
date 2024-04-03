/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'savedObjects']);

  describe('migration smoke test', function () {
    it('imports an 8.2 workpad', async function () {
      /*
        In 8.1 Canvas introduced by value embeddables, which requires expressions to know about embeddable migrations
        Starting in 8.3, we were seeing an error during migration where it would appear that an 8.2 workpad was
        from a future version.  This was because there were missing embeddable migrations on the expression because
        the Canvas plugin was adding the embeddable expression with all of it's migrations before other embeddables had
        registered their own migrations.

        This smoke test is intended to import an 8.2 workpad to ensure that we don't hit a similar scenario in the future
      */
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.waitTableIsLoaded();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '8.2.workpad.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
    });

    it('migrates a workpad from 8.1', async function () {
      /*
        This is a smoke test to make sure migrations don't fail.
        This workpad from 8.1 has both by-val and by-ref embeddables
      */
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaSavedObjects();
      await PageObjects.savedObjects.waitTableIsLoaded();
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '8.1.embeddable_test.ndjson')
      );
      await PageObjects.savedObjects.checkImportSucceeded();
      await PageObjects.savedObjects.clickImportDone();
    });
  });
}
