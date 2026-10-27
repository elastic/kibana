/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import {
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
  THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import {
  ensureThreatIntelSupplyWorkflowsForSpace,
  installThreatIntelManagedWorkflows,
  reconcileThreatIntelAttributeWorkflows,
  uninstallThreatIntelManagedWorkflows,
} from './install';

const createClient = () => ({
  install: jest.fn().mockResolvedValue(undefined),
  uninstall: jest.fn().mockResolvedValue(undefined),
  ready: jest.fn().mockResolvedValue(undefined),
  // Defaults to "nothing installed"; tests that exercise the uninstall path
  // override this to report at least one TI instance as installed.
  listInstalledWorkflowStates: jest.fn().mockResolvedValue([]),
});

const installedState = (overrides: {
  workflowId: string;
  spaceId?: string;
  definitionId?: string | null;
}) => ({
  workflowId: overrides.workflowId,
  spaceId: overrides.spaceId ?? GLOBAL_WORKFLOW_SPACE_ID,
  definitionId:
    overrides.definitionId === undefined ? overrides.workflowId : overrides.definitionId,
  templateValues: null,
  documentVersion: 1,
});

let logger = loggingSystemMock.createLogger();

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
});

describe('threat intel managed workflow install', () => {
  const supplyWorkflowIds = [
    THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
    THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID,
  ];

  describe('installThreatIntelManagedWorkflows', () => {
    const runInstall = async (client: ReturnType<typeof createClient>) =>
      installThreatIntelManagedWorkflows({
        managedWorkflowsClient: client as never,
        spaceIds: ['default', 'space-a'],
        logger,
      });

    it.each(supplyWorkflowIds)('returns %s installed in the default space', async (workflowId) => {
      const client = createClient();

      await runInstall(client);

      expect(client.install).toHaveBeenCalledWith(workflowId, { spaceId: DEFAULT_SPACE_ID });
    });

    it.each(supplyWorkflowIds)(
      'returns the legacy global %s uninstalled before the default-space install',
      async (workflowId) => {
        const client = createClient();

        await runInstall(client);

        const uninstallOrder =
          client.uninstall.mock.invocationCallOrder[
            client.uninstall.mock.calls.findIndex(
              ([id, options]) => id === workflowId && options.spaceId === GLOBAL_WORKFLOW_SPACE_ID
            )
          ];
        const installOrder =
          client.install.mock.invocationCallOrder[
            client.install.mock.calls.findIndex(
              ([id, options]) => id === workflowId && options.spaceId === DEFAULT_SPACE_ID
            )
          ];
        expect(uninstallOrder).toBeLessThan(installOrder);
      }
    );

    it('returns no supply install in the global workflow space', async () => {
      const client = createClient();

      await runInstall(client);

      expect(
        client.install.mock.calls.filter(
          ([, options]) => options.spaceId === GLOBAL_WORKFLOW_SPACE_ID
        )
      ).toEqual([]);
    });

    it('returns attribute installed per space', async () => {
      const client = createClient();

      await runInstall(client);

      expect(
        client.install.mock.calls.filter(([id]) => id === THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID)
      ).toEqual([
        [
          THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
          { spaceId: 'default', workflowIdSuffix: 'default' },
        ],
        [
          THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
          { spaceId: 'space-a', workflowIdSuffix: 'space-a' },
        ],
      ]);
    });

    describe('when the legacy global uninstall fails', () => {
      let client: ReturnType<typeof createClient>;

      beforeEach(async () => {
        client = createClient();
        client.uninstall.mockRejectedValue(new Error('forbidden'));
        await runInstall(client);
      });

      it.each(supplyWorkflowIds)(
        'returns %s tracked in the global space so it is not orphan-cleaned',
        (workflowId) => {
          expect(client.install).toHaveBeenCalledWith(workflowId, {
            spaceId: GLOBAL_WORKFLOW_SPACE_ID,
          });
        }
      );

      it.each(supplyWorkflowIds)(
        'returns %s tracked in the default space so it is not orphan-cleaned',
        (workflowId) => {
          expect(client.install).toHaveBeenCalledWith(workflowId, {
            spaceId: DEFAULT_SPACE_ID,
          });
        }
      );

      it('returns each supply workflow install attempted once per space', () => {
        expect(
          client.install.mock.calls.filter(([id]) => id === THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID)
        ).toHaveLength(2);
      });

      it('returns the attribute workflows still installed', () => {
        expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
          spaceId: 'space-a',
          workflowIdSuffix: 'space-a',
        });
      });
    });
  });

  describe('ensureThreatIntelSupplyWorkflowsForSpace', () => {
    const defaultArgs = { spaceId: 'another' };

    it.each(supplyWorkflowIds)('returns %s installed in the default space', async (workflowId) => {
      const client = createClient();

      await ensureThreatIntelSupplyWorkflowsForSpace({
        ...defaultArgs,
        managedWorkflowsClient: client as never,
      });

      expect(client.install).toHaveBeenCalledWith(workflowId, { spaceId: DEFAULT_SPACE_ID });
    });

    it.each(supplyWorkflowIds)(
      'returns the legacy global %s uninstalled before the default-space install',
      async (workflowId) => {
        const client = createClient();

        await ensureThreatIntelSupplyWorkflowsForSpace({
          ...defaultArgs,
          managedWorkflowsClient: client as never,
        });

        const uninstallOrder =
          client.uninstall.mock.invocationCallOrder[
            client.uninstall.mock.calls.findIndex(
              ([id, options]) => id === workflowId && options.spaceId === GLOBAL_WORKFLOW_SPACE_ID
            )
          ];
        const installOrder =
          client.install.mock.invocationCallOrder[
            client.install.mock.calls.findIndex(([id]) => id === workflowId)
          ];
        expect(uninstallOrder).toBeLessThan(installOrder);
      }
    );

    it('returns attribute installed for that space', async () => {
      const client = createClient();

      await ensureThreatIntelSupplyWorkflowsForSpace({
        ...defaultArgs,
        managedWorkflowsClient: client as never,
      });

      expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
        spaceId: 'another',
        workflowIdSuffix: 'another',
      });
    });

    it('returns a rejection when the legacy uninstall fails', async () => {
      const client = createClient();
      client.uninstall.mockRejectedValueOnce(new Error('uninstall denied'));

      await expect(
        ensureThreatIntelSupplyWorkflowsForSpace({
          ...defaultArgs,
          managedWorkflowsClient: client as never,
        })
      ).rejects.toThrow('uninstall denied');
    });

    it('returns a rejection when an install fails', async () => {
      const client = createClient();
      client.install.mockRejectedValueOnce(new Error('install denied'));

      await expect(
        ensureThreatIntelSupplyWorkflowsForSpace({
          ...defaultArgs,
          managedWorkflowsClient: client as never,
        })
      ).rejects.toThrow('install denied');
    });
  });

  it('reconciles attribute installs for the given spaces only', async () => {
    const client = createClient();

    await reconcileThreatIntelAttributeWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['space-b'],
      logger,
    });

    expect(client.install).toHaveBeenCalledTimes(1);
    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'space-b',
      workflowIdSuffix: 'space-b',
    });
  });

  describe('uninstallThreatIntelManagedWorkflows', () => {
    const runUninstall = async () => {
      const client = createClient();
      client.listInstalledWorkflowStates.mockResolvedValue([
        installedState({ workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID }),
      ]);
      await uninstallThreatIntelManagedWorkflows({
        managedWorkflowsClient: client as never,
        getSpaceIds: async () => ['default', 'space-a'],
        logger,
      });
      return client;
    };

    it.each(supplyWorkflowIds)(
      'returns %s uninstalled in the default space',
      async (workflowId) => {
        const client = await runUninstall();

        expect(client.uninstall).toHaveBeenCalledWith(workflowId, { spaceId: DEFAULT_SPACE_ID });
      }
    );

    it.each(supplyWorkflowIds)(
      'returns %s uninstalled in the legacy global space',
      async (workflowId) => {
        const client = await runUninstall();

        expect(client.uninstall).toHaveBeenCalledWith(workflowId, {
          spaceId: GLOBAL_WORKFLOW_SPACE_ID,
        });
      }
    );

    it.each(['default', 'space-a'])('returns attribute uninstalled in %s', async (spaceId) => {
      const client = await runUninstall();

      expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: spaceId,
      });
    });
  });

  it('tolerates uninstall failures so a partial prior install still cleans up', async () => {
    const client = createClient();
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({ workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID }),
    ]);
    client.uninstall.mockRejectedValueOnce(new Error('missing')).mockResolvedValue(undefined);

    await expect(
      uninstallThreatIntelManagedWorkflows({
        managedWorkflowsClient: client as never,
        getSpaceIds: async () => ['default'],
        logger,
      })
    ).resolves.toBeUndefined();
    expect(client.uninstall).toHaveBeenCalledTimes(5);
  });

  // Not-found is the expected case on a deployment that never had the flag on,
  // but a bare `catch {}` made a 403 or a 5xx just as invisible, and the
  // workflows keep running against alerts nobody is looking at any more.
  it('records an uninstall failure at warn rather than dropping it', async () => {
    const client = createClient();
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({ workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID }),
    ]);
    client.uninstall.mockRejectedValueOnce(new Error('forbidden')).mockResolvedValue(undefined);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds: async () => ['default'],
      logger,
    });

    expect(loggingSystemMock.collect(logger).warn).toEqual(
      expect.arrayContaining([
        [
          expect.stringContaining(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID),
          { error: expect.any(Error) },
        ],
      ])
    );
    expect(loggingSystemMock.collect(logger).debug).toEqual([]);
  });

  // The whole point of the short circuit: a deployment that never turned the
  // supply flag on should not enumerate spaces or fire per-space uninstalls on
  // every restart just to confirm there is nothing to remove.
  it('skips space enumeration and every uninstall call when no TI workflow is installed', async () => {
    const client = createClient();
    const getSpaceIds = jest.fn().mockResolvedValue(['default', 'space-a']);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds,
      logger,
    });

    expect(client.uninstall).not.toHaveBeenCalled();
    expect(getSpaceIds).not.toHaveBeenCalled();
  });

  it('still uninstalls when only one of the two supply workflows is installed', async () => {
    const client = createClient();
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({ workflowId: THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID }),
    ]);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds: async () => ['default'],
      logger,
    });

    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, {
      spaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'default',
    });
  });

  it('still uninstalls when the supply workflow is installed in the default space', async () => {
    const client = createClient();
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({
        workflowId: THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID,
        spaceId: DEFAULT_SPACE_ID,
      }),
    ]);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds: async () => ['default'],
      logger,
    });

    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE_ID,
    });
  });

  it('still uninstalls when only a per-space attribute workflow is installed', async () => {
    const client = createClient();
    const getSpaceIds = jest.fn().mockResolvedValue(['default']);
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({
        workflowId: `${THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID}-default`,
        spaceId: 'default',
        definitionId: THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID,
      }),
    ]);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds,
      logger,
    });

    expect(getSpaceIds).toHaveBeenCalled();
    expect(client.uninstall).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'default',
      workflowIdSuffix: 'default',
    });
  });

  // The list is plugin-scoped, so alert-analysis is always present on a
  // healthy securitySolution boot. That must not disable the short circuit.
  it('skips uninstall when the list has only a non-TI workflow', async () => {
    const client = createClient();
    const getSpaceIds = jest.fn().mockResolvedValue(['default']);
    client.listInstalledWorkflowStates.mockResolvedValue([
      installedState({ workflowId: SECURITY_ALERT_ANALYSIS_WORKFLOW_ID }),
    ]);

    await uninstallThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      getSpaceIds,
      logger,
    });

    expect(client.uninstall).not.toHaveBeenCalled();
    expect(getSpaceIds).not.toHaveBeenCalled();
  });
});

