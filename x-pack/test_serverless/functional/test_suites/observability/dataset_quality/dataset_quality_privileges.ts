/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getInitialTestLogs } from './data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'navigationalSearch',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality user privileges', function () {
    this.tags(['failsOnMKI']);

    before(async () => {
      await PageObjects.svlCommonPage.loginAsViewer();
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('does not show size and last activity columns for underprivileged data stream', async () => {
      const cols = await PageObjects.datasetQuality.getDatasetTableHeaderTexts();

      expect(cols).to.not.contain('Size');
    });
  });
}
