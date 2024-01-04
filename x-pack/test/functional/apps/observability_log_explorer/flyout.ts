/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

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
  const PageObjects = getPageObjects(['observabilityLogExplorer']);

  describe('Flyout content customization', () => {
    let cleanupDataStreamSetup: () => Promise<void>;

    before('initialize tests', async () => {
      cleanupDataStreamSetup = await PageObjects.observabilityLogExplorer.setupDataStream(
        DATASET_NAME,
        NAMESPACE
      );
      await PageObjects.observabilityLogExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
    });

    beforeEach(async () => {
      await PageObjects.observabilityLogExplorer.navigateTo({
        pageState: {
          time: {
            from: new Date(NOW - 60_000).toISOString(),
            to: new Date(NOW + 60_000).toISOString(),
            mode: 'absolute',
          },
        },
      });
    });

    after('clean up DataStream', async () => {
      if (cleanupDataStreamSetup) {
        await cleanupDataStreamSetup();
      }
    });

    it('should mount the flyout customization content', async () => {
      await dataGrid.clickRowToggle();
      await testSubjects.existOrFail('logExplorerFlyoutDetail');
    });

    it('should display a timestamp badge', async () => {
      await dataGrid.clickRowToggle();
      await testSubjects.existOrFail('logExplorerFlyoutLogTimestamp');
    });

    it('should display a log level badge when available', async () => {
      await dataGrid.clickRowToggle();
      await testSubjects.existOrFail('logExplorerFlyoutLogLevel');
      await dataGrid.closeFlyout();

      await dataGrid.clickRowToggle({ rowIndex: 1 });
      await testSubjects.missingOrFail('logExplorerFlyoutLogLevel');
    });

    it('should display a message code block when available', async () => {
      await dataGrid.clickRowToggle();
      await testSubjects.existOrFail('logExplorerFlyoutLogMessage');
      await dataGrid.closeFlyout();

      await dataGrid.clickRowToggle({ rowIndex: 1 });
      await testSubjects.missingOrFail('logExplorerFlyoutLogMessage');
    });
  });
}
