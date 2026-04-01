/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { loggerMock } from '@kbn/logging-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import type {
  AllDefaultWorkflowKey,
  BundledYamlEntry,
  RequiredDefaultWorkflowKey,
} from '../../../workflows/helpers/get_bundled_yaml_entries';
import type { DefaultWorkflowIds } from '../../../workflows/register_default_workflows';
import { verifyAndRepairWorkflows } from '.';

const makeHash = (yaml: string): string => createHash('sha256').update(yaml.trim()).digest('hex');

const BUNDLED_YAMLS: Record<AllDefaultWorkflowKey, string> = {
  custom_validation_example: 'custom_validation_example: bundled yaml',
  default_alert_retrieval: 'default_alert_retrieval: bundled yaml',
  esql_example_alert_retrieval: 'esql_example_alert_retrieval: bundled yaml',
  generation: 'generation: bundled yaml',
  run_example: 'run_example: bundled yaml',
  validate: 'validate: bundled yaml',
};

const makeBundledEntry = (key: AllDefaultWorkflowKey): BundledYamlEntry => ({
  hash: makeHash(BUNDLED_YAMLS[key]),
  key,
  yaml: BUNDLED_YAMLS[key],
});

const BUNDLED_YAML_ENTRIES: ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry> = new Map(
  (Object.keys(BUNDLED_YAMLS) as AllDefaultWorkflowKey[]).map((key) => [key, makeBundledEntry(key)])
);

const DEFAULT_WORKFLOW_IDS: DefaultWorkflowIds = {
  custom_validation_example: 'wf-custom-validation-id',
  default_alert_retrieval: 'wf-alert-id',
  esql_example_alert_retrieval: 'wf-esql-id',
  generation: 'wf-gen-id',
  run_example: 'wf-run-example-id',
  validate: 'wf-validate-id',
};

const makeStoredWorkflow = (yaml: string, enabled = true, valid = true) => ({
  enabled,
  id: 'wf-id',
  valid,
  yaml,
});

