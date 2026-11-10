/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  IUiSettingsClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID } from '@kbn/alertzero-common';
import {
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { ThreatIntelSupplyService } from './threat_intel_supply_service';
import type { SupplyDocumentLabel, SupplyDocumentStates } from './keyed_supply_store.mock';
import { createHardGateEsClient, createKeyedSupplyStore } from './keyed_supply_store.mock';
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
            dynamic: 'strict',
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
    opts?: {
      withInstaller?: boolean;
      searchInferenceEndpoints?: SearchInferenceEndpointsPluginStart;
    }
  ) =>
    new ThreatIntelSupplyService({
      management,
      managedWorkflows: Promise.resolve(managedWorkflows),
      logger: loggingSystemMock.createLogger() as Logger,
      getEsClient: async () => esClient,
      enumerateSpaceIds: async () => spaceIds,
      getWorkflowInstaller: opts?.withInstaller === false ? undefined : () => ensureInstaller,
      getSearchInferenceEndpoints: () => opts?.searchInferenceEndpoints,
      getInference: () => ({ getDefaultConnector: jest.fn() } as unknown as InferenceServerStart),
      getUiSettingsClient: () => ({ get: jest.fn() } as unknown as IUiSettingsClient),
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
    (esClient.inference.get as jest.Mock).mockClear();
    (esClient.indices.getMapping as jest.Mock).mockClear();
    (esClient.indices.exists as jest.Mock).mockResolvedValue(true);
    (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
      '.kibana-threat-reports': {
        mappings: {
          dynamic: 'strict',
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
    });
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
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({
      index: '.kibana-threat-reports',
      expand_wildcards: ['open', 'hidden'],
    });
  });

  it('reads the reports mapping once per hard-gate evaluation', async () => {
    await createService().evaluateHardGate(request);
    expect(esClient.indices.getMapping).toHaveBeenCalledTimes(1);
  });

  it('returns embedding_endpoint_unavailable when a semantic field has no inference_id', async () => {
    (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
      '.kibana-threat-reports': {
        mappings: {
          dynamic: 'strict',
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

  describe('when the reports index exists without its template', () => {
    beforeEach(() => {
      (esClient.indices.getMapping as jest.Mock).mockResolvedValue({
        '.kibana-threat-reports': { mappings: { dynamic: 'true' } },
      });
    });

    it('returns reports_index_unmanaged', async () => {
      expect(await createService().evaluateHardGate(request)).toEqual({
        ok: false,
        reasonCodes: ['reports_index_unmanaged'],
      });
    });

    it('skips the embedding check', async () => {
      await createService().evaluateHardGate(request);
      expect(esClient.inference.get).not.toHaveBeenCalled();
    });
  });

  describe('when ensuring supply fails on the attribute workflow', () => {
    const ensureWithMissingAttribute = async () => {
      workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
      workflows.set(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, { enabled: false });
      // ATTR_A is missing and there is no installer to create it.
      return createService([SPACE_A, SPACE_B], { withInstaller: false })
        .ensureSupplyForSpace(SPACE_A, request)
        .catch((error) => error);
    };

    it('rethrows the original error', async () => {
      expect(await ensureWithMissingAttribute()).toBeInstanceOf(ThreatIntelSupplyNotInstalledError);
    });

    it('leaves ingest off when no other space has Hunt on', async () => {
      await ensureWithMissingAttribute();
      expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(false);
    });

    it('leaves enrich off when no other space has Hunt on', async () => {
      await ensureWithMissingAttribute();
      expect(workflows.get(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID)?.enabled).toBe(false);
    });

    it('leaves ingest on when a concurrent request enabled Hunt in this space', async () => {
      huntEnabledBySpace.set(SPACE_A, true);
      await ensureWithMissingAttribute();
      expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(true);
    });

    it('leaves ingest on when the Hunt status check fails', async () => {
      getWorkflowStatus.mockRejectedValueOnce(new Error('status unavailable'));
      await ensureWithMissingAttribute();
      expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(true);
    });

    it('still rethrows the original error when the Hunt status check fails', async () => {
      getWorkflowStatus.mockRejectedValueOnce(new Error('status unavailable'));
      expect(await ensureWithMissingAttribute()).toBeInstanceOf(ThreatIntelSupplyNotInstalledError);
    });

    it('keeps supply on when this call flipped it but another space has Hunt on', async () => {
      huntEnabledBySpace.set(SPACE_B, true);
      await ensureWithMissingAttribute();
      expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(true);
    });

    it('leaves ingest on when another space enables Hunt during the enrich undo', async () => {
      const defaultUpdate = updateWorkflow.getMockImplementation()!;
      updateWorkflow.mockImplementation(async (id: string, patch: { enabled: boolean }) => {
        const result = await defaultUpdate(id, patch);
        if (id === THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID && patch.enabled === false) {
          huntEnabledBySpace.set(SPACE_B, true);
        }
        return result;
      });
      try {
        await ensureWithMissingAttribute();
        expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(true);
      } finally {
        updateWorkflow.mockImplementation(defaultUpdate);
      }
    });

    // The Hunt space is `default`, so attribute shares a space with ingest and enrich. The undo
    // must key on each target's scope, not on its space id.
    describe('when the Hunt space is the default space and another space has Hunt on', () => {
      const ensureInDefaultSpaceWithMissingAttribute = async () => {
        workflows.set(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, { enabled: false });
        workflows.set(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, { enabled: false });
        huntEnabledBySpace.set(SPACE_B, true);
        return createService([DEFAULT_SPACE_ID, SPACE_B], { withInstaller: false })
          .ensureSupplyForSpace(DEFAULT_SPACE_ID, request)
          .catch((error) => error);
      };

      it('rethrows the original error', async () => {
        expect(await ensureInDefaultSpaceWithMissingAttribute()).toBeInstanceOf(
          ThreatIntelSupplyNotInstalledError
        );
      });

      it('leaves ingest on', async () => {
        await ensureInDefaultSpaceWithMissingAttribute();
        expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(true);
      });

      it('leaves enrich on', async () => {
        await ensureInDefaultSpaceWithMissingAttribute();
        expect(workflows.get(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID)?.enabled).toBe(true);
      });
    });

    describe('when an undo step fails', () => {
      // The first status call is the this-space check. Undo then runs in reverse, so enrich
      // is undone first and its other-space Hunt check is the call that fails.
      beforeEach(() => {
        getWorkflowStatus
          .mockResolvedValueOnce({ installed: true, enabled: false, workflowId: 'hunt-a' })
          .mockRejectedValueOnce(new Error('status unavailable'));
      });

      it('still rethrows the original error', async () => {
        expect(await ensureWithMissingAttribute()).toBeInstanceOf(
          ThreatIntelSupplyNotInstalledError
        );
      });

      it('leaves the workflow whose undo failed on', async () => {
        await ensureWithMissingAttribute();
        expect(workflows.get(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID)?.enabled).toBe(true);
      });

      it('still undoes the remaining flips', async () => {
        await ensureWithMissingAttribute();
        expect(workflows.get(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)?.enabled).toBe(false);
      });
    });
  });

  it('enables ingest in the default space when ensuring supply', async () => {
    seedAllTiWorkflows(false);
    await createService().ensureSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: true },
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('enables enrich in the default space when ensuring supply', async () => {
    seedAllTiWorkflows(false);
    await createService().ensureSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      { enabled: true },
      DEFAULT_SPACE_ID,
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

  it('disables ingest in the default space when tearing down the last Hunt space', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    await createService().teardownSupplyForSpace(SPACE_A, request);
    expect(updateWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      { enabled: false },
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('keeps ingest and enrich on when another space still has Hunt enabled', async () => {
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
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('re-checks other spaces before disabling ingest and enrich during teardown', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, false);
    const defaultUpdate = updateWorkflow.getMockImplementation()!;
    let attributeDisabled = false;
    updateWorkflow.mockImplementation(async (id: string, patch: { enabled: boolean }) => {
      const result = await defaultUpdate(id, patch);
      if (id === ATTR_A && patch.enabled === false) {
        attributeDisabled = true;
        // Concurrent enable in SPACE_B between attribute teardown and ingest/enrich.
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

  it('reads ingest from the default space when Hunt is off here but on elsewhere', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_B, true);
    await createService().getSupplyStatus(SPACE_A, request);
    expect(getWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('reads enrich from the default space when Hunt is off here but on elsewhere', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_B, true);
    await createService().getSupplyStatus(SPACE_A, request);
    expect(getWorkflow).toHaveBeenCalledWith(
      THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
      DEFAULT_SPACE_ID,
      request
    );
  });

  it('marks enrich inUseElsewhere when Hunt is off here but on elsewhere', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, false);
    huntEnabledBySpace.set(SPACE_B, true);
    const status = await createService().getSupplyStatus(SPACE_A, request);
    expect(status.workflows.find((w) => w.key === 'enrich')?.inUseElsewhere).toBe(true);
  });

  it('reports where each Hunt model tier gets its model alongside the workflows', async () => {
    seedAllTiWorkflows(true);
    huntEnabledBySpace.set(SPACE_A, true);
    const searchInferenceEndpoints = {
      endpoints: {
        getForFeature: jest.fn().mockResolvedValue({
          endpoints: [{ connectorId: 'opus', isRecommended: true }],
          soEntryFound: false,
        }),
      },
    } as unknown as SearchInferenceEndpointsPluginStart;

    const status = await createService([SPACE_A, SPACE_B], {
      searchInferenceEndpoints,
    }).getSupplyStatus(SPACE_A, request);

    expect(status.modelTiers).toEqual([
      { tier: 'efficient', state: 'recommended' },
      { tier: 'frontier', state: 'recommended' },
    ]);
  });

  it('keeps the hard gate open when a model tier is unavailable', async () => {
    const searchInferenceEndpoints = {
      endpoints: {
        getForFeature: jest.fn().mockResolvedValue({ endpoints: [], soEntryFound: false }),
      },
    } as unknown as SearchInferenceEndpointsPluginStart;

    const status = await createService([SPACE_A, SPACE_B], {
      searchInferenceEndpoints,
    }).getSupplyStatus(SPACE_A, request);

    expect(status.modelTiers.every(({ state }) => state === 'unavailable')).toBe(true);
    expect(status.hardGate).toEqual({ ok: true, reasonCodes: [] });
  });

  it('still reports every tier when the model-tier registry is not installed', async () => {
    // No registry and no default connector: nothing for Hunt to run on, so every tier says so.
    expect(
      (await createService().getSupplyStatus(SPACE_A, request)).modelTiers.map(({ state }) => state)
    ).toEqual(['unavailable', 'unavailable']);
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
      DEFAULT_SPACE_ID,
      request
    );
  });
});

describe('ThreatIntelSupplyService end state by space', () => {
  type Operation = 'ensure' | 'teardown' | 'restore';

  interface Row {
    name: string;
    operation: Operation;
    seed: SupplyDocumentStates;
    installer?: boolean;
    gateOk?: boolean;
    failUpdates?: SupplyDocumentLabel[];
    /** Models a concurrent enable in space B right after the attribute document of A goes off. */
    raceEnablesBAfterAttrAOff?: boolean;
    expectedDocs: SupplyDocumentStates;
    expectedOutcome:
      | 'ok'
      | 'ThreatIntelSupplyNotInstalledError'
      | 'ThreatIntelSupplyHuntDisabledError'
      | 'ThreatIntelSupplyHardGateError'
      | 'Error';
  }

  const allOff: SupplyDocumentStates = {
    ingest: false,
    enrich: false,
    attrA: false,
    attrB: false,
    cthA: false,
    cthB: false,
  };

  const rows: Row[] = [
    {
      name: 'enable A, nothing else on: ingest, enrich and attribute-A turn on',
      operation: 'ensure',
      seed: allOff,
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'enable A while B hunts: globals stay on, attribute-A turns on',
      operation: 'ensure',
      seed: { ...allOff, ingest: true, enrich: true, attrB: true, cthB: true },
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true, attrB: true, cthB: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'enable A with attribute-A missing: the installer adds it and it turns on',
      operation: 'ensure',
      seed: { ingest: false, enrich: false, attrB: false, cthA: false, cthB: false },
      installer: true,
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'enable A with enrich missing and no installer: nothing is left changed',
      operation: 'ensure',
      seed: { ingest: false, attrA: false, attrB: false, cthA: false, cthB: false },
      expectedDocs: { ingest: false, attrA: false, attrB: false, cthA: false, cthB: false },
      expectedOutcome: 'ThreatIntelSupplyNotInstalledError',
    },
    {
      name: 'disable A, B off: attribute-A and both globals turn off',
      operation: 'teardown',
      seed: { ...allOff, ingest: true, enrich: true, attrA: true },
      expectedDocs: allOff,
      expectedOutcome: 'ok',
    },
    {
      name: 'disable A, B on: only attribute-A turns off',
      operation: 'teardown',
      seed: { ...allOff, ingest: true, enrich: true, attrA: true, attrB: true, cthB: true },
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrB: true, cthB: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'disable A with attribute-A missing: globals still turn off by refcount',
      operation: 'teardown',
      seed: { ingest: true, enrich: true, attrB: false, cthA: false, cthB: false },
      expectedDocs: { ingest: false, enrich: false, attrB: false, cthA: false, cthB: false },
      expectedOutcome: 'ok',
    },
    {
      name: 'disable A when the global update is forbidden: attribute-A is off, ingest stays on',
      operation: 'teardown',
      seed: { ...allOff, ingest: true, enrich: true, attrA: true },
      failUpdates: ['ingest'],
      expectedDocs: { ...allOff, ingest: true, enrich: true },
      expectedOutcome: 'Error',
    },
    {
      name: 'disable A while the default space hunts: globals stay on',
      operation: 'teardown',
      seed: { ...allOff, ingest: true, enrich: true, attrA: true, cthDefault: true },
      expectedDocs: { ...allOff, ingest: true, enrich: true, cthDefault: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'disable A while B enables concurrently: globals stay on',
      operation: 'teardown',
      seed: { ...allOff, ingest: true, enrich: true, attrA: true },
      raceEnablesBAfterAttrAOff: true,
      expectedDocs: { ...allOff, ingest: true, enrich: true, cthB: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'restore A from ingest drifted off: ingest turns back on',
      operation: 'restore',
      seed: { ...allOff, enrich: true, attrA: true, cthA: true },
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true, cthA: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'restore A from everything off reaches the same end state as a first enable',
      operation: 'restore',
      seed: { ...allOff, cthA: true },
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true, cthA: true },
      expectedOutcome: 'ok',
    },
    {
      name: '13c. restore A from a mix of off and missing documents reaches the same end state',
      operation: 'restore',
      seed: { ingest: true, enrich: false, attrB: false, cthA: true, cthB: false },
      installer: true,
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true, cthA: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'restore A with Hunt off: nothing is written',
      operation: 'restore',
      seed: allOff,
      expectedDocs: allOff,
      expectedOutcome: 'ThreatIntelSupplyHuntDisabledError',
    },
    {
      name: 'restore A with the hard gate blocked: nothing is written',
      operation: 'restore',
      seed: { ...allOff, cthA: true },
      gateOk: false,
      expectedDocs: { ...allOff, cthA: true },
      expectedOutcome: 'ThreatIntelSupplyHardGateError',
    },
    {
      name: 'restore A with attribute-A missing and an installer: it is installed and turns on',
      operation: 'restore',
      seed: { ingest: true, enrich: true, attrB: false, cthA: true, cthB: false },
      installer: true,
      expectedDocs: { ...allOff, ingest: true, enrich: true, attrA: true, cthA: true },
      expectedOutcome: 'ok',
    },
    {
      name: 'restore A with attribute-A missing and no installer: the globals it could fix stay on',
      operation: 'restore',
      seed: { ingest: false, enrich: false, attrB: false, cthA: true, cthB: false },
      // Hunt is already on in A, so the failed ensure is not undone (see ensureSupplyForSpace).
      expectedDocs: { ingest: true, enrich: true, attrB: false, cthA: true, cthB: false },
      expectedOutcome: 'ThreatIntelSupplyNotInstalledError',
    },
  ];

  const run = async (row: Row) => {
    const gateEsClient = createHardGateEsClient(row.gateOk !== false);

    const fake = createKeyedSupplyStore({
      seed: row.seed,
      failUpdates: row.failUpdates,
      afterUpdate: row.raceEnablesBAfterAttrAOff
        ? ({ label, enabled, store }) => {
            if (label === 'attrA' && !enabled) {
              store.set(
                `${SPACE_B}/${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}-${SPACE_B}`,
                {
                  enabled: true,
                }
              );
            }
          }
        : undefined,
    });
    const service = new ThreatIntelSupplyService({
      management: fake.management,
      managedWorkflows: Promise.resolve(fake.managedWorkflows),
      logger: loggingSystemMock.createLogger() as Logger,
      getEsClient: async () => gateEsClient,
      enumerateSpaceIds: async () => ['default', SPACE_A, SPACE_B],
      getWorkflowInstaller: row.installer ? () => fake.installer : undefined,
      getInference: () => ({ getDefaultConnector: jest.fn() } as unknown as InferenceServerStart),
      getUiSettingsClient: () => ({ get: jest.fn() } as unknown as IUiSettingsClient),
    });

    const operations: Record<Operation, () => Promise<unknown>> = {
      ensure: () => service.ensureSupplyForSpace(SPACE_A, request),
      teardown: () => service.teardownSupplyForSpace(SPACE_A, request),
      restore: () => service.restoreSupplyForSpace(SPACE_A, request),
    };
    const outcome = await operations[row.operation]().then(
      () => 'ok',
      (error: Error) => error.constructor.name
    );
    return { docs: fake.snapshot(), outcome };
  };

  describe.each(rows)('$name', (row) => {
    it('leaves the documents in the expected end state', async () => {
      expect((await run(row)).docs).toEqual(row.expectedDocs);
    });

    it('returns the expected outcome', async () => {
      expect((await run(row)).outcome).toBe(row.expectedOutcome);
    });
  });

  describe('status', () => {
    const statusFor = async (seed: SupplyDocumentStates) => {
      const fake = createKeyedSupplyStore({ seed });
      const esClient = createHardGateEsClient(true);
      return new ThreatIntelSupplyService({
        management: fake.management,
        managedWorkflows: Promise.resolve(fake.managedWorkflows),
        logger: loggingSystemMock.createLogger() as Logger,
        getEsClient: async () => esClient,
        enumerateSpaceIds: async () => ['default', SPACE_A, SPACE_B],
        getInference: () => ({ getDefaultConnector: jest.fn() } as unknown as InferenceServerStart),
        getUiSettingsClient: () => ({ get: jest.fn() } as unknown as IUiSettingsClient),
      }).getSupplyStatus(SPACE_A, request);
    };

    it('reports drift when Hunt is on in A and a required document is missing', async () => {
      const { drift } = await statusFor({ ingest: true, attrA: true, cthA: true, cthB: false });
      expect(drift).toBe(true);
    });

    it('marks only the deployment rows in use elsewhere when A is off and B hunts', async () => {
      const { workflows } = await statusFor({
        ...allOff,
        ingest: true,
        enrich: true,
        attrB: true,
        cthB: true,
      });
      expect(workflows.map(({ key, inUseElsewhere }) => [key, inUseElsewhere])).toEqual([
        ['ingest', true],
        ['enrich', true],
        ['attribute', undefined],
      ]);
    });

    it('reports no drift when nobody hunts, even with the globals left on', async () => {
      const { drift } = await statusFor({ ...allOff, ingest: true, enrich: true });
      expect(drift).toBe(false);
    });

    it('marks nothing in use elsewhere when nobody hunts', async () => {
      const { workflows } = await statusFor({ ...allOff, ingest: true, enrich: true });
      expect(workflows.some(({ inUseElsewhere }) => inUseElsewhere)).toBe(false);
    });
  });
});
