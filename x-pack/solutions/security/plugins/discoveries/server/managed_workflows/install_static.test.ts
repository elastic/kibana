/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import { AD_WORKFLOW_IDS, installStatic } from './install_static';

const createMockLifecycleClient = () => ({
  execute: jest.fn().mockResolvedValue('mock-execution-id'),
  install: jest.fn().mockResolvedValue(undefined),
  installMany: jest.fn().mockResolvedValue({ failed: [] }),
  ready: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
});

const createMockWorkflowsExtensionsStart = (lifecycleClient = createMockLifecycleClient()) =>
  ({
    initManagedWorkflowsClient: jest.fn().mockResolvedValue(lifecycleClient),
  } as unknown as WorkflowsExtensionsServerPluginStart);

describe('installStatic', () => {
  // Guards against reintroducing the legacy, non-prefixed workflow-id duplicates
  // that previously lived in `@kbn/discoveries` and collided (same constant
  // names, different values) with the canonical ids. `@kbn/workflows/managed` is
  // now the single source of truth and every managed workflow id is `system-`
  // prefixed, so if `AD_WORKFLOW_IDS` ever points at a non-prefixed alias again
  // this fails loudly.
  it('installs only canonical, system-prefixed workflow ids', () => {
    AD_WORKFLOW_IDS.forEach((id) => {
      expect(id.startsWith('system-')).toBe(true);
    });
  });

  describe('when enabled', () => {
    it('initialises the managed workflows client with the discoveries plugin id exactly once', async () => {
      const lifecycleClient = createMockLifecycleClient();
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      await installStatic({ enabled: true, workflowsExtensions });

      expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith('discoveries');
    });

    it('installs all 7 AD workflow IDs with GLOBAL_WORKFLOW_SPACE_ID in one batch', async () => {
      const lifecycleClient = createMockLifecycleClient();
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      await installStatic({ enabled: true, workflowsExtensions });

      expect(lifecycleClient.installMany).toHaveBeenCalledTimes(1);
      expect(lifecycleClient.installMany).toHaveBeenCalledWith(
        [
          ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID,
          ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
          ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
          ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
          ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID,
          ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID,
          ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
        ].map((id) => ({ id, spaceId: GLOBAL_WORKFLOW_SPACE_ID }))
      );
      expect(lifecycleClient.install).not.toHaveBeenCalled();
    });

    it('calls ready() exactly once after the batch install', async () => {
      const callOrder: string[] = [];
      const lifecycleClient = {
        installMany: jest.fn().mockImplementation(async () => {
          callOrder.push('installMany');
          return { failed: [] };
        }),
        ready: jest.fn().mockImplementation(async () => {
          callOrder.push('ready');
        }),
      };
      const workflowsExtensions = {
        initManagedWorkflowsClient: jest.fn().mockResolvedValue(lifecycleClient),
      } as unknown as WorkflowsExtensionsServerPluginStart;

      await installStatic({ enabled: true, workflowsExtensions });

      expect(lifecycleClient.ready).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(['installMany', 'ready']);
    });

    it('returns { failedIds: [] } when all installs succeed', async () => {
      const workflowsExtensions = createMockWorkflowsExtensionsStart();

      const result = await installStatic({ enabled: true, workflowsExtensions });

      expect(result).toEqual({ failedIds: [] });
    });

    it('returns the failed IDs and still calls ready() when individual installs fail', async () => {
      const failingId = ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID;
      const lifecycleClient = createMockLifecycleClient();
      lifecycleClient.installMany.mockResolvedValue({
        failed: [
          { id: failingId, spaceId: GLOBAL_WORKFLOW_SPACE_ID, error: new Error('install failed') },
        ],
      });
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      const result = await installStatic({ enabled: true, workflowsExtensions });

      expect(result.failedIds).toEqual([failingId]);
      expect(lifecycleClient.ready).toHaveBeenCalledTimes(1);
    });

    it('reports every ID as failed without throwing when the batch install fails', async () => {
      const lifecycleClient = createMockLifecycleClient();
      lifecycleClient.installMany.mockRejectedValue(new Error('search failed'));
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      const result = await installStatic({ enabled: true, workflowsExtensions });

      expect(result.failedIds).toEqual([...AD_WORKFLOW_IDS]);
      expect(lifecycleClient.ready).toHaveBeenCalledTimes(1);
    });
  });

  describe('when disabled', () => {
    it('does not initialise the managed workflows client', async () => {
      const workflowsExtensions = createMockWorkflowsExtensionsStart();

      await installStatic({ enabled: false, workflowsExtensions });

      expect(workflowsExtensions.initManagedWorkflowsClient).not.toHaveBeenCalled();
    });

    it('does not install any workflows', async () => {
      const lifecycleClient = createMockLifecycleClient();
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      await installStatic({ enabled: false, workflowsExtensions });

      expect(lifecycleClient.installMany).not.toHaveBeenCalled();
    });

    it('does not call ready()', async () => {
      const lifecycleClient = createMockLifecycleClient();
      const workflowsExtensions = createMockWorkflowsExtensionsStart(lifecycleClient);

      await installStatic({ enabled: false, workflowsExtensions });

      expect(lifecycleClient.ready).not.toHaveBeenCalled();
    });

    it('returns { failedIds: [] } without attempting installation', async () => {
      const workflowsExtensions = createMockWorkflowsExtensionsStart();

      const result = await installStatic({ enabled: false, workflowsExtensions });

      expect(result).toEqual({ failedIds: [] });
    });
  });
});
