/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

const DATASET_NAME = 'flyout';
const NAMESPACE = 'default';
const DATA_STREAM_NAME = `logs-${DATASET_NAME}-${NAMESPACE}`;
const NOW = Date.now();

const sharedDoc = {
  logFilepath: '/flyout.log',
  serviceName: DATASET_NAME,
  datasetName: DATASET_NAME,
  namespace: NAMESPACE,
};

const docs = [
  {
    ...sharedDoc,
    time: NOW + 1000,
    message: 'full document',
    logLevel: 'info',
  },
  {
    ...sharedDoc,
    time: NOW,
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['observabilityLogsExplorer', 'svlCommonPage']);

  describe('Flyout content customization', () => {
    let cleanupDataStreamSetup: () => Promise<void>;

    before('initialize tests', async () => {
      cleanupDataStreamSetup = await PageObjects.observabilityLogsExplorer.setupDataStream(
        DATASET_NAME,
        NAMESPACE
      );
      await PageObjects.observabilityLogsExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
      await PageObjects.svlCommonPage.login();
    });

    beforeEach(async () => {
      await PageObjects.observabilityLogsExplorer.navigateTo({
        pageState: {
          time: {
            from: new Date(NOW - 60_000).toISOString(),
            to: new Date(NOW + 60_000).toISOString(),
            mode: 'absolute',
          },
        },
      });
    });

    after('clean up archives', async () => {
      await PageObjects.svlCommonPage.forceLogout();
      if (cleanupDataStreamSetup) {
        cleanupDataStreamSetup();
      }
    });

    it('should mount the flyout customization content', async () => {
      await dataGrid.clickRowToggle({ columnIndex: 4 });
      await testSubjects.existOrFail('logsExplorerFlyoutDetail');
    });

    it('should display a timestamp badge', async () => {
      await dataGrid.clickRowToggle({ columnIndex: 4 });
      await testSubjects.existOrFail('logsExplorerFlyoutLogTimestamp');
    });

    it('should display a log level badge when available', async () => {
      await dataGrid.clickRowToggle({ columnIndex: 4 });
      await testSubjects.existOrFail('logsExplorerFlyoutLogLevel');
      await dataGrid.closeFlyout();

      await dataGrid.clickRowToggle({ rowIndex: 1, columnIndex: 4 });
      await testSubjects.missingOrFail('logsExplorerFlyoutLogLevel');
    });

    it('should display a message code block when available', async () => {
      await dataGrid.clickRowToggle({ columnIndex: 4 });
      await testSubjects.existOrFail('logsExplorerFlyoutLogMessage');
      await dataGrid.closeFlyout();

      await dataGrid.clickRowToggle({ rowIndex: 1, columnIndex: 4 });
      await testSubjects.missingOrFail('logsExplorerFlyoutLogMessage');
    });
  });
}
