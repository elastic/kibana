/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuditLogger } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  analyticsServiceMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { PrivilegeMonitoringGlobalDependencies } from '../data_client';
import { PrivilegeMonitoringDataClient } from '../data_client';
import type { PrivmonIndexService } from './indices';
import { createPrivmonIndexService } from './indices';
import { PRIVMON_EVENT_INGEST_PIPELINE_ID, eventIngestPipeline } from './pipeline';

const mockCreateOrUpdateIndex = jest.fn();
jest.mock('../../../utils/create_or_update_index', () => ({
  createOrUpdateIndex: () => mockCreateOrUpdateIndex(),
}));

describe('Privileged User Monitoring: Indices Service', () => {
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const loggerMock = loggingSystemMock.createLogger();
  const auditMock = { log: jest.fn().mockReturnValue(undefined) } as unknown as AuditLogger;
  const telemetryMock = analyticsServiceMock.createAnalyticsServiceSetup();

  const savedObjectServiceMock = savedObjectsServiceMock.createStartContract();
  const deps: PrivilegeMonitoringGlobalDependencies = {
    logger: loggerMock,
    clusterClient: clusterClientMock,
    namespace: 'default',
    kibanaVersion: '9.0.0',
    taskManager: {} as TaskManagerStartContract,
    auditLogger: auditMock,
    telemetry: telemetryMock,
    savedObjects: savedObjectServiceMock,
  };

  let indexService: PrivmonIndexService;
  let dataClient: PrivilegeMonitoringDataClient;

  beforeEach(() => {
    jest.clearAllMocks();
    dataClient = new PrivilegeMonitoringDataClient(deps);
    indexService = createPrivmonIndexService(dataClient);
  });
  describe('upsert index', () => {
    it('should log a message if index already exists', async () => {
      const error = {
        meta: {
          body: {
            error: {
              type: 'resource_already_exists_exception',
            },
          },
        },
      };

      mockCreateOrUpdateIndex.mockRejectedValue(error);
      await indexService._upsertIndex();

      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('Privilege monitoring index already exists.')
      );
    });
  });

  describe('create ingest pipeline', () => {
    it('should simply log a message if the pipeline already exists', async () => {
      clusterClientMock.asInternalUser.ingest.getPipeline.mockResolvedValue({
        [PRIVMON_EVENT_INGEST_PIPELINE_ID]: {},
      });

      await indexService._createIngestPipelineIfDoesNotExist();

      expect(clusterClientMock.asInternalUser.ingest.getPipeline).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Privileged user monitoring ingest pipeline already exists.')
      );
    });

    it('should only create a pipeline if no existing pipeline exists', async () => {
      clusterClientMock.asInternalUser.ingest.getPipeline.mockResolvedValue({});

      await indexService._createIngestPipelineIfDoesNotExist();

      expect(clusterClientMock.asInternalUser.ingest.putPipeline).toHaveBeenCalledWith(
        expect.objectContaining(eventIngestPipeline)
      );

      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'Privileged user monitoring ingest pipeline does not exist, creating.'
        )
      );
    });
  });
});
