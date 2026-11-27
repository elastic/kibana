/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS,
  ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { syncEndpointWorkflows } from './install';

const workflowIds = [
  ...ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS,
  ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID,
];

const createClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
});

describe('endpoint workflow install', () => {
  it.each([true, false])('synchronizes global workflows with the flag %s', async (enabled) => {
    const client = createClient();
    await syncEndpointWorkflows({
      managedWorkflowsClient: client as never,
      experimentalFeatures: { automaticTroubleshootingUniversalSkill: enabled },
      logger: loggingSystemMock.createLogger(),
    });
    const action = enabled ? 'install' : 'uninstall';
    const otherAction = enabled ? 'uninstall' : 'install';
    expect(client[action]).toHaveBeenCalledTimes(workflowIds.length);
    for (const workflowId of workflowIds) {
      expect(client[action]).toHaveBeenCalledWith(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    }
    expect(client[otherAction]).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'warns per failure and continues without rejecting with the flag %s',
    async (enabled) => {
      const error = new Error('unavailable');
      const client = createClient();
      const action = enabled ? 'install' : 'uninstall';
      client[action].mockRejectedValue(error);
      const logger = loggingSystemMock.createLogger();

      await expect(
        syncEndpointWorkflows({
          managedWorkflowsClient: client as never,
          experimentalFeatures: { automaticTroubleshootingUniversalSkill: enabled },
          logger,
        })
      ).resolves.toBeUndefined();

      expect(client[action]).toHaveBeenCalledTimes(workflowIds.length);
      expect(logger.warn).toHaveBeenCalledTimes(workflowIds.length);
      for (const workflowId of ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS) {
        expect(logger.warn).toHaveBeenCalledWith(
          `Failed to ${action} the endpoint configuration troubleshooting workflow ${workflowId}`,
          { error }
        );
      }
      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to ${action} the endpoint knowledge workflow ${ENDPOINT_KNOWLEDGE_SEARCH_WORKFLOW_ID}`,
        { error }
      );
    }
  );
});
