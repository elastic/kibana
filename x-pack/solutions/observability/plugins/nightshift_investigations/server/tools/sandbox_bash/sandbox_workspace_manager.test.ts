/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import type { SandboxCallContext } from './tool_utils';
import { createSandboxWorkspaceManager } from './sandbox_workspace_manager';
import { REQUEST_SCOPED_CONNECTOR, REQUEST_SCOPED_CONNECTOR_ID } from './request_scoped_connector';

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

  describe('request-scoped Elasticsearch connector', () => {
    const ES_URL = 'https://es.example.com';
    const API_KEY = Buffer.from('key-id:task-manager-secret').toString('base64');
    let managerWithTelemetry: ReturnType<typeof createSandboxWorkspaceManager>;

    const createTelemetryCallContext = (
      allowedConnectorIds: readonly string[] = [REQUEST_SCOPED_CONNECTOR_ID],
      authorization = `ApiKey ${API_KEY}`
    ): SandboxCallContext => ({
      request: httpServerMock.createFakeKibanaRequest({
        headers: authorization ? { authorization } : {},
      }),
      allowedConnectorIds,
    });

    const CLEARED_HINTS = [
      {
        path: '/workspace/elastic.md',
        content: Buffer.from('No telemetry connector is available.\n'),
      },
    ];

    beforeEach(() => {
      managerWithTelemetry = createSandboxWorkspaceManager({
        getDeps: () => ({ elasticsearchUrl: ES_URL }),
        logger,
      });
    });

    it('lists the connector and writes the elastic manifest when the run has an API key', async () => {
      const session = createSessionMock(true);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(),
      });

      expect(mockWriteConnectorManifest).toHaveBeenCalledWith(
        expect.objectContaining({ virtualConnectors: [REQUEST_SCOPED_CONNECTOR] })
      );
      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({ connectorId: REQUEST_SCOPED_CONNECTOR_ID, session })
      );
    });

    it('never writes the API key into the workspace', async () => {
      const session = createSessionMock(true);
      mockWriteElasticManifest.mockImplementationOnce(
        jest.requireActual<typeof import('./elastic_manifest')>('./elastic_manifest')
          .writeElasticManifest
      );
      mockWriteConnectorManifest.mockImplementationOnce(
        jest.requireActual<typeof import('./connector_manifest')>('./connector_manifest')
          .writeConnectorManifest
      );

      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(),
      });

      const written = jest
        .mocked(session.writeFiles)
        .mock.calls.flatMap(([files]) => files.map(({ content }) => content.toString('utf8')));
      expect(written.join('\n')).toContain(REQUEST_SCOPED_CONNECTOR_ID);
      expect(written.join('\n')).not.toContain(API_KEY);
      expect(written.join('\n')).not.toContain('task-manager-secret');
    });

    it('passes the configured readable indices to the telemetry manifest', async () => {
      const session = createSessionMock(false);
      const configuredManager = createSandboxWorkspaceManager({
        getDeps: () => ({ elasticsearchUrl: ES_URL }),
        telemetryReadableIndices: 'Read remote-a:logs-service-*',
        logger,
      });

      await configuredManager.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(),
      });

      expect(mockWriteElasticManifest).toHaveBeenCalledWith(
        expect.objectContaining({ readableIndices: 'Read remote-a:logs-service-*' })
      );
    });

    it('clears hints when no Elasticsearch URL is configured', async () => {
      const session = createSessionMock(true);
      await manager.ensureWorkspaceReady({ session, callContext: createTelemetryCallContext() });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(mockWriteConnectorManifest).toHaveBeenCalledWith(
        expect.objectContaining({ virtualConnectors: [] })
      );
      expect(session.writeFiles).toHaveBeenCalledWith(CLEARED_HINTS);
    });

    it.each([
      ['a UIAM key', 'ApiKey essu_internal_key'],
      ['no API key', ''],
    ])('does not offer the connector to a run carrying %s', async (_, authorization) => {
      const session = createSessionMock(false);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(undefined, authorization),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith(CLEARED_HINTS);
    });

    it('does not seed hints for agents without the connector on their allow-list', async () => {
      const session = createSessionMock(false);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(['other']),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith(CLEARED_HINTS);
    });

    it('clears previously seeded hints when the agent allow-list changes', async () => {
      const session = createSessionMock(false);
      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext(),
      });
      mockWriteElasticManifest.mockClear();

      await managerWithTelemetry.ensureWorkspaceReady({
        session,
        callContext: createTelemetryCallContext([]),
      });

      expect(mockWriteElasticManifest).not.toHaveBeenCalled();
      expect(session.writeFiles).toHaveBeenCalledWith(CLEARED_HINTS);
    });

    it('swallows elastic manifest write failures (best-effort)', async () => {
      mockWriteElasticManifest.mockRejectedValueOnce(new Error('gRPC timeout'));
      const session = createSessionMock(true);

      await expect(
        managerWithTelemetry.ensureWorkspaceReady({
          session,
          callContext: createTelemetryCallContext(),
        })
      ).resolves.toBeUndefined();

      expect(loggingSystemMock.collect(logger).warn).toHaveLength(1);
    });

    it('retries the telemetry manifest after a failed refresh on an initialized session', async () => {
      const { session, setIsReset } = createMutableSessionMock();
      const callContext = createTelemetryCallContext();
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });

      setIsReset(true);
      mockWriteElasticManifest.mockRejectedValueOnce(new Error('write failed'));
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });
      mockWriteElasticManifest.mockClear();

      setIsReset(false);
      await managerWithTelemetry.ensureWorkspaceReady({ session, callContext });

      expect(mockWriteElasticManifest).toHaveBeenCalledTimes(1);
    });

    it('blocks workspace access and retries if clearing unauthorized hints fails', async () => {
      const session = createSessionMock(false);
      const callContext = createTelemetryCallContext([]);
      jest.mocked(session.writeFiles).mockResolvedValueOnce([{ bytes_written: 0, success: false }]);

      await expect(
        managerWithTelemetry.ensureWorkspaceReady({ session, callContext })
      ).rejects.toThrow('Failed to clear');
      await expect(
        managerWithTelemetry.ensureWorkspaceReady({ session, callContext })
      ).resolves.toBeUndefined();
      expect(session.writeFiles).toHaveBeenCalledTimes(2);
    });
  });
});
