/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { ThreatIntelSupplyService } from './threat_intel_supply_service';
import {
  ThreatIntelSupplyHardGateError,
  ThreatIntelSupplyHuntDisabledError,
  ThreatIntelSupplyNotInstalledError,
} from '.';

const SPACE_A = 'space-a';
const SPACE_B = 'space-b';
const ATTR_A = `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${SPACE_A}`;
const ATTR_B = `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${SPACE_B}`;

const request = {} as KibanaRequest;

describe('ThreatIntelSupplyService', () => {
  const workflows = new Map<string, { enabled: boolean }>();
  const huntEnabledBySpace = new Map<string, boolean>();

  const getWorkflow = jest.fn(async (id: string) => {
    const doc = workflows.get(id);
    return doc ? { enabled: doc.enabled } : null;
  });
  const updateWorkflow = jest.fn(async (id: string, { enabled }: { enabled: boolean }) => {
    const doc = workflows.get(id);
    if (!doc) {
      throw new Error(`missing ${id}`);
    }
    doc.enabled = enabled;
    return {};
  });
  const getWorkflowStatus = jest.fn(
    async (id: string, opts: { spaceId: string; workflowIdSuffix?: string }) => {
      if (id !== SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID) {
        return { installed: false, enabled: false };
      }
      const spaceId = opts.workflowIdSuffix ?? opts.spaceId;
      const enabled = huntEnabledBySpace.get(spaceId) === true;
      return { installed: true, enabled, workflowId: `${id}-${spaceId}` };
    }
  );

  const management = {
    getWorkflow,
    updateWorkflow,
  } as unknown as WatchWorkflowsManagementClient;

  const managedWorkflows = {
    getWorkflowStatus,
  } as unknown as PluginScopedManagedWorkflowsApi;

  const esClient = {
    indices: {
      exists: jest.fn(async () => true),
      // Serverless answers 410 api_not_available_exception for this API.
      getFieldMapping: jest.fn(async () => {
        throw new Error('api_not_available_exception: 410');
      }),
      getMapping: jest.fn(async () => ({
        '.kibana-threat-reports': {
          mappings: {
            properties: {
              content: {
                properties: {
                  title: { type: 'semantic_text', inference_id: '.elser' },
                  body_text: { type: 'semantic_text', inference_id: '.elser' },
                },
              },
            },
          },
        },
      })),
    },
    inference: {
      get: jest.fn(async () => ({})),
    },
  } as unknown as ElasticsearchClient;

  const ensureInstaller = jest.fn(async ({ spaceId }: { spaceId: string }) => {
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
    workflows.set(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, { enabled: false });
    workflows.set(`${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-${spaceId}`, { enabled: false });
  });

  const createService = (
    spaceIds: string[] = [SPACE_A, SPACE_B],
    opts?: { withInstaller?: boolean }
  ) =>
    new ThreatIntelSupplyService({
      management,
      managedWorkflows: Promise.resolve(managedWorkflows),
      logger: loggingSystemMock.createLogger() as Logger,
      getEsClient: async () => esClient,
      enumerateSpaceIds: async () => spaceIds,
      getWorkflowInstaller: opts?.withInstaller === false ? undefined : () => ensureInstaller,
    });

  const seedAllTiWorkflows = (enabled: boolean) => {
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled });
    workflows.set(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, { enabled });
    workflows.set(ATTR_A, { enabled });
    workflows.set(ATTR_B, { enabled });
  };

  beforeEach(() => {
    workflows.clear();
    huntEnabledBySpace.clear();
    getWorkflow.mockClear();
    updateWorkflow.mockClear();
    getWorkflowStatus.mockClear();
    ensureInstaller.mockClear();
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
    (esClient.inference.get as jest.Mock).mockResolvedValue({});
  });

  it('returns ok hard-gate when reports index and embeddings are available', async () => {
    expect(await createService().evaluateHardGate(request)).toEqual({
      ok: true,
      reasonCodes: [],
    });
  });

  it('does not call getFieldMapping (410 on serverless) when evaluating the hard-gate', async () => {
    expect((await createService().evaluateHardGate(request)).ok).toBe(true);
    expect(esClient.indices.getFieldMapping).not.toHaveBeenCalled();
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({ index: '.kibana-threat-reports' });
  });

  it('returns embedding_endpoint_unavailable when a semantic field has no inference_id', async () => {
    (esClient.indices.getMapping as jest.Mock).mockResolvedValueOnce({
      '.kibana-threat-reports': {
        mappings: {
          properties: {
            content: {
              properties: {
                title: { type: 'semantic_text' },
                body_text: { type: 'semantic_text', inference_id: '.elser' },
              },
            },
          },
        },
      },
    });
    expect((await createService().evaluateHardGate(request)).reasonCodes).toContain(
      'embedding_endpoint_unavailable'
    );
  });

  it('returns embedding_endpoint_unavailable when inference get fails', async () => {
    (esClient.inference.get as jest.Mock).mockRejectedValue(new Error('missing'));
    expect((await createService().evaluateHardGate(request)).reasonCodes).toContain(
      'embedding_endpoint_unavailable'
    );
  });

  it('returns reports_index_missing when the reports index does not exist', async () => {
    (esClient.indices.exists as jest.Mock).mockResolvedValue(false);
    expect(await createService().evaluateHardGate(request)).toEqual({
      ok: false,
      reasonCodes: ['reports_index_missing'],
    });
  });

  it('enables ingest in the global space when ensuring supply', async () => {
    seedAllTiWorkflows(false);
    await createService().ensureSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: true },
      GLOBAL_WORKFLOW_SPACE_ID,
      request
    );
  });

  it('enables enrich in the global space when ensuring supply', async () => {
    seedAllTiWorkflows(false);
    await createService().ensureSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      { enabled: true },
      GLOBAL_WORKFLOW_SPACE_ID,
      request
    );
  });

  it('enables attribute in the target space when ensuring supply', async () => {
    seedAllTiWorkflows(false);
    await createService().ensureSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(ATTR_A, { enabled: true }, SPACE_A, request);
  });

  it('throws supply_not_installed when a TI workflow is missing and no installer is registered', async () => {
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
    await expect(
      createService([SPACE_A, SPACE_B], { withInstaller: false }).ensureSupplyForSpace(
        SPACE_A,
        request
      )
    ).rejects.toBeInstanceOf(ThreatIntelSupplyNotInstalledError);
    expect(ensureInstaller).not.toHaveBeenCalled();
  });

  it('installs missing attribute workflow then enables it when ensuring supply', async () => {
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
    workflows.set(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, { enabled: false });
    // ATTR_A intentionally missing (new space lag)

    await createService().ensureSupplyForSpace(SPACE_A, request);

    expect(ensureInstaller).toHaveBeenCalledWith({ spaceId: SPACE_A });
    expect(updateWorkflow).toHaveBeenCalledWith(ATTR_A, { enabled: true }, SPACE_A, request);
    expect(workflows.get(ATTR_A)?.enabled).toBe(true);
  });

  it('disables attribute when tearing down supply for a space', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    await createService().teardownSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(ATTR_A, { enabled: false }, SPACE_A, request);
  });

  it('disables globals when tearing down the last Hunt space', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    await createService().teardownSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: false },
      GLOBAL_WORKFLOW_SPACE_ID,
      request
    );
  });

  it('keeps globals on when another space still has Hunt enabled', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, true);
    await createService().teardownSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).not.toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('continues teardown when the attribute workflow is already missing', async () => {
    seedAllTiWorkflows(true);
    workflows.delete(ATTR_A);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    await createService().teardownSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: false },
      GLOBAL_WORKFLOW_SPACE_ID,
      request
    );
  });

  it('re-checks other spaces before disabling globals during teardown', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    const defaultUpdate = updateWorkflow.getMockImplementation()!;
    let attributeDisabled = false;
    updateWorkflow.mockImplementation(async (id: string, patch: { enabled: boolean }) => {
      const result = await defaultUpdate(id, patch);
      if (id === ATTR_A && patch.enabled === false) {
        attributeDisabled = true;
        // Concurrent enable in SPACE_B between attribute teardown and globals.
        huntEnabledBySpace.set(SPACE_B, true);
      }
      return result;
    });
    try {
      await createService().teardownSupplyForSpace(SPACE_A, request);
      expect(attributeDisabled).toBe(true);
      expect(updateWorkflow).not.toHaveBeenCalledWith(
        THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
        expect.anything(),
        expect.anything(),
        expect.anything()
      );
    } finally {
      updateWorkflow.mockImplementation(defaultUpdate);
    }
  });

  it('marks ingest inUseElsewhere when Hunt is off here but on elsewhere', async () => {
    seedAllTiWorkflows(true);
    workflows.set(ATTR_A, { enabled: false });
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, true);
    const status = await createService().getSupplyStatus(SPACE_A, request);
    expect(status.workflows.find((w) => w.key === 'ingest')?.inUseElsewhere).toBe(true);
  });

  it('reports drift when Hunt is on and a required TI workflow is off', async () => {
    seedAllTiWorkflows(true);
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
    huntEnabledBySpace.set(SPACE_A, true);
    expect((await createService().getSupplyStatus(SPACE_A, request)).drift).toBe(true);
  });

  it('throws ThreatIntelSupplyHardGateError from assertHardGate when embeddings fail', async () => {
    (esClient.inference.get as jest.Mock).mockRejectedValue(new Error('missing'));
    await expect(createService().assertHardGate(request)).rejects.toBeInstanceOf(
      ThreatIntelSupplyHardGateError
    );
  });

  it('throws hunt_not_enabled when Restore is called with Hunt off', async () => {
    seedAllTiWorkflows(false);
    huntEnabledBySpace.set(SPACE_A, false);
    await expect(createService().restoreSupplyForSpace(SPACE_A, request)).rejects.toBeInstanceOf(
      ThreatIntelSupplyHuntDisabledError
    );
  });

  it('re-enables drifted ingest when Restore runs with Hunt on', async () => {
    seedAllTiWorkflows(true);
    workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
    huntEnabledBySpace.set(SPACE_A, true);
    await createService().restoreSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: true },
      GLOBAL_WORKFLOW_SPACE_ID,
      request
    );
  });
});
