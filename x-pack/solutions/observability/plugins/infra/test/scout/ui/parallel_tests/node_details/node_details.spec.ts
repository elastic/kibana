/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { K8S_HOST_NAME } from '../../fixtures/constants';

test.describe('Node Details', { tag: ['@svlOblt'] }, () => {
  test(
    'Serverless: Osquery tab should not render in serverless',
    {
      tag: ['@svlOblt'],
    },
    async ({ browserAuth, pageObjects: { nodeDetailsPage } }) => {
      await browserAuth.loginAsViewer();
      await nodeDetailsPage.goToPage(K8S_HOST_NAME, 'host', { name: K8S_HOST_NAME });

      await test.step('verify Osquery tab does not exist in serverless', async () => {
        await expect(nodeDetailsPage.osqueryTab).toBeHidden();
      });
    }
  );
});
