/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { installStatic, PND_WATCH_WORKFLOW_IDS } from './install_static';

const createDependencies = () => {
  const client = {
    install: jest.fn().mockResolvedValue(undefined),
    ready: jest.fn().mockResolvedValue(undefined),
  };
  const workflowsExtensions = {
    initManagedWorkflowsClient: jest.fn().mockResolvedValue(client),
  } as unknown as WorkflowsExtensionsServerPluginStart;
  const logger = loggerMock.create();

  return { client, workflowsExtensions, logger };
};

describe('installStatic', () => {
  describe('when enabled', () => {
    it('installs the complete owner set before reconciliation', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();

      await installStatic({ enabled: true, workflowsExtensions, logger });

      expect(client.install.mock.calls.map(([id]) => id)).toEqual(PND_WATCH_WORKFLOW_IDS);
      expect(client.ready).toHaveBeenCalledTimes(1);
    });

    it('does not reconcile a partial owner set', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();
      client.install.mockImplementation(async (id) => {
        if (id === PND_WATCH_WORKFLOW_IDS[1]) {
          throw new Error('install failed');
        }
      });

      const result = await installStatic({ enabled: true, workflowsExtensions, logger });

      expect(result.failedIds).toEqual([PND_WATCH_WORKFLOW_IDS[1]]);
      expect(client.ready).not.toHaveBeenCalled();
    });
  });

  describe('when disabled', () => {
    it('does not initialize the managed workflows client or install anything', async () => {
      const { client, workflowsExtensions, logger } = createDependencies();

      await installStatic({ enabled: false, workflowsExtensions, logger });

      expect(workflowsExtensions.initManagedWorkflowsClient).not.toHaveBeenCalled();
      expect(client.install).not.toHaveBeenCalled();
      expect(client.ready).not.toHaveBeenCalled();
    });
  });
});
