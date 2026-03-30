/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-search';
import { expect } from '@kbn/scout-search/ui';
import { test } from '../fixtures';

test.describe(
  'Getting Started - Viewer: Serverless search',
  { tag: [...tags.serverless.search] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.gettingStarted.goto();
    });

    test(
      'should show Changelog label in Kibana version on serverless',
      { tag: [...tags.serverless.search] },
      async ({ pageObjects }) => {
        const versionBadge = await pageObjects.gettingStarted.getKibanaVersionBadge();
        await expect(versionBadge).toContainText('Changelog');
      }
    );
  }
);
