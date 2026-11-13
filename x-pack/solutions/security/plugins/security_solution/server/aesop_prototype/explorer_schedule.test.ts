/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AESOP_EXPLORER_WORKFLOW_ID } from '@kbn/workflows/managed';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { SecurityManagedWorkflowsClient } from '../workflows/managed_workflows';
import {
  aesopExplorerDocumentId,
  enableAesopExplorer,
  uninstallAesopExplorer,
} from './explorer_schedule';

const values = {
  mode: 'telemetry',
  intervalMinutes: 1440,
  connectorId: 'connector-1',
  datasetId: 'dataset-1',
  abAgentId: 'agent-1',
  investigationId: 'inv-1',
} as const;

const createClient = () => {
  const install = jest.fn().mockResolvedValue(undefined);
  const uninstall = jest.fn().mockResolvedValue(undefined);
  const client = { install, uninstall } as unknown as SecurityManagedWorkflowsClient;
  return { client, install, uninstall };
};

describe('aesopExplorerDocumentId', () => {
  it('is the definition id plus the mode', () => {
    expect(aesopExplorerDocumentId('discovery')).toBe(`${AESOP_EXPLORER_WORKFLOW_ID}-discovery`);
  });
});

describe('enableAesopExplorer', () => {
  it('installs the instance for its mode, then enables it in the request space', async () => {
    const { client, install } = createClient();
    const updateWorkflow = jest.fn().mockResolvedValue(undefined);
    const request = httpServerMock.createKibanaRequest();

    await expect(
      enableAesopExplorer(
        {
          getManagedWorkflowsClient: async () => client,
          workflowsManagement: { updateWorkflow },
          logger: loggerMock.create(),
          request,
          spaceId: 'sec',
        },
        values
      )
    ).resolves.toEqual({ documentId: `${AESOP_EXPLORER_WORKFLOW_ID}-telemetry` });

    expect(install).toHaveBeenCalledWith(AESOP_EXPLORER_WORKFLOW_ID, {
      spaceId: 'sec',
      workflowIdSuffix: 'telemetry',
      values,
    });
    expect(updateWorkflow).toHaveBeenCalledWith(
      `${AESOP_EXPLORER_WORKFLOW_ID}-telemetry`,
      { enabled: true },
      'sec',
      request
    );
    expect(install.mock.invocationCallOrder[0]).toBeLessThan(
      updateWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('refuses to install when it cannot be enabled', async () => {
    const { client, install } = createClient();

    await expect(
      enableAesopExplorer(
        {
          getManagedWorkflowsClient: async () => client,
          logger: loggerMock.create(),
          request: httpServerMock.createKibanaRequest(),
          spaceId: 'default',
        },
        values
      )
    ).rejects.toThrow(/workflows management plugin is not available/);
    expect(install).not.toHaveBeenCalled();
  });
});

describe('uninstallAesopExplorer', () => {
  it('removes the instance for the mode in the given space', async () => {
    const { client, uninstall } = createClient();

    await uninstallAesopExplorer(
      {
        getManagedWorkflowsClient: async () => client,
        logger: loggerMock.create(),
        spaceId: 'sec',
      },
      { mode: 'discovery' }
    );

    expect(uninstall).toHaveBeenCalledWith(AESOP_EXPLORER_WORKFLOW_ID, {
      spaceId: 'sec',
      workflowIdSuffix: 'discovery',
    });
  });
});
