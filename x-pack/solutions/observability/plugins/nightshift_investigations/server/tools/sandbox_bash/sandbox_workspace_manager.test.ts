/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  actionsMock,
  actionsClientMock,
  actionsAuthorizationMock,
} from '@kbn/actions-plugin/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { createSandboxWorkspaceManager } from './sandbox_workspace_manager';

jest.mock('./connector_manifest', () => ({
  writeConnectorManifest: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('./elastic_manifest', () => ({
  ...jest.requireActual('./elastic_manifest'),
  writeElasticManifest: jest.fn().mockResolvedValue(undefined),
}));

import { writeConnectorManifest } from './connector_manifest';
import { writeElasticManifest } from './elastic_manifest';

const mockWriteConnectorManifest = writeConnectorManifest as jest.Mock;
const mockWriteElasticManifest = writeElasticManifest as jest.Mock;

const createSessionMock = (isReset: boolean): SandboxSession => {
  const session = {
    get isReset() {
      return isReset;
    },
    runCommand: jest.fn(),
    readFiles: jest.fn(),
    writeFiles: jest.fn().mockResolvedValue([{ bytes_written: 0, success: true }]),
    mkdirs: jest.fn(),
    statFiles: jest.fn().mockImplementation(async (paths: string[]) =>
      paths.map((path) => ({
        path,
        exists: true,
        is_dir: false,
        size: 1,
        modified_time_sec: 0,
      }))
    ),
  };
  return session as unknown as SandboxSession;
};

const createMutableSessionMock = (): {
  session: SandboxSession;
  setIsReset: (v: boolean) => void;
} => {
  let isReset = false;
  const session = {
    get isReset() {
      return isReset;
    },
    runCommand: jest.fn(),
    readFiles: jest.fn(),
    writeFiles: jest.fn().mockResolvedValue([{ bytes_written: 0, success: true }]),
    mkdirs: jest.fn(),
    statFiles: jest.fn().mockImplementation(async (paths: string[]) =>
      paths.map((path) => ({
        path,
        exists: true,
        is_dir: false,
        size: 1,
        modified_time_sec: 0,
      }))
    ),
  };
  return {
    session: session as unknown as SandboxSession,
    setIsReset: (v: boolean) => {
      isReset = v;
    },
  };
};

const createCallContext = (allowedConnectorIds: readonly string[]): SandboxCallContext => ({
  request: httpServerMock.createKibanaRequest(),
  allowedConnectorIds,
  resolvedCredentials: new Map(),
});

describe('createSandboxWorkspaceManager', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let manager: ReturnType<typeof createSandboxWorkspaceManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteElasticManifest.mockResolvedValue(undefined);
    logger = loggingSystemMock.createLogger();
    manager = createSandboxWorkspaceManager({ getDeps: () => ({}), logger });
  });

  it('writes manifest when session isReset is true', async () => {
    const session = createSessionMock(true);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('writes manifest on first call regardless of isReset', async () => {
    const session = createSessionMock(false);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('skips manifest write when session is not reset and connector set is unchanged', async () => {
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    // First call records the connector set
    await manager.ensureWorkspaceReady({ session, callContext });
    mockWriteConnectorManifest.mockClear();

    // Second call — same session (not reset), same connectors → skip
    await manager.ensureWorkspaceReady({ session, callContext });

    expect(mockWriteConnectorManifest).not.toHaveBeenCalled();
    expect(session.statFiles).toHaveBeenCalledWith([
      '/workspace/.connector-docs/elastic.md',
      '/workspace/connectors.md',
    ]);
  });

  it('recreates manifests when reset was consumed but required files are missing', async () => {
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    await manager.ensureWorkspaceReady({ session, callContext });
    mockWriteConnectorManifest.mockClear();
    (session.statFiles as jest.Mock).mockResolvedValue([
      {
        path: '/workspace/.connector-docs/elastic.md',
        exists: false,
        is_dir: false,
        size: 0,
        modified_time_sec: 0,
      },
      {
        path: '/workspace/connectors.md',
        exists: true,
        is_dir: false,
        size: 1,
        modified_time_sec: 0,
      },
    ]);

    await manager.ensureWorkspaceReady({ session, callContext });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('rewrites manifest when connector set changes', async () => {
    const session = createSessionMock(false);

    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1', 'connector-2']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('rewrites manifest after pod eviction (isReset flips to true)', async () => {
    const { session, setIsReset } = createMutableSessionMock();

    // First call — not reset, records connector set
    setIsReset(false);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });
    mockWriteConnectorManifest.mockClear();

    // Pod evicted → isReset flips
    setIsReset(true);
    await manager.ensureWorkspaceReady({
      session,
      callContext: createCallContext(['connector-1']),
    });

    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  it('swallows manifest write failures and logs a warning (best-effort)', async () => {
    mockWriteConnectorManifest.mockRejectedValueOnce(new Error('gRPC timeout'));
    const session = createSessionMock(true);

    await expect(
      manager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['connector-1']),
      })
    ).resolves.toBeUndefined();

    expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
  });

  it('retries manifest write on next call when previous write failed', async () => {
    mockWriteConnectorManifest.mockRejectedValueOnce(new Error('transient error'));
    const session = createSessionMock(false);
    const callContext = createCallContext(['connector-1']);

    // First call — write fails, key must NOT be recorded
    await manager.ensureWorkspaceReady({ session, callContext });
    mockWriteConnectorManifest.mockClear();

    // Second call — same connector set, but since first write failed, must retry
    await manager.ensureWorkspaceReady({ session, callContext });
    expect(mockWriteConnectorManifest).toHaveBeenCalledTimes(1);
  });

  describe('telemetryConnectorId', () => {
    let managerWithTelemetry: ReturnType<typeof createSandboxWorkspaceManager>;
    let actions: ReturnType<typeof actionsMock.createStart>;
    let actionsClient: ReturnType<typeof actionsClientMock.create>;
    let authorization: ReturnType<typeof actionsAuthorizationMock.create>;

    beforeEach(() => {
      actions = actionsMock.createStart();
      actionsClient = actionsClientMock.create();
      authorization = actionsAuthorizationMock.create();
      const connector = {
        id: 'elasticsearch-telemetry',
        name: 'Telemetry',
        actionTypeId: '.webhook',
        config: {},
        isPreconfigured: true,
        isDeprecated: false,
        isSystemAction: false,
        isConnectorTypeDeprecated: false,
      };
      actionsClient.get.mockResolvedValue(connector);
      actions.getActionsClientWithRequest.mockResolvedValue(actionsClient);
      actions.getActionsAuthorizationWithRequest.mockReturnValue(authorization);
      actions.inMemoryConnectors = [{ ...connector, secrets: {} }];
      managerWithTelemetry = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryConnectorId: 'elasticsearch-telemetry',
        logger,
      });
    });

    it('keeps concurrent c0 and ORCA workspace guidance isolated', async () => {
      const baseConnector = actions.inMemoryConnectors[0];
      actions.inMemoryConnectors = ['c0', 'orca'].map((id) => ({ ...baseConnector, id }));
      const telemetryTargets = [
        { connectorId: 'c0', readableIndices: 'remote:logs-*' },
        { connectorId: 'orca', readableIndices: 'logs-orcabench.*' },
      ];
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets,
        logger,
      });
      const c0Session = createSessionMock(false);
      const orcaSession = createSessionMock(false);
      const noneSession = createSessionMock(false);
      await Promise.all([
        named.ensureWorkspaceReady({ session: c0Session, callContext: createCallContext(['c0']) }),
        named.ensureWorkspaceReady({
          session: orcaSession,
          callContext: createCallContext(['orca']),
        }),
        named.ensureWorkspaceReady({ session: noneSession, callContext: createCallContext([]) }),
      ]);
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          session: c0Session,
          credentials: { kind: 'connector', connectorId: 'c0' },
          readableIndices: 'remote:logs-*',
        })
      );
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          session: orcaSession,
          credentials: { kind: 'connector', connectorId: 'orca' },
          readableIndices: 'logs-orcabench.*',
        })
      );
      expect(mockWriteElasticManifest).toHaveBeenCalledTimes(2);
      expect(noneSession.writeFiles).toHaveBeenCalledWith([
        {
          path: '/workspace/.connector-docs/elastic.md',
          content: Buffer.from('No telemetry connector is available.\n'),
        },
      ]);
    });

    it('preserves a custom agent multi-connector allow-list without inferring one telemetry source', async () => {
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets: [
          { connectorId: 'c0', readableIndices: 'c0:logs-*' },
          { connectorId: 'orca', readableIndices: 'orca:logs-*' },
        ],
        getTelemetryTarget: async () => undefined,
        logger,
      });
      const callContext = { ...createCallContext(['c0', 'orca']), agentId: 'custom-agent' };

      await expect(named.prepareCallContext(callContext)).resolves.toBeUndefined();
      await expect(
        named.ensureWorkspaceReady({ session: createSessionMock(false), callContext })
      ).resolves.toBeUndefined();

      expect(callContext.allowedConnectorIds).toEqual(['c0', 'orca']);
      expect(mockWriteConnectorManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          callContext: expect.objectContaining({ allowedConnectorIds: ['c0', 'orca'] }),
        })
      );
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
    });

    it('scopes concurrent investigations that share the single agent to their conversation target', async () => {
      const baseConnector = actions.inMemoryConnectors[0];
      actions.inMemoryConnectors = ['c0', 'orca'].map((id) => ({ ...baseConnector, id }));
      const getTelemetryTarget = jest.fn(async ({ conversationId }: SandboxCallContext) => ({
        connectorId: conversationId === 'inv-c0' ? 'c0' : 'orca',
        readableIndices: conversationId === 'inv-c0' ? 'c0:logs-*' : 'orca:logs-*',
      }));
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets: [{ connectorId: 'c0' }, { connectorId: 'orca' }],
        getTelemetryTarget,
        logger,
      });
      const c0 = {
        ...createCallContext(['c0', 'orca', 'other']),
        conversationId: 'inv-c0',
        agentId: 'nightshift.investigation',
      };
      const orca = {
        ...createCallContext(['c0', 'orca', 'other']),
        conversationId: 'inv-orca',
        agentId: 'nightshift.investigation',
      };
      await Promise.all([named.prepareCallContext(c0), named.prepareCallContext(orca)]);
      await Promise.all([
        named.ensureWorkspaceReady({ session: createSessionMock(false), callContext: c0 }),
        named.ensureWorkspaceReady({ session: createSessionMock(false), callContext: orca }),
      ]);
      expect(c0.allowedConnectorIds).toEqual(['c0', 'other']);
      expect(orca.allowedConnectorIds).toEqual(['orca', 'other']);
      expect(getTelemetryTarget).toHaveBeenCalledTimes(2);
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: { kind: 'connector', connectorId: 'c0' },
          readableIndices: 'c0:logs-*',
        })
      );
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: { kind: 'connector', connectorId: 'orca' },
          readableIndices: 'orca:logs-*',
        })
      );
    });

    it('keeps a custom agent on its own allowed connector when investigations have another default', async () => {
      const baseConnector = actions.inMemoryConnectors[0];
      actions.inMemoryConnectors = ['c0', 'orca'].map((id) => ({ ...baseConnector, id }));
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets: [
          { connectorId: 'c0' },
          { connectorId: 'orca', readableIndices: 'orca:logs-*' },
        ],
        getTelemetryTarget: async () => undefined,
        logger,
      });
      const callContext = { ...createCallContext(['orca']), agentId: 'custom-agent' };
      await named.ensureWorkspaceReady({ session: createSessionMock(false), callContext });
      expect(callContext.allowedConnectorIds).toEqual(['orca']);
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: { kind: 'connector', connectorId: 'orca' },
          readableIndices: 'orca:logs-*',
        })
      );
    });

    it('removes telemetry access for none', async () => {
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets: [{ connectorId: 'c0' }, { connectorId: 'orca' }],
        getTelemetryTarget: async () => ({}),
        logger,
      });
      const callContext = createCallContext(['c0', 'orca', 'other']);
      await named.ensureWorkspaceReady({ session: createSessionMock(false), callContext });
      expect(callContext.allowedConnectorIds).toEqual(['other']);
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
    });

    it('resolves target-specific hints when targets share a connector', async () => {
      const named = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryTargets: [{ connectorId: 'elasticsearch-telemetry' }],
        getTelemetryTarget: async ({ conversationId }) => ({
          connectorId: 'elasticsearch-telemetry',
          readableIndices: conversationId === 'c0-conversation' ? 'c0:logs-*' : 'orca:logs-*',
        }),
        logger,
      });
      const session = createSessionMock(false);
      await named.ensureWorkspaceReady({
        session,
        callContext: {
          ...createCallContext(['elasticsearch-telemetry']),
          conversationId: 'c0-conversation',
        },
      });
      await named.ensureWorkspaceReady({
        session,
        callContext: {
          ...createCallContext(['elasticsearch-telemetry']),
          conversationId: 'orca-conversation',
        },
      });
      expect(mockWriteElasticManifest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ readableIndices: 'c0:logs-*' })
      );
      expect(mockWriteElasticManifest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ readableIndices: 'orca:logs-*' })
      );
    });

    it('writes elastic manifest alongside connector manifest on reset', async () => {
      const session = createSessionMock(true);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });

      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({
          credentials: { kind: 'connector', connectorId: 'elasticsearch-telemetry' },
          session,
        })
      );
    });

    it('passes the configured readable indices to the telemetry manifest', async () => {
      const session = createSessionMock(false);
      const configuredManager = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryConnectorId: 'elasticsearch-telemetry',
        telemetryReadableIndices: 'Read remote-a:logs-service-*',
        logger,
      });

      await configuredManager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });

      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({ readableIndices: 'Read remote-a:logs-service-*' })
      );
    });

    it('does not write the elastic manifest when the telemetry connector is denied', async () => {
      const session = createSessionMock(false);
      const configuredManager = createSandboxWorkspaceManager({
        getDeps: () => ({ actions }),
        telemetryConnectorId: 'elasticsearch-telemetry',
        telemetryReadableIndices: 'Read remote-a:logs-service-*',
        logger,
      });

      await configuredManager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['other']),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
    });

    it('does not write elastic manifest when telemetryConnectorId is not set', async () => {
      const session = createSessionMock(true);
      await manager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
    });

    it('clears retained hints after telemetry configuration is removed on restart', async () => {
      const session = createSessionMock(false);
      const callContext = createCallContext(['elasticsearch-telemetry']);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      mockWriteElasticManifest.mockClear();

      await manager.ensureWorkspaceReady({ session, callContext });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith([
        {
          path: '/workspace/.connector-docs/elastic.md',
          content: Buffer.from('No telemetry connector is available.\n'),
        },
      ]);
    });

    it('swallows elastic manifest write failures (best-effort)', async () => {
      mockWriteElasticManifest.mockRejectedValueOnce(new Error('gRPC timeout'));
      const session = createSessionMock(true);

      await expect(
        managerWithTelemetry.ensureWorkspaceReady({
          session,
          callContext: createCallContext(['elasticsearch-telemetry']),
        })
      ).resolves.toBeUndefined();

      expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
    });

    it('retries the telemetry manifest after a failed refresh on an initialized session', async () => {
      const { session, setIsReset } = createMutableSessionMock();
      const callContext = createCallContext(['elasticsearch-telemetry']);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });

      setIsReset(true);
      mockWriteElasticManifest.mockRejectedValueOnce(new Error('write failed'));
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      mockWriteElasticManifest.mockClear();

      // A later command can succeed on the pod even though the telemetry file was never written.
      setIsReset(false);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });

      expect(mockWriteElasticManifest).toHaveBeenCalledTimes(1);
    });
    it('does not seed private hints for agents without the telemetry connector', async () => {
      const session = createSessionMock(false);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['other']),
      });
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith([
        {
          path: '/workspace/.connector-docs/elastic.md',
          content: Buffer.from('No telemetry connector is available.\n'),
        },
      ]);
    });

    it('clears previously seeded hints when the agent allow-list changes', async () => {
      const session = createSessionMock(false);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });
      mockWriteElasticManifest.mockClear();
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext([]),
      });
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith([
        {
          path: '/workspace/.connector-docs/elastic.md',
          content: Buffer.from('No telemetry connector is available.\n'),
        },
      ]);
    });

    it('rechecks user access even when the agent allow-list is unchanged', async () => {
      const session = createSessionMock(false);
      const callContext = createCallContext(['elasticsearch-telemetry']);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      actionsClient.get.mockRejectedValueOnce(new Error('read denied'));
      mockWriteElasticManifest.mockClear();
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('blocks workspace access and retries if clearing unauthorized hints fails', async () => {
      const session = createSessionMock(false);
      const callContext = createCallContext([]);
      jest.mocked(session.writeFiles).mockResolvedValueOnce([{ bytes_written: 0, success: false }]);
      await expect(
        managerWithTelemetry.ensureWorkspaceReady({ session, callContext })
      ).rejects.toThrow('Failed to clear');
      await expect(
        managerWithTelemetry.ensureWorkspaceReady({ session, callContext })
      ).resolves.toBeUndefined();
      expect(session.writeFiles).toHaveBeenCalledTimes(2);
    });
    it('does not seed hints when connector execution is denied despite read access', async () => {
      const session = createSessionMock(false);
      authorization.ensureAuthorized.mockRejectedValueOnce(new Error('execute denied'));
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        operation: 'execute',
        actionTypeId: '.webhook',
      });
      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledTimes(1);
    });

    it('retries a telemetry manifest after the sandbox reports an unsuccessful write', async () => {
      const session = createSessionMock(false);
      const callContext = createCallContext(['elasticsearch-telemetry']);
      mockWriteElasticManifest.mockImplementation(
        jest.requireActual<typeof import('./elastic_manifest')>('./elastic_manifest')
          .writeElasticManifest
      );
      jest.mocked(session.writeFiles).mockResolvedValueOnce([{ bytes_written: 0, success: false }]);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      expect(session.writeFiles).toHaveBeenCalledTimes(2);
      expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
    });
  });
});
