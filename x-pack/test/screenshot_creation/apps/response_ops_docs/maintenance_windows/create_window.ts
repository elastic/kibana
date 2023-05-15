/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'maintenance_windows'];

  describe('create maintenance window', function () {
    it('create window screenshot', async () => {
      await pageObjects.common.navigateToApp('maintenanceWindows');
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'create-maintenance-window',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
