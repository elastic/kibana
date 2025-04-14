/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { testHasEmbeddedConsole } from './embedded_console';

export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects([
    'svlCommonPage',
    'svlCommonNavigation',
    'common',
    'svlIngestPipelines',
    'svlManagementPage',
    'embeddedConsole',
  ]);
  describe('ingest pipelines', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('developer');
      await pageObjects.svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await pageObjects.svlCommonNavigation.sidenav.clickLink({ navId: 'management' });
      await pageObjects.svlCommonNavigation.sidenav.clickPanelLink('management:ingest_pipelines');
    });

    it('has embedded console', async () => {
      await testHasEmbeddedConsole(pageObjects);
    });
  });
}
