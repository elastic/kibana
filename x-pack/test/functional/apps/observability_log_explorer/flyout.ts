/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
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
    time: NOW + 2000,
    logLevel: 'info',
  },
  {
    ...sharedDoc,
    time: NOW + 3000,
    message: 'document without log level',
  },
  {
    ...sharedDoc,
    time: NOW + 4000,
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const docTable = getService('docTable');
  const flyout = getService('flyout');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['discover', 'observabilityLogExplorer']);

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
        from: new Date(NOW - 60_000).toISOString(),
        to: new Date(NOW + 60_000).toISOString(),
      });
    });

    after('clean up archives', async () => {
      if (cleanupDataStreamSetup) {
        cleanupDataStreamSetup();
      }
    });

    it('should mount the flyout customization content', async () => {
      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.existOrFail('logExplorerFlyoutDetail');
    });

    it('should display a timestamp badge', async () => {
      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.existOrFail('logExplorerFlyoutLogTimestamp');
    });

    it('should display a log level badge when available', async () => {
      await PageObjects.observabilityLogExplorer.submitQuery('log.level : *');
      await retry.try(async () => {
        const rows = await docTable.getBodyRows();
        expect(rows.length).to.eql(2);
      });

      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.existOrFail('logExplorerFlyoutLogLevel');
      await flyout.ensureClosed('docTableDetailsFlyout');

      await PageObjects.observabilityLogExplorer.submitQuery('NOT log.level : *');
      await retry.try(async () => {
        const rows = await docTable.getBodyRows();
        expect(rows.length).to.eql(2);
      });

      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.missingOrFail('logExplorerFlyoutLogLevel');
    });

    it('should display a message code block when available', async () => {
      await PageObjects.observabilityLogExplorer.submitQuery('message : *');
      await retry.try(async () => {
        const rows = await docTable.getBodyRows();
        expect(rows.length).to.eql(2);
      });

      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.existOrFail('logExplorerFlyoutLogMessage');
      await flyout.ensureClosed('docTableDetailsFlyout');

      await PageObjects.observabilityLogExplorer.submitQuery('NOT message : *');
      await retry.try(async () => {
        const rows = await docTable.getBodyRows();
        expect(rows.length).to.eql(2);
      });

      await PageObjects.observabilityLogExplorer.openLogFlyout();
      await testSubjects.missingOrFail('logExplorerFlyoutLogMessage');
    });
  });
}
