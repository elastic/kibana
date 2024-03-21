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
  time: NOW + 1000,
  logFilepath: '/flyout.log',
  serviceName: 'frontend-node',
  datasetName: DATASET_NAME,
  namespace: NAMESPACE,
  message: 'full document',
  logLevel: 'info',
  traceId: 'abcdef',
  hostName: 'gke-edge-oblt-pool',
  orchestratorClusterId: 'my-cluster-id',
  orchestratorClusterName: 'my-cluster-id',
  orchestratorResourceId: 'orchestratorResourceId',
  cloudProvider: 'gcp',
  cloudRegion: 'us-central-1',
  cloudAz: 'us-central-1a',
  cloudProjectId: 'elastic-project',
  cloudInstanceId: 'BgfderflkjTheUiGuy',
  agentName: 'node',
};

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataGrid = getService('dataGrid');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['observabilityLogsExplorer']);

  describe('Flyout highlight customization', () => {
    let cleanupDataStreamSetup: () => Promise<void>;

    describe('Service & Infrastructure container', () => {
      const {
        serviceName,
        traceId,
        hostName,
        orchestratorClusterName,
        orchestratorResourceId,
        ...rest
      } = sharedDoc;
      const docWithoutServiceName = {
        ...rest,
        traceId,
        hostName,
        orchestratorClusterName,
        orchestratorResourceId,
        time: NOW - 1000,
      };
      const docWithoutServiceInfraContainer = { ...rest, time: NOW - 4000 };

      const docs = [sharedDoc, docWithoutServiceName, docWithoutServiceInfraContainer];
      before('setup DataStream', async () => {
        cleanupDataStreamSetup = await PageObjects.observabilityLogsExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogsExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
      });

      after('clean up DataStream', async () => {
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the service container with all fields', async () => {
        await dataGrid.clickRowToggle({ columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionServiceInfra');
        await testSubjects.existOrFail('logsExplorerFlyoutService');
        await testSubjects.existOrFail('logsExplorerFlyoutTrace');
        await testSubjects.existOrFail('logsExplorerFlyoutHostName');
        await testSubjects.existOrFail('logsExplorerFlyoutClusterName');
        await testSubjects.existOrFail('logsExplorerFlyoutResourceId');
        await dataGrid.closeFlyout();
      });

      it('should load the service container even when 1 field is missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1, columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionServiceInfra');
        await testSubjects.missingOrFail('logsExplorerFlyoutService');
        await testSubjects.existOrFail('logsExplorerFlyoutTrace');
        await testSubjects.existOrFail('logsExplorerFlyoutHostName');
        await testSubjects.existOrFail('logsExplorerFlyoutClusterName');
        await testSubjects.existOrFail('logsExplorerFlyoutResourceId');
        await dataGrid.closeFlyout();
      });

      it('should not load the service container if all fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 2, columnIndex: 4 });
        await testSubjects.missingOrFail('logsExplorerFlyoutHighlightSectionServiceInfra');
        await dataGrid.closeFlyout();
      });
    });

    describe('Cloud container', () => {
      const { cloudProvider, cloudInstanceId, cloudProjectId, cloudRegion, cloudAz, ...rest } =
        sharedDoc;
      const docWithoutCloudProviderAndInstanceId = {
        ...rest,
        cloudProjectId,
        cloudRegion,
        cloudAz,
        time: NOW - 1000,
      };
      const docWithoutCloudContainer = { ...rest, time: NOW - 2000 };

      const docs = [sharedDoc, docWithoutCloudProviderAndInstanceId, docWithoutCloudContainer];
      before('setup DataStream', async () => {
        cleanupDataStreamSetup = await PageObjects.observabilityLogsExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogsExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
      });

      after('clean up DataStream', async () => {
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the cloud container with all fields', async () => {
        await dataGrid.clickRowToggle({ columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionCloud');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudProvider');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudRegion');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudAz');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudProjectId');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudInstanceId');
        await dataGrid.closeFlyout();
      });

      it('should load the cloud container even when some fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1, columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionCloud');

        await testSubjects.missingOrFail('logsExplorerFlyoutCloudProvider');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudInstanceId');

        await testSubjects.existOrFail('logsExplorerFlyoutCloudRegion');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudAz');
        await testSubjects.existOrFail('logsExplorerFlyoutCloudProjectId');
        await dataGrid.closeFlyout();
      });

      it('should not load the cloud container if all fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 2, columnIndex: 4 });
        await testSubjects.missingOrFail('logsExplorerFlyoutHighlightSectionCloud');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudProvider');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudRegion');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudAz');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudProjectId');
        await testSubjects.missingOrFail('logsExplorerFlyoutCloudInstanceId');
        await dataGrid.closeFlyout();
      });
    });

    describe('Other container', () => {
      const { logFilepath, agentName, ...rest } = sharedDoc;
      const docWithoutLogPathAndAgentName = {
        ...rest,
        time: NOW - 1000,
      };

      const docs = [sharedDoc, docWithoutLogPathAndAgentName];
      before('setup DataStream', async () => {
        cleanupDataStreamSetup = await PageObjects.observabilityLogsExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogsExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
      });

      after('clean up DataStream', async () => {
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the other container with all fields', async () => {
        await dataGrid.clickRowToggle({ columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionOther');
        await testSubjects.existOrFail('logsExplorerFlyoutLogPathFile');
        await testSubjects.existOrFail('logsExplorerFlyoutNamespace');
        await testSubjects.existOrFail('logsExplorerFlyoutDataset');
        await testSubjects.existOrFail('logsExplorerFlyoutLogShipper');
        await dataGrid.closeFlyout();
      });

      it('should load the other container even when some fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1, columnIndex: 4 });
        await testSubjects.existOrFail('logsExplorerFlyoutHighlightSectionOther');

        await testSubjects.missingOrFail('logsExplorerFlyoutLogPathFile');
        await testSubjects.missingOrFail('logsExplorerFlyoutLogShipper');

        await testSubjects.existOrFail('logsExplorerFlyoutNamespace');
        await testSubjects.existOrFail('logsExplorerFlyoutDataset');
        await dataGrid.closeFlyout();
      });
    });
  });
}
