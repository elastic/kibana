/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { syncEndpointConfigurationTroubleshootingWorkflows } from './install';

const createClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
});

describe('endpoint configuration troubleshooting workflow install', () => {
  it('installs with the flag on and uninstalls with it off, both in the global space', async () => {
    const logger = loggingSystemMock.createLogger();

    const flagOnClient = createClient();
    await syncEndpointConfigurationTroubleshootingWorkflows({
      managedWorkflowsClient: flagOnClient as never,
      enabled: true,
      logger,
    });

    for (const workflowId of ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS) {
      expect(flagOnClient.install).toHaveBeenCalledWith(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    }
    expect(flagOnClient.uninstall).not.toHaveBeenCalled();

    const flagOffClient = createClient();
    await syncEndpointConfigurationTroubleshootingWorkflows({
      managedWorkflowsClient: flagOffClient as never,
      enabled: false,
      logger,
    });

    for (const workflowId of ENDPOINT_CONFIGURATION_TROUBLESHOOTING_WORKFLOW_IDS) {
      expect(flagOffClient.uninstall).toHaveBeenCalledWith(workflowId, {
        spaceId: GLOBAL_WORKFLOW_SPACE_ID,
      });
    }
    expect(flagOffClient.install).not.toHaveBeenCalled();
  });
});
