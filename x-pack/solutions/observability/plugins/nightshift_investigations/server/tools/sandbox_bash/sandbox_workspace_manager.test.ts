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
    statFiles: jest.fn(),
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
    statFiles: jest.fn(),
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

    it('writes elastic manifest alongside connector manifest on reset', async () => {
      const session = createSessionMock(true);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });

      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: 'elasticsearch-telemetry', session })
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

    it('does not write elastic manifest when telemetryConnectorId is not set', async () => {
      const session = createSessionMock(true);
      await manager.ensureWorkspaceReady({
        session,
        callContext: createCallContext(['elasticsearch-telemetry']),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
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
          path: '/workspace/elastic.md',
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
          path: '/workspace/elastic.md',
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
