/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DualWriteStore } from './dual_write_store';
import type { PndStore } from './pnd_store';

const createLogger = (): jest.Mocked<Logger> =>
  ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as any);

const ES_CLIENT = {} as ElasticsearchClient;

// Minimal PndStore stub — only the methods under test are meaningfully
// implemented, the rest throw if accidentally called.
const createStubStore = (overrides: Partial<PndStore> = {}): PndStore =>
  ({
    ensureReady: jest.fn().mockResolvedValue(undefined),
    listInvestigations: jest.fn(),
    getInvestigation: jest.fn(),
    listProposals: jest.fn(),
    listAllProposals: jest.fn(),
    listApprovedProposals: jest.fn(),
    getWatchActivityMetrics: jest.fn(),
    createInvestigationIfMissing: jest.fn().mockResolvedValue(undefined),
    updateProposalStatus: jest.fn().mockResolvedValue(null),
    reconcileInvestigationAfterDecision: jest.fn().mockResolvedValue(undefined),
    saveProposal: jest.fn().mockResolvedValue(undefined),
    saveEvidencePackage: jest.fn().mockResolvedValue(undefined),
    saveWorkerEvaluationRecord: jest.fn().mockResolvedValue(undefined),
    recordEscalation: jest.fn().mockResolvedValue(undefined),
    recordDeepWatchOutcome: jest.fn().mockResolvedValue(undefined),
    recordDetectionChangeSignal: jest.fn().mockResolvedValue(undefined),
    forkToIncident: jest.fn().mockResolvedValue({ outcome: 'investigation_not_found' }),
    getIncident: jest.fn().mockResolvedValue(null),
    findIncidentForInvestigation: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as PndStore);

describe('DualWriteStore', () => {
  // Regression test for a bug where fanOutWrite extracted the shadow store's
  // method as a bare function reference (`this.shadow[methodName]`) and
  // invoked it without rebinding `this`. Any shadow method that reads an
  // instance field (e.g. `this.legacy` in PndConversationStore) threw
  // "Cannot read properties of undefined" on every real call, silently
  // breaking every shadow write while looking like independent per-method
  // failures in the logs.
  it('calls shadow write methods bound to the shadow instance, not detached', async () => {
    const primary = createStubStore();

    // A shadow store whose method relies on `this` to prove it wasn't
    // stripped of its instance context by fanOutWrite's extraction.
    class ThisDependentShadow implements PndStore {
      public sawInstanceField = false;
      private readonly marker = 'shadow-instance';

      async recordDeepWatchOutcome(
        ...args: Parameters<PndStore['recordDeepWatchOutcome']>
      ): Promise<void> {
        // Accessing `this.marker` throws TypeError if called unbound.
        this.sawInstanceField = this.marker === 'shadow-instance';
      }

      // Unused methods for this test — stub them to satisfy the interface.
      ensureReady = jest.fn();
      listInvestigations = jest.fn();
      getInvestigation = jest.fn();
      listProposals = jest.fn();
      listAllProposals = jest.fn();
      listApprovedProposals = jest.fn();
      getWatchActivityMetrics = jest.fn();
      createInvestigationIfMissing = jest.fn();
      updateProposalStatus = jest.fn();
      reconcileInvestigationAfterDecision = jest.fn();
      saveProposal = jest.fn();
      saveEvidencePackage = jest.fn();
      saveWorkerEvaluationRecord = jest.fn();
      recordEscalation = jest.fn();
      recordDetectionChangeSignal = jest.fn();
      forkToIncident = jest.fn();
      getIncident = jest.fn();
      findIncidentForInvestigation = jest.fn();
    }

    const shadow = new ThisDependentShadow();
    const logger = createLogger();
    const store = new DualWriteStore(logger, primary, shadow);

    await store.recordDeepWatchOutcome(ES_CLIENT, {
      investigationId: 'inv-1',
      events: [],
    });

    // Give the fire-and-forget fanOutWrite microtask a tick to run.
    await Promise.resolve();
    await Promise.resolve();

    expect(shadow.sawInstanceField).toBe(true);
    // No "Cannot read properties of undefined" warning should have been logged.
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not block the primary write when the shadow write fails', async () => {
    const primary = createStubStore();
    const shadow = createStubStore({
      saveProposal: jest.fn().mockRejectedValue(new Error('shadow unavailable')),
    });
    const logger = createLogger();
    const store = new DualWriteStore(logger, primary, shadow);

    const proposal = { id: 'prop-1' } as unknown as Parameters<PndStore['saveProposal']>[1];
    await expect(store.saveProposal(ES_CLIENT, proposal)).resolves.toBeUndefined();
    expect(primary.saveProposal).toHaveBeenCalledWith(ES_CLIENT, proposal);

    await Promise.resolve();
    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('shadow saveProposal failed'));
  });

  it('delegates read methods to primary only, never touching shadow', async () => {
    const primary = createStubStore({
      listInvestigations: jest.fn().mockResolvedValue([{ id: 'inv-1' }]),
    });
    const shadow = createStubStore();
    const store = new DualWriteStore(createLogger(), primary, shadow);

    const result = await store.listInvestigations(ES_CLIENT);

    expect(result).toEqual([{ id: 'inv-1' }]);
    expect(primary.listInvestigations).toHaveBeenCalledWith(ES_CLIENT);
    expect(shadow.listInvestigations).not.toHaveBeenCalled();
  });
});
