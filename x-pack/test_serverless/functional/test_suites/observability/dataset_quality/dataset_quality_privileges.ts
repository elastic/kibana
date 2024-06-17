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
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('svlLogsSynthtraceClient');
  const find = getService('find');
  const to = '2024-01-01T12:00:00.000Z';

  describe('Dataset quality user privileges', function () {
    this.tags(['failsOnMKI']);

    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('viewer');
      await synthtrace.index(getInitialTestLogs({ to, count: 4 }));
      await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await synthtrace.clean();
    });

    it('Active Datasets stat is not available due to underprivileged user', async () => {
      await testSubjects.existOrFail(
        `${PageObjects.datasetQuality.testSubjectSelectors.datasetQualityInsufficientPrivileges}-${PageObjects.datasetQuality.texts.activeDatasets}`
      );
    });

    it('"Show inactive datasets" is hidden when lastActivity is not available', async () => {
      await find.waitForDeletedByCssSelector(
        PageObjects.datasetQuality.selectors.showInactiveDatasetsNamesSwitch
      );
    });

    it('does not show last activity column for underprivileged data stream', async () => {
      const cols = await PageObjects.datasetQuality.getDatasetTableHeaderTexts();

      expect(cols).to.not.contain('Last Activity');
    });

    it('does not show size and last activity columns for underprivileged data stream', async () => {
      const cols = await PageObjects.datasetQuality.getDatasetTableHeaderTexts();

      expect(cols).to.not.contain('Size');
      expect(cols).to.not.contain('Last Activity');
    });
  });
}
