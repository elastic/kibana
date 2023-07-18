/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const commonScreenshots = getService('commonScreenshots');
  const observability = getService('observability');
  const pageObjects = getPageObjects(['common', 'header']);
  const screenshotDirectories = ['response_ops_docs', 'observability_alerting'];

  describe('list view', function () {
    it('observability rules list screenshot', async () => {
      await observability.alerts.common.navigateToRulesPage();
      await pageObjects.header.waitUntilLoadingHasFinished();
      await commonScreenshots.takeScreenshot(
        'create-alerts-manage-rules',
        screenshotDirectories,
        1400,
        1024
      );
    });
  });
}
