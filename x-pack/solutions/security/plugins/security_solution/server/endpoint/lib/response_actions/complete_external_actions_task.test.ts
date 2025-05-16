/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE,
  COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_VERSION,
  CompleteExternalResponseActionsTask,
} from './complete_external_actions_task';
import { createMockEndpointAppContext } from '../../mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

describe('CompleteExternalActionsTask class', () => {
  let endpointAppContextMock: ReturnType<typeof createMockEndpointAppContext>;
  let taskInstance: CompleteExternalResponseActionsTask;

  beforeEach(() => {
    endpointAppContextMock = createMockEndpointAppContext();
    taskInstance = new CompleteExternalResponseActionsTask({
      endpointAppContext: endpointAppContextMock,
    });

    endpointAppContextMock.experimentalFeatures = {
      ...endpointAppContextMock.experimentalFeatures,
      responseActionsSentinelOneV2Enabled: true,
    };
  });

  describe('##setup()', () => {
    let taskManagerSetupContractMock: ReturnType<typeof taskManagerMock.createSetup>;

    beforeEach(() => {
      taskManagerSetupContractMock = taskManagerMock.createSetup();
    });

    it('should register task with task manager', async () => {
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).toHaveBeenCalledWith({
        [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
          title: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
          timeout: '20m',
          createTaskRunner: expect.any(Function),
        },
      });
    });

    it('should NOT register task with task manager if feature flag is disabled', async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsSentinelOneV2Enabled: false,
      };
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).not.toHaveBeenCalled();
    });

    it('should use timeout value from server config', async () => {
      endpointAppContextMock.serverConfig = {
        ...endpointAppContextMock.serverConfig,
        completeExternalResponseActionsTaskTimeout: '1000s',
      };
      await taskInstance.setup({ taskManager: taskManagerSetupContractMock });

      expect(taskManagerSetupContractMock.registerTaskDefinitions).toHaveBeenCalledWith({
        [COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE]: {
          title: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TITLE,
          timeout: '1000s',
          createTaskRunner: expect.any(Function),
        },
      });
    });
  });

  describe('#start()', () => {
    let taskManagerStartContractMock: ReturnType<typeof taskManagerMock.createStart>;
    let esClientMock: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

    const doTaskInstanceSetup = () =>
      taskInstance.setup({ taskManager: taskManagerMock.createSetup() });

    beforeEach(() => {
      taskManagerStartContractMock = taskManagerMock.createStart();
      esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    });

    it('should schedule task with task manager', async () => {
      await doTaskInstanceSetup();
      await taskInstance.start({
        taskManager: taskManagerStartContractMock,
        esClient: esClientMock,
      });

      expect(taskManagerStartContractMock.ensureScheduled).toHaveBeenCalledWith({
        id: `${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE}-${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_VERSION}`,
        taskType: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: '60s',
        },
        state: {},
        params: {},
      });
    });

    it('should NOT schedule task if feature flag is disabled', async () => {
      endpointAppContextMock.experimentalFeatures = {
        ...endpointAppContextMock.experimentalFeatures,
        responseActionsSentinelOneV2Enabled: false,
      };
      await doTaskInstanceSetup();
      await taskInstance.start({
        taskManager: taskManagerStartContractMock,
        esClient: esClientMock,
      });

      expect(taskManagerStartContractMock.ensureScheduled).not.toHaveBeenCalled();
    });

    it(`should use interval value from server config`, async () => {
      endpointAppContextMock.serverConfig = {
        ...endpointAppContextMock.serverConfig,
        completeExternalResponseActionsTaskInterval: '1000s',
      };
      await doTaskInstanceSetup();
      await taskInstance.start({
        taskManager: taskManagerStartContractMock,
        esClient: esClientMock,
      });

      expect(taskManagerStartContractMock.ensureScheduled).toHaveBeenCalledWith({
        id: `${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE}-${COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_VERSION}`,
        taskType: COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: '1000s',
        },
        state: {},
        params: {},
      });
    });
  });

  describe('#stop()', () => {
    it('should remove task definition from task manager', async () => {
      const taskManagerStartContractMock = taskManagerMock.createStart();
      await taskInstance.setup({ taskManager: taskManagerMock.createSetup() });
      await taskInstance.start({
        taskManager: taskManagerStartContractMock,
        esClient: elasticsearchServiceMock.createElasticsearchClient(),
      });
      await taskInstance.stop();

      expect(taskManagerStartContractMock.removeIfExists).toHaveBeenCalledWith(
        COMPLETE_EXTERNAL_RESPONSE_ACTIONS_TASK_TYPE
      );
    });
  });
});
