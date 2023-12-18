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
  const PageObjects = getPageObjects(['observabilityLogExplorer', 'svlCommonPage']);

  describe('Flyout highlight customization', () => {
    let cleanupDataStreamSetup: () => Promise<void>;

    describe('Service container', () => {
      const { serviceName, traceId, ...rest } = sharedDoc;
      const docWithoutServiceName = { ...rest, traceId, time: NOW - 1000 };
      const docWithoutTraceId = { ...rest, serviceName, time: NOW - 2000 };
      const docWithoutServiceContainer = { ...rest, time: NOW - 4000 };

      const docs = [
        sharedDoc,
        docWithoutServiceName,
        docWithoutTraceId,
        docWithoutServiceContainer,
      ];
      before('setup DataStream', async () => {
        cleanupDataStreamSetup = await PageObjects.observabilityLogExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
        await PageObjects.svlCommonPage.login();
      });

      after('clean up DataStream', async () => {
        await PageObjects.svlCommonPage.forceLogout();
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the service container with all fields', async () => {
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionService');
        await testSubjects.existOrFail('logExplorerFlyoutService');
        await testSubjects.existOrFail('logExplorerFlyoutTrace');
        await dataGrid.closeFlyout();
      });

      it('should load the service container even when 1 field is missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionService');
        await testSubjects.missingOrFail('logExplorerFlyoutService');
        await testSubjects.existOrFail('logExplorerFlyoutTrace');
        await dataGrid.closeFlyout();
      });

      it('should not load the service container if all fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 3 });
        await testSubjects.missingOrFail('logExplorerFlyoutHighlightSectionService');
        await testSubjects.missingOrFail('logExplorerFlyoutService');
        await testSubjects.missingOrFail('logExplorerFlyoutTrace');
        await dataGrid.closeFlyout();
      });
    });

    describe('Infrastructure container', () => {
      const { hostName, orchestratorClusterName, orchestratorResourceId, ...rest } = sharedDoc;
      const docWithoutHostName = {
        ...rest,
        orchestratorClusterName,
        orchestratorResourceId,
        time: NOW - 1000,
      };
      const docWithoutInfrastructureContainer = { ...rest, time: NOW - 2000 };

      const docs = [sharedDoc, docWithoutHostName, docWithoutInfrastructureContainer];
      before('setup DataStream', async () => {
        cleanupDataStreamSetup = await PageObjects.observabilityLogExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
        await PageObjects.svlCommonPage.login();
      });

      after('clean up DataStream', async () => {
        await PageObjects.svlCommonPage.forceLogout();
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the infrastructure container with all fields', async () => {
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionInfrastructure');
        await testSubjects.existOrFail('logExplorerFlyoutHostName');
        await testSubjects.existOrFail('logExplorerFlyoutClusterName');
        await testSubjects.existOrFail('logExplorerFlyoutResourceId');
        await dataGrid.closeFlyout();
      });

      it('should load the infrastructure container even when 1 field is missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionInfrastructure');
        await testSubjects.missingOrFail('logExplorerFlyoutHostName');
        await testSubjects.existOrFail('logExplorerFlyoutClusterName');
        await testSubjects.existOrFail('logExplorerFlyoutResourceId');
        await dataGrid.closeFlyout();
      });

      it('should not load the infrastructure container if all fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 2 });
        await testSubjects.missingOrFail('logExplorerFlyoutHighlightSectionInfrastructure');
        await testSubjects.missingOrFail('logExplorerFlyoutHostName');
        await testSubjects.missingOrFail('logExplorerFlyoutClusterName');
        await testSubjects.missingOrFail('logExplorerFlyoutResourceId');
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
        cleanupDataStreamSetup = await PageObjects.observabilityLogExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
        await PageObjects.svlCommonPage.login();
      });

      after('clean up DataStream', async () => {
        await PageObjects.svlCommonPage.forceLogout();
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the cloud container with all fields', async () => {
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionCloud');
        await testSubjects.existOrFail('logExplorerFlyoutCloudProvider');
        await testSubjects.existOrFail('logExplorerFlyoutCloudRegion');
        await testSubjects.existOrFail('logExplorerFlyoutCloudAz');
        await testSubjects.existOrFail('logExplorerFlyoutCloudProjectId');
        await testSubjects.existOrFail('logExplorerFlyoutCloudInstanceId');
        await dataGrid.closeFlyout();
      });

      it('should load the cloud container even when some fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionCloud');

        await testSubjects.missingOrFail('logExplorerFlyoutCloudProvider');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudInstanceId');

        await testSubjects.existOrFail('logExplorerFlyoutCloudRegion');
        await testSubjects.existOrFail('logExplorerFlyoutCloudAz');
        await testSubjects.existOrFail('logExplorerFlyoutCloudProjectId');
        await dataGrid.closeFlyout();
      });

      it('should not load the cloud container if all fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 2 });
        await testSubjects.missingOrFail('logExplorerFlyoutHighlightSectionCloud');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudProvider');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudRegion');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudAz');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudProjectId');
        await testSubjects.missingOrFail('logExplorerFlyoutCloudInstanceId');
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
        cleanupDataStreamSetup = await PageObjects.observabilityLogExplorer.setupDataStream(
          DATASET_NAME,
          NAMESPACE
        );
        await PageObjects.observabilityLogExplorer.ingestLogEntries(DATA_STREAM_NAME, docs);
        await PageObjects.svlCommonPage.login();
      });

      after('clean up DataStream', async () => {
        await PageObjects.svlCommonPage.forceLogout();
        if (cleanupDataStreamSetup) {
          await cleanupDataStreamSetup();
        }
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

      it('should load the other container with all fields', async () => {
        await dataGrid.clickRowToggle();
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionOther');
        await testSubjects.existOrFail('logExplorerFlyoutLogPathFile');
        await testSubjects.existOrFail('logExplorerFlyoutNamespace');
        await testSubjects.existOrFail('logExplorerFlyoutDataset');
        await testSubjects.existOrFail('logExplorerFlyoutLogShipper');
        await dataGrid.closeFlyout();
      });

      it('should load the other container even when some fields are missing', async () => {
        await dataGrid.clickRowToggle({ rowIndex: 1 });
        await testSubjects.existOrFail('logExplorerFlyoutHighlightSectionOther');

        await testSubjects.missingOrFail('logExplorerFlyoutLogPathFile');
        await testSubjects.missingOrFail('logExplorerFlyoutLogShipper');

        await testSubjects.existOrFail('logExplorerFlyoutNamespace');
        await testSubjects.existOrFail('logExplorerFlyoutDataset');
        await dataGrid.closeFlyout();
      });
    });
  });
}