describe('verifyAndRepairWorkflows', () => {
  const mockLogger = loggerMock.create();
  const mockRequest = {} as never;
  const mockInvalidateCache = jest.fn();

  const mockGetWorkflowsByIds = jest.fn();
  const mockCreateWorkflow = jest.fn();
  const mockUpdateWorkflow = jest.fn();

  const mockWorkflowsManagementApi = {
    createWorkflow: mockCreateWorkflow,
    getWorkflowsByIds: mockGetWorkflowsByIds,
    updateWorkflow: mockUpdateWorkflow,
  } as unknown as WorkflowsServerPluginSetup['management'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const callVerifyAndRepair = (
    overrides?: Partial<Parameters<typeof verifyAndRepairWorkflows>[0]>
  ) =>
    verifyAndRepairWorkflows({
      bundledYamlEntries: BUNDLED_YAML_ENTRIES,
      defaultWorkflowIds: DEFAULT_WORKFLOW_IDS,
      invalidateCache: mockInvalidateCache,
      logger: mockLogger,
      request: mockRequest,
      spaceId: 'default',
      workflowsManagementApi: mockWorkflowsManagementApi,
      ...overrides,
    });

  // Helper: return bundled workflow for a given ID
  const allIntactGetWorkflowsByIds = (_ids: string[]) => {
    const id = _ids[0];
    const key = Object.entries(DEFAULT_WORKFLOW_IDS).find(([, v]) => v === id)?.[0];
    if (!key) return Promise.resolve([]);
    return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS[key as AllDefaultWorkflowKey])]);
  };

  describe('all workflows intact', () => {
    it('returns all_intact status when all workflows match bundled hashes', async () => {
      mockGetWorkflowsByIds.mockImplementation(allIntactGetWorkflowsByIds);

      const result = await callVerifyAndRepair();

      expect(result).toEqual({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [],
        status: 'all_intact',
        unrepairableErrors: [],
      });
      expect(mockUpdateWorkflow).not.toHaveBeenCalled();
      expect(mockCreateWorkflow).not.toHaveBeenCalled();
      expect(mockInvalidateCache).not.toHaveBeenCalled();
    });

    it('logs debug message when all required workflows are intact', async () => {
      mockGetWorkflowsByIds.mockImplementation(allIntactGetWorkflowsByIds);

      await callVerifyAndRepair();

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      const debugFn = mockLogger.debug.mock.calls[0][0] as () => string;
      expect(debugFn()).toContain("All required workflows intact for space 'default'");
    });

    it('compares trimmed YAML for hash comparison', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        const id = _ids[0];
        const key = Object.entries(DEFAULT_WORKFLOW_IDS).find(([, v]) => v === id)?.[0];
        if (!key) return Promise.resolve([]);
        return Promise.resolve([
          makeStoredWorkflow(`  ${BUNDLED_YAMLS[key as AllDefaultWorkflowKey]}  `),
        ]);
      });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('all_intact');
    });
  });

  describe('one required workflow modified', () => {
    it('restores modified required workflow and returns repaired status', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result).toEqual({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [{ key: 'generation', workflowId: 'wf-gen-id' }],
        status: 'repaired',
        unrepairableErrors: [],
      });
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        'wf-gen-id',
        { yaml: BUNDLED_YAMLS.generation },
        'default',
        mockRequest
      );
    });

    it('logs INFO messages for modification detection and successful repair', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      await callVerifyAndRepair();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Workflow 'wf-gen-id' (generation) has been modified; restoring bundled definition"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully restored workflow 'wf-gen-id' (generation) to bundled definition"
      );
    });

    it('returns repair_failed when updateWorkflow returns valid: false for a modified required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({
        valid: false,
        validationErrors: ['step type not registered', 'missing required field'],
      });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        {
          error:
            'Workflow updated but still invalid after restoration: step type not registered; missing required field',
          key: 'generation',
          workflowId: 'wf-gen-id',
        },
      ]);
      expect(result.repaired).toHaveLength(0);
    });

    it('logs an error with "Aborting generation." when updateWorkflow returns valid: false for required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({
        valid: false,
        validationErrors: ['step type not registered'],
      });

      await callVerifyAndRepair();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Aborting generation.')
      );
    });
  });

  describe('all three required workflows modified', () => {
    it('restores all modified required workflows and returns repaired status', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        const id = _ids[0];
        const key = Object.entries(DEFAULT_WORKFLOW_IDS).find(([, v]) => v === id)?.[0];
        const requiredKeys: RequiredDefaultWorkflowKey[] = [
          'default_alert_retrieval',
          'generation',
          'validate',
        ];
        if (key && requiredKeys.includes(key as RequiredDefaultWorkflowKey)) {
          return Promise.resolve([makeStoredWorkflow('user modified: different yaml content')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repaired');
      expect(result.repaired).toHaveLength(3);
      expect(result.unrepairableErrors).toHaveLength(0);
      expect(mockUpdateWorkflow).toHaveBeenCalledTimes(3);
    });
  });

  describe('repair failure (required workflows)', () => {
    it('returns repair_failed status when updateWorkflow throws for required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('update failed'));

      const result = await callVerifyAndRepair();

      expect(result).toEqual({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [],
        status: 'repair_failed',
        unrepairableErrors: [
          { error: 'update failed', key: 'generation', workflowId: 'wf-gen-id' },
        ],
      });
    });

    it('includes "Aborting generation." in error log for required workflow repair failure', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('generation: user modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('update failed'));

      await callVerifyAndRepair();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to restore workflow 'wf-gen-id' (generation): update failed. Aborting generation."
      );
    });
  });

  describe('disabled workflow (G1)', () => {
    it('re-enables a disabled required workflow and returns repaired status', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue(undefined);

      const result = await callVerifyAndRepair();

      expect(result).toEqual({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [{ key: 'generation', workflowId: 'wf-gen-id' }],
        status: 'repaired',
        unrepairableErrors: [],
      });
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        'wf-gen-id',
        { enabled: true },
        'default',
        mockRequest
      );
    });

    it('logs INFO for disabled workflow detection and successful re-enable', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue(undefined);

      await callVerifyAndRepair();

      expect(mockLogger.info).toHaveBeenCalledWith(
        "Workflow 'wf-gen-id' (generation) has been disabled; re-enabling"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "Successfully re-enabled workflow 'wf-gen-id' (generation)"
      );
    });

    it('returns repair_failed when re-enable fails for a required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('re-enable failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        { error: 're-enable failed', key: 'generation', workflowId: 'wf-gen-id' },
      ]);
    });

    it('includes "Aborting generation." in error log when required workflow re-enable fails', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('re-enable failed'));

      await callVerifyAndRepair();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to re-enable workflow 'wf-gen-id' (generation): re-enable failed. Aborting generation."
      );
    });
  });

  describe('disabled AND invalid workflow', () => {
    it('restores bundled YAML (not just re-enables) when workflow is both disabled and invalid', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          // Simulates user introducing a YAML syntax error — the Workflows API
          // stores the broken YAML and also sets enabled: false automatically.
          return Promise.resolve([makeStoredWorkflow('bad: [unclosed bracket', false, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repaired');
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        'wf-gen-id',
        { yaml: BUNDLED_YAMLS.generation },
        'default',
        mockRequest
      );
      expect(result.repaired).toEqual([{ key: 'generation', workflowId: 'wf-gen-id' }]);
    });

    it('does NOT call updateWorkflow with { enabled: true } when workflow is disabled and invalid', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow('bad: [unclosed bracket', false, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      await callVerifyAndRepair();

      expect(mockUpdateWorkflow).not.toHaveBeenCalledWith(
        'wf-gen-id',
        { enabled: true },
        'default',
        mockRequest
      );
    });
  });

  describe('invalid workflow (GAP-SH-1)', () => {
    it('restores bundled YAML for an invalid required workflow and returns repaired status', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, true, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result).toEqual({
        optionalRepaired: [],
        optionalWarnings: [],
        repaired: [{ key: 'generation', workflowId: 'wf-gen-id' }],
        status: 'repaired',
        unrepairableErrors: [],
      });
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        'wf-gen-id',
        { yaml: BUNDLED_YAMLS.generation },
        'default',
        mockRequest
      );
    });

    it('returns repair_failed when updateWorkflow throws for an invalid required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, true, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('update failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        { error: 'update failed', key: 'generation', workflowId: 'wf-gen-id' },
      ]);
    });

    it('returns repair_failed when bundled YAML is unavailable for an invalid required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, true, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });

      const result = await callVerifyAndRepair({
        bundledYamlEntries: new Map(), // no bundled entries available
      });

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toEqual([
        {
          error: `Bundled YAML entry for 'generation' is unavailable; cannot repair invalid workflow`,
          key: 'generation',
          workflowId: 'wf-gen-id',
        },
      ]);
      expect(mockUpdateWorkflow).not.toHaveBeenCalled();
    });

    it('logs error with "Aborting generation." when bundled YAML unavailable for invalid required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.generation, true, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });

      await callVerifyAndRepair({ bundledYamlEntries: new Map() });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Cannot repair invalid workflow 'wf-gen-id' (generation): bundled YAML entry unavailable. Aborting generation."
      );
    });

    it('repairs an invalid optional workflow and puts it in optionalRepaired', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-custom-validation-id') {
          return Promise.resolve([
            makeStoredWorkflow(BUNDLED_YAMLS.custom_validation_example, true, false),
          ]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('all_intact');
      expect(result.optionalRepaired).toEqual([
        { key: 'custom_validation_example', workflowId: 'wf-custom-validation-id' },
      ]);
      expect(result.optionalWarnings).toHaveLength(0);
    });

    it('puts invalid optional workflow repair failure in optionalWarnings, not unrepairableErrors', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-esql-id') {
          return Promise.resolve([
            makeStoredWorkflow(BUNDLED_YAMLS.esql_example_alert_retrieval, true, false),
          ]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('optional update failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('all_intact');
      expect(result.unrepairableErrors).toHaveLength(0);
      expect(result.optionalWarnings).toEqual([
        {
          error: 'optional update failed',
          key: 'esql_example_alert_retrieval',
          workflowId: 'wf-esql-id',
        },
      ]);
    });

    it('does NOT include "Aborting generation." for invalid optional workflow with unavailable bundled YAML', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-run-example-id') {
          return Promise.resolve([makeStoredWorkflow(BUNDLED_YAMLS.run_example, true, false)]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });

      const bundledWithoutRunExample: ReadonlyMap<AllDefaultWorkflowKey, BundledYamlEntry> =
        new Map(
          (Object.keys(BUNDLED_YAMLS) as AllDefaultWorkflowKey[])
            .filter((k) => k !== 'run_example')
            .map((k) => [k, makeBundledEntry(k)])
        );

      await callVerifyAndRepair({ bundledYamlEntries: bundledWithoutRunExample });

      const errorCalls = (mockLogger.error as jest.Mock).mock.calls.map(
        (args: unknown[]) => args[0]
      );
      for (const msg of errorCalls) {
        expect(msg).not.toContain('Aborting generation.');
      }
    });
  });

  describe('soft-deleted workflow (G2)', () => {
    it('treats soft-deleted workflow (empty getWorkflowsByIds result) as missing and recreates it', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') {
          // Soft-deleted: getWorkflowsByIds returns empty array
          return Promise.resolve([]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-alert-id' });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual([
        { key: 'default_alert_retrieval', workflowId: 'new-alert-id' },
      ]);
      expect(mockCreateWorkflow).toHaveBeenCalledWith(
        { yaml: BUNDLED_YAMLS.default_alert_retrieval },
        'default',
        mockRequest
      );
    });

    it('logs error with "Required workflow" prefix for soft-deleted required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') return Promise.resolve([]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-alert-id' });

      await callVerifyAndRepair();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Required workflow 'wf-alert-id' (default_alert_retrieval) not found in space 'default'; attempting re-creation"
      );
    });

    it('invalidates cache after successful re-creation of soft-deleted workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') return Promise.resolve([]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-alert-id' });

      await callVerifyAndRepair();

      expect(mockInvalidateCache).toHaveBeenCalledWith('default');
    });
  });

  describe('missing workflow (getWorkflowsByIds returns empty)', () => {
    it('attempts re-creation when workflow is not found', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') return Promise.resolve([]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({
        id: 'new-alert-id',
        yaml: BUNDLED_YAMLS.default_alert_retrieval,
      });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repaired');
      expect(result.repaired).toEqual([
        { key: 'default_alert_retrieval', workflowId: 'new-alert-id' },
      ]);
      expect(mockCreateWorkflow).toHaveBeenCalledWith(
        { yaml: BUNDLED_YAMLS.default_alert_retrieval },
        'default',
        mockRequest
      );
    });

    it('returns repair_failed when createWorkflow throws', async () => {
      mockGetWorkflowsByIds.mockImplementation(() => Promise.resolve([]));
      mockCreateWorkflow.mockRejectedValue(new Error('create failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toHaveLength(3);
    });

    it('does NOT invalidate cache when createWorkflow fails', async () => {
      mockGetWorkflowsByIds.mockImplementation(() => Promise.resolve([]));
      mockCreateWorkflow.mockRejectedValue(new Error('create failed'));

      await callVerifyAndRepair();

      expect(mockInvalidateCache).not.toHaveBeenCalled();
    });
  });

  describe('optional workflows (G6)', () => {
    it('repairs modified optional workflows without affecting status', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-custom-validation-id') {
          return Promise.resolve([makeStoredWorkflow('custom_validation_example: modified yaml')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('all_intact');
      expect(result.optionalRepaired).toEqual([
        { key: 'custom_validation_example', workflowId: 'wf-custom-validation-id' },
      ]);
      expect(result.optionalWarnings).toHaveLength(0);
    });

    it('puts optional workflow repair failure in optionalWarnings, not unrepairableErrors', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-esql-id') {
          return Promise.resolve([makeStoredWorkflow('esql_example_alert_retrieval: modified')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('optional update failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('all_intact');
      expect(result.unrepairableErrors).toHaveLength(0);
      expect(result.optionalWarnings).toEqual([
        {
          error: 'optional update failed',
          key: 'esql_example_alert_retrieval',
          workflowId: 'wf-esql-id',
        },
      ]);
    });

    it('does NOT include "Aborting generation." in error log for optional workflow repair failure', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-run-example-id') {
          return Promise.resolve([makeStoredWorkflow('run_example: modified')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('optional update failed'));

      await callVerifyAndRepair();

      const errorCalls = (mockLogger.error as jest.Mock).mock.calls.map(
        (args: unknown[]) => args[0]
      );
      for (const msg of errorCalls) {
        expect(msg).not.toContain('Aborting generation.');
      }
    });

    it('includes optional workflow failure in optionalWarnings result', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-run-example-id') {
          return Promise.resolve([makeStoredWorkflow('run_example: modified')]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockRejectedValue(new Error('optional update failed'));

      const result = await callVerifyAndRepair();

      expect(result.optionalWarnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: 'run_example',
          }),
        ])
      );
    });

    it('re-enables a disabled optional workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-custom-validation-id') {
          return Promise.resolve([
            makeStoredWorkflow(BUNDLED_YAMLS.custom_validation_example, false),
          ]);
        }
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockUpdateWorkflow.mockResolvedValue(undefined);

      const result = await callVerifyAndRepair();

      expect(result.optionalRepaired).toEqual([
        { key: 'custom_validation_example', workflowId: 'wf-custom-validation-id' },
      ]);
      expect(mockUpdateWorkflow).toHaveBeenCalledWith(
        'wf-custom-validation-id',
        { enabled: true },
        'default',
        mockRequest
      );
    });

    it('skips optional workflows with no provisioned ID', async () => {
      const idsWithoutOptional: DefaultWorkflowIds = {
        default_alert_retrieval: 'wf-alert-id',
        generation: 'wf-gen-id',
        validate: 'wf-validate-id',
      };
      mockGetWorkflowsByIds.mockImplementation(allIntactGetWorkflowsByIds);

      const result = await callVerifyAndRepair({ defaultWorkflowIds: idsWithoutOptional });

      expect(result.optionalRepaired).toHaveLength(0);
      expect(result.optionalWarnings).toHaveLength(0);
    });

    it('logs warn (not error) when optional workflow is missing', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-run-example-id') return Promise.resolve([]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-run-example-id' });

      await callVerifyAndRepair();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Optional workflow 'wf-run-example-id' (run_example) not found in space 'default'; attempting re-creation"
      );
      expect(mockLogger.error).not.toHaveBeenCalledWith(
        expect.stringContaining('run_example') && expect.stringContaining('not found')
      );
    });
  });

  describe('mixed scenarios', () => {
    it('handles mix of intact, repaired, and missing required workflows', async () => {
      // validate: intact, generation: modified, default_alert_retrieval: missing
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') return Promise.resolve([]);
        if (_ids[0] === 'wf-gen-id')
          return Promise.resolve([makeStoredWorkflow('modified generation yaml')]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-alert-id' });
      mockUpdateWorkflow.mockResolvedValue({ valid: true });

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repaired');
      expect(result.repaired).toHaveLength(2);
      expect(result.unrepairableErrors).toHaveLength(0);
    });

    it('returns repair_failed when some required repairs succeed and others fail', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-alert-id') return Promise.resolve([]);
        if (_ids[0] === 'wf-gen-id')
          return Promise.resolve([makeStoredWorkflow('modified generation yaml')]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      mockCreateWorkflow.mockResolvedValue({ id: 'new-alert-id' });
      mockUpdateWorkflow.mockRejectedValue(new Error('update failed'));

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.repaired).toEqual([
        { key: 'default_alert_retrieval', workflowId: 'new-alert-id' },
      ]);
      expect(result.unrepairableErrors).toEqual([
        { error: 'update failed', key: 'generation', workflowId: 'wf-gen-id' },
      ]);
    });

    it('required failure + optional repair: status is repair_failed', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id')
          return Promise.resolve([makeStoredWorkflow('modified generation yaml')]);
        if (_ids[0] === 'wf-custom-validation-id')
          return Promise.resolve([makeStoredWorkflow('custom_validation_example: modified')]);
        return allIntactGetWorkflowsByIds(_ids);
      });
      // Required repair fails, optional repair succeeds
      mockUpdateWorkflow.mockImplementation(
        (id: string) =>
          id === 'wf-gen-id'
            ? Promise.reject(new Error('required update failed'))
            : Promise.resolve({ valid: true }) // optional update succeeds
      );

      const result = await callVerifyAndRepair();

      expect(result.status).toBe('repair_failed');
      expect(result.unrepairableErrors).toHaveLength(1);
      expect(result.optionalRepaired).toHaveLength(1);
      expect(result.optionalWarnings).toHaveLength(0);
    });
  });

  describe('getWorkflowsByIds throws', () => {
    it('propagates as a rejected promise when getWorkflowsByIds throws for a required workflow', async () => {
      mockGetWorkflowsByIds.mockImplementation((_ids: string[]) => {
        if (_ids[0] === 'wf-gen-id') {
          return Promise.reject(new Error('network error'));
        }
        return allIntactGetWorkflowsByIds(_ids);
      });

      await expect(callVerifyAndRepair()).rejects.toThrow('network error');
    });
  });

  describe('parallel execution', () => {
    it('calls getWorkflowsByIds for all 6 workflows in parallel when all IDs present', async () => {
      mockGetWorkflowsByIds.mockImplementation(allIntactGetWorkflowsByIds);

      await callVerifyAndRepair();

      expect(mockGetWorkflowsByIds).toHaveBeenCalledTimes(6);
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-alert-id'], 'default');
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-gen-id'], 'default');
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-validate-id'], 'default');
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-custom-validation-id'], 'default');
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-esql-id'], 'default');
      expect(mockGetWorkflowsByIds).toHaveBeenCalledWith(['wf-run-example-id'], 'default');
    });

    it('calls getWorkflowsByIds only for 3 required workflows when no optional IDs present', async () => {
      const idsWithoutOptional: DefaultWorkflowIds = {
        default_alert_retrieval: 'wf-alert-id',
        generation: 'wf-gen-id',
        validate: 'wf-validate-id',
      };
      mockGetWorkflowsByIds.mockImplementation(allIntactGetWorkflowsByIds);

      await callVerifyAndRepair({ defaultWorkflowIds: idsWithoutOptional });

      expect(mockGetWorkflowsByIds).toHaveBeenCalledTimes(3);
    });
  });
});