/**
 * These loops used to be bare `await`s. One failing install (a space whose
 * workflows index is not writable, or a supply workflow whose definition failed
 * validation) rejected out of the whole loop, so every install after it was
 * skipped on every pass, and the caller's `warn` swallowed the rejection. A
 * deployment could be one space deep and look fully covered.
 */
describe('one failing install does not cancel the others', () => {
  it('still installs the enrich workflow when ingest fails', async () => {
    const client = createClient();
    client.install.mockRejectedValueOnce(new Error('bad definition'));

    await installThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: [],
      logger,
    });

    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, {
      spaceId: DEFAULT_SPACE_ID,
    });
  });

  it('still reaches the per-space installs when a supply install fails', async () => {
    const client = createClient();
    client.install.mockRejectedValueOnce(new Error('bad definition'));

    await installThreatIntelManagedWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['space-a'],
      logger,
    });

    expect(client.install).toHaveBeenCalledWith(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, {
      spaceId: 'space-a',
      workflowIdSuffix: 'space-a',
    });
  });

  it('installs the remaining spaces after one space fails', async () => {
    const client = createClient();
    client.install.mockImplementation(async (_id: string, { spaceId }: { spaceId: string }) => {
      if (spaceId === 'space-a') throw new Error('index is read-only');
    });

    await reconcileThreatIntelAttributeWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['space-a', 'space-b', 'space-c'],
      logger,
    });

    expect(client.install.mock.calls.map(([, options]) => options.spaceId)).toEqual([
      'space-a',
      'space-b',
      'space-c',
    ]);
  });

  it('resolves rather than rejecting, so the caller is not the one swallowing it', async () => {
    const client = createClient();
    client.install.mockRejectedValue(new Error('index is read-only'));

    await expect(
      reconcileThreatIntelAttributeWorkflows({
        managedWorkflowsClient: client as never,
        spaceIds: ['space-a'],
        logger,
      })
    ).resolves.toBeUndefined();
  });

  // The point of the summary line: the per-space failures are individually
  // logged, but only a count tells an operator that alert attribution is dark
  // in those spaces until the promote task's next reconcile.
  it('names the spaces left without attribution', async () => {
    const client = createClient();
    client.install.mockImplementation(async (_id: string, { spaceId }: { spaceId: string }) => {
      if (spaceId !== 'space-b') throw new Error('index is read-only');
    });

    await reconcileThreatIntelAttributeWorkflows({
      managedWorkflowsClient: client as never,
      spaceIds: ['space-a', 'space-b', 'space-c'],
      logger,
    });

    expect(loggingSystemMock.collect(logger).warn.at(-1)).toEqual([
      expect.stringContaining('2 of 3 space(s)'),
    ]);
  });
});
