/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';
import { getInitialTestLogs } from '../../dataset_quality/data';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'observabilityLogsExplorer',
    'datasetQuality',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);
  const synthtrace = getService('svlLogsSynthtraceClient');
  const testSubjects = getService('testSubjects');
  const to = '2024-01-01T12:00:00.000Z';
  const pkg = {
    name: 'apache',
    version: '1.14.0',
  };

  describe('Logs Essentials Dataset quality table filters', function () {
    before(async () => {
      // Install Integration and ingest logs for it
      await PageObjects.observabilityLogsExplorer.installPackage(pkg);
      // Ingest basic logs
      await synthtrace.index([
        // Ingest basic logs
        getInitialTestLogs({ to, count: 4 }),
      ]);

      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
      await PageObjects.datasetQuality.navigateTo();
    });

    after(async () => {
      await PageObjects.observabilityLogsExplorer.uninstallPackage(pkg);
      await synthtrace.clean();
    });

    it('types filter should not be rendered', async () => {
      await testSubjects.missingOrFail(
        PageObjects.datasetQuality.testSubjectSelectors.datasetQualityTypesSelectable
      );
    });
  });
}
