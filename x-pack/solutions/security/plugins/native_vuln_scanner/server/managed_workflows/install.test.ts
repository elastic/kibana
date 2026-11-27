/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID as SCAN_WORKFLOW_ID_IN_UI } from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import type { MockedLogger } from '@kbn/logging-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
  NATIVE_VULN_SCANNER_WORKFLOW_IDS,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import { installWorkflows } from './install';
import { MANAGED_WORKFLOW_OWNER_ID } from './register_owner';

const createClient = () => ({
  execute: jest.fn(),
  install: jest.fn().mockResolvedValue(undefined),
  installMany: jest.fn().mockResolvedValue({ failed: [] }),
  ready: jest.fn().mockResolvedValue(undefined),
});

const createStart = (client = createClient()) =>
  ({
    initManagedWorkflowsClient: jest.fn().mockResolvedValue(client),
  } as unknown as WorkflowsExtensionsServerPluginStart);

describe('managed workflow install', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('keeps the scan workflow id the "View run" link uses in sync with the managed definition', () => {
    expect(SCAN_WORKFLOW_ID_IN_UI).toBe(NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID);
  });

  it('manages only system-prefixed ids and includes the scan workflow', () => {
    expect(NATIVE_VULN_SCANNER_WORKFLOW_IDS).toContain(NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID);
    NATIVE_VULN_SCANNER_WORKFLOW_IDS.forEach((id) => expect(id.startsWith('system-')).toBe(true));
  });

  describe('installWorkflows', () => {
    it('initialises the client for the owner id once', async () => {
      const workflowsExtensions = createStart();

      await installWorkflows({ logger, workflowsExtensions });

      expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledTimes(1);
      expect(workflowsExtensions.initManagedWorkflowsClient).toHaveBeenCalledWith(
        MANAGED_WORKFLOW_OWNER_ID
      );
    });

    it('installs every id of the list in the default space, in one batch', async () => {
      const client = createClient();

      const result = await installWorkflows({ logger, workflowsExtensions: createStart(client) });

      expect(client.installMany).toHaveBeenCalledTimes(1);
      expect(client.installMany).toHaveBeenCalledWith(
        NATIVE_VULN_SCANNER_WORKFLOW_IDS.map((id) => ({ id, spaceId: DEFAULT_SPACE_ID }))
      );
      expect(result).toEqual({ failedIds: [] });
      expect(client.ready).toHaveBeenCalledTimes(1);
    });

    it('never enables the workflow', async () => {
      const client = createClient();

      await installWorkflows({ logger, workflowsExtensions: createStart(client) });

      expect(client.install).not.toHaveBeenCalled();
      expect(JSON.stringify(client.installMany.mock.calls)).not.toContain('enabled');
    });

    it('logs and returns the ids that failed, and still calls ready', async () => {
      const client = createClient();
      client.installMany.mockResolvedValue({
        failed: [{ id: NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID, error: new Error('boom') }],
      });

      const result = await installWorkflows({ logger, workflowsExtensions: createStart(client) });

      expect(result).toEqual({ failedIds: [NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID] });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('boom'));
      expect(client.ready).toHaveBeenCalledTimes(1);
    });

    it('treats a thrown batch as every id failing, and still calls ready', async () => {
      const client = createClient();
      client.installMany.mockRejectedValue(new Error('es down'));

      const result = await installWorkflows({ logger, workflowsExtensions: createStart(client) });

      expect(result.failedIds).toEqual([...NATIVE_VULN_SCANNER_WORKFLOW_IDS]);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('es down'));
      expect(client.ready).toHaveBeenCalledTimes(1);
    });
  });
});
