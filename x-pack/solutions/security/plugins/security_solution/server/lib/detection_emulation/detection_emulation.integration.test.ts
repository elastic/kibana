/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { ResponseActionAgentType } from '../../../common/endpoint/service/response_actions/constants';
import {
  tagAlertsWithEmulation,
  buildEmulationAlertQuery,

  ALERT_EMULATION_ID,
} from './alert_tagging';
import { buildEmulationComment } from './execution/audit_logger';
import {
  EmulationAllowlist,
  createTestAllowlistConfig,
  createRestrictiveAllowlistConfig,
} from './execution/allowlist';
import { EmulationRateLimiter, createDefaultRateLimiterConfig } from './execution/rate_limiter';
import { EmulationRunner } from './execution/runner';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';
import { endpointActionClientMock } from '../../endpoint/services/actions/clients/endpoint/mocks';
import { sentinelOneMock } from '../../endpoint/services/actions/clients/sentinelone/mocks';
import { CrowdstrikeMock } from '../../endpoint/services/actions/clients/crowdstrike/mocks';
import { microsoftDefenderMock } from '../../endpoint/services/actions/clients/microsoft/defender/endpoint/mocks';
import { getActionDetailsById as _getActionDetailsById } from '../../endpoint/services/actions/action_details_by_id';

jest.mock('../../endpoint/services/actions/action_details_by_id');

const mockGetActionDetailsById = _getActionDetailsById as jest.Mock;

const TEST_ALERTS_INDEX = 'test-security-alerts';

// ─── Alert tagging tests (mocked ES client) ───────────────────────────────────

describe('detection_emulation — alert tagging', () => {
  let mockUpdateByQuery: jest.Mock;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    mockUpdateByQuery = jest.fn().mockResolvedValue({ updated: 0, failures: [] });
    esClient = { updateByQuery: mockUpdateByQuery } as unknown as ElasticsearchClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('writes kibana.alert.emulation.id and kibana.alert.emulation.mode to targeted alerts', async () => {
    mockUpdateByQuery.mockResolvedValue({ updated: 2, failures: [] });
    const logger = loggingSystemMock.createLogger();

    const updated = await tagAlertsWithEmulation({
      esClient,
      alertIds: ['alert-1', 'alert-2'],
      metadata: { emulationId: 'emulation-abc', mode: 'test' },
      alertsIndex: TEST_ALERTS_INDEX,
      logger,
    });

    expect(updated).toBe(2);
    // The ES v8 client expects `query` / `script` at the top level — not nested
    // under a legacy `body:` wrapper.
    expect(mockUpdateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['alert-1', 'alert-2'] } },
        script: expect.objectContaining({
          params: { emulationId: 'emulation-abc', mode: 'test' },
        }),
      })
    );
  });

  it('does not tag alerts that were not in the alertIds list', async () => {
    mockUpdateByQuery.mockResolvedValue({ updated: 1, failures: [] });
    const logger = loggingSystemMock.createLogger();

    await tagAlertsWithEmulation({
      esClient,
      alertIds: ['alert-a'],
      metadata: { emulationId: 'emulation-x', mode: 'validation' },
      alertsIndex: TEST_ALERTS_INDEX,
      logger,
    });

    // updateByQuery is called only with the specified IDs — other alerts are not in the query.
    expect(mockUpdateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: ['alert-a'] } },
      })
    );
    expect(mockUpdateByQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({
        query: { ids: { values: expect.arrayContaining(['alert-b', 'alert-c']) } },
      })
    );
  });

  it('isolates alerts from different emulation runs by emulationId', async () => {
    mockUpdateByQuery.mockResolvedValue({ updated: 1, failures: [] });
    const logger = loggingSystemMock.createLogger();

    await tagAlertsWithEmulation({
      esClient,
      alertIds: ['run1-alert'],
      metadata: { emulationId: 'run-1', mode: 'test' },
      alertsIndex: TEST_ALERTS_INDEX,
      logger,
    });
    await tagAlertsWithEmulation({
      esClient,
      alertIds: ['run2-alert'],
      metadata: { emulationId: 'run-2', mode: 'production' },
      alertsIndex: TEST_ALERTS_INDEX,
      logger,
    });

    // Each call carries its own IDs and emulationId — no cross-contamination.
    expect(mockUpdateByQuery).toHaveBeenCalledTimes(2);
    expect(mockUpdateByQuery).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        query: { ids: { values: ['run1-alert'] } },
        script: expect.objectContaining({ params: { emulationId: 'run-1', mode: 'test' } }),
      })
    );
    expect(mockUpdateByQuery).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: { ids: { values: ['run2-alert'] } },
        script: expect.objectContaining({
          params: { emulationId: 'run-2', mode: 'production' },
        }),
      })
    );
  });

  it('buildEmulationAlertQuery produces correct term filters', () => {
    expect(buildEmulationAlertQuery('emu-abc')).toEqual({
      term: { [ALERT_EMULATION_ID]: 'emu-abc' },
    });
  });

  it('returns 0 and skips the ES call when alertIds is empty', async () => {
    const logger = loggingSystemMock.createLogger();

    const updated = await tagAlertsWithEmulation({
      esClient,
      alertIds: [],
      metadata: { emulationId: 'emu-empty', mode: 'test' },
      alertsIndex: TEST_ALERTS_INDEX,
      logger,
    });

    expect(updated).toBe(0);
    expect(mockUpdateByQuery).not.toHaveBeenCalled();
  });


});

// ─── Audit comment helper (pure function, no ES needed) ──────────────────────

describe('detection_emulation — audit comment', () => {
  it('buildEmulationComment embeds emulationId and command', () => {
    const comment = buildEmulationComment('emu-001', 'execute');
    expect(comment).toContain('emu-001');
    expect(comment).toContain('execute');
  });

  it('buildEmulationComment appends userComment when provided', () => {
    const comment = buildEmulationComment('emu-001', 'kill-process', 'analyst note');
    expect(comment).toContain('analyst note');
  });

  it('comment format is stable (prefix: Detection Emulation [<id>]:)', () => {
    expect(buildEmulationComment('abc-123', 'isolate')).toBe(
      'Detection Emulation [abc-123]: isolate'
    );
  });
});

// ─── Guard chain integration: allowlist + rate limiter ───────────────────────

describe('detection_emulation — guard chain (allowlist + rate limiter)', () => {
  const makeLogger = () => loggingSystemMock.createLogger();

  it('allows a command when both allowlist and rate limiter pass', () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['endpoint-1']),
      makeLogger()
    );
    const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), makeLogger());

    const allowlistResult = allowlist.validate(['endpoint-1']);
    expect(allowlistResult.allowed).toBe(true);

    const rateResult = rateLimiter.acquire('space-1', 'emu-1', 'execute');
    expect(rateResult.allowed).toBe(true);
    expect(rateResult.token).toBeDefined();
  });

  it('blocks at the allowlist before consulting the rate limiter', () => {
    const allowlist = new EmulationAllowlist(
      createRestrictiveAllowlistConfig(['endpoint-allowed']),
      makeLogger()
    );
    const rateLimiter = new EmulationRateLimiter(createDefaultRateLimiterConfig(), makeLogger());

    const allowlistResult = allowlist.validate(['endpoint-not-in-list']);
    expect(allowlistResult.allowed).toBe(false);
    expect(allowlistResult.blockedEndpoints).toEqual(['endpoint-not-in-list']);

    // Rate limiter is not consulted — count stays 0.
    expect(rateLimiter.getCurrentCount('space-1')).toBe(0);
  });

  it('blocks when the rate limit is exceeded even though all endpoints are allowed', () => {
    // Test fixture: the allowlist isn't the focus of this assertion;
    // we want it permissive so the rate-limit gate is reached. Using
    // the explicitly-named test config keeps the intent obvious and
    // avoids regressing if `createDefaultAllowlistConfig` flips again.
    const allowlist = new EmulationAllowlist(createTestAllowlistConfig(), makeLogger());
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 2, windowMs: 60_000, disabled: false },
      makeLogger()
    );

    // Exhaust the rate limit via two successful acquires.
    expect(rateLimiter.acquire('space-1', 'emu-A', 'execute').allowed).toBe(true);
    expect(rateLimiter.acquire('space-1', 'emu-A', 'kill-process').allowed).toBe(true);

    const allowlistResult = allowlist.validate(['endpoint-1']);
    expect(allowlistResult.allowed).toBe(true);

    const rateResult = rateLimiter.acquire('space-1', 'emu-A', 'isolate');
    expect(rateResult.allowed).toBe(false);
    expect(rateResult.currentCount).toBe(2);
    expect(rateResult.maxCommands).toBe(2);
  });

  it('rate limiter state is isolated per space', () => {
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 1, windowMs: 60_000, disabled: false },
      makeLogger()
    );

    expect(rateLimiter.acquire('space-A', 'emu-1', 'execute').allowed).toBe(true);

    // space-A is now at the limit.
    expect(rateLimiter.acquire('space-A', 'emu-1', 'execute').allowed).toBe(false);
    // space-B is unaffected.
    expect(rateLimiter.acquire('space-B', 'emu-1', 'execute').allowed).toBe(true);
  });

  it('release() rolls back a successful acquire so the slot can be reused', () => {
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 1, windowMs: 60_000, disabled: false },
      makeLogger()
    );

    const first = rateLimiter.acquire('space-1', 'emu-1', 'isolate');
    expect(first.allowed).toBe(true);
    // Limit hit.
    expect(rateLimiter.acquire('space-1', 'emu-1', 'isolate').allowed).toBe(false);
    // Roll back; subsequent acquire should succeed.
    rateLimiter.release(first.token);
    expect(rateLimiter.acquire('space-1', 'emu-1', 'isolate').allowed).toBe(true);
  });

  it('a command passing all guards leaves rate limiter count incremented', () => {
    // Test fixture (see comment on the previous test) — using
    // `createTestAllowlistConfig` makes "allowlist is permissive on
    // purpose" obvious without leaning on the production default.
    const allowlist = new EmulationAllowlist(createTestAllowlistConfig(), makeLogger());
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 10, windowMs: 60_000, disabled: false },
      makeLogger()
    );
    const spaceId = 'space-1';

    // Simulate the route handler gate sequence.
    expect(allowlist.validate(['ep-1']).allowed).toBe(true);
    const rateResult = rateLimiter.acquire(spaceId, 'emu-1', 'scan');
    expect(rateResult.allowed).toBe(true);

    expect(rateLimiter.getCurrentCount(spaceId)).toBe(1);
  });

  it('disabled rate limiter always allows regardless of how many commands fired', () => {
    const rateLimiter = new EmulationRateLimiter(
      { maxCommands: 1, windowMs: 60_000, disabled: true },
      makeLogger()
    );

    expect(rateLimiter.acquire('space-1', 'emu-1', 'execute').allowed).toBe(true);
    expect(rateLimiter.acquire('space-1', 'emu-1', 'execute').allowed).toBe(true);
    expect(rateLimiter.acquire('space-1', 'emu-1', 'execute').allowed).toBe(true);
  });
});

// ─── EmulationRunner happy path: endpoint agent type ─────────────────────────

describe('detection_emulation — EmulationRunner happy path (endpoint agent type)', () => {
  const MOCK_ACTION_ID = 'action-id-from-mock';

  beforeEach(() => {
    mockGetActionDetailsById.mockResolvedValue({
      id: MOCK_ACTION_ID,
      agents: ['1-2-3'],
      hosts: { '1-2-3': { name: 'test-host' } },
      command: 'execute',
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      agentState: {},
      status: 'pending',
      createdBy: 'foo',
      agentType: 'endpoint',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches an execute command for endpoint agent type and returns dispatched status', async () => {
    const constructorOptions = endpointActionClientMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    (
      constructorOptions.endpointService.getInternalFleetServices()
        .ensureInCurrentSpace as jest.Mock
    ).mockResolvedValue(undefined);

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-endpoint-happy-001',
      agentType: 'endpoint',
      endpointIds: ['1-2-3'],
      command: 'execute',
      parameters: { command: 'ls -ltr' },
    });

    expect(result.status).toBe('dispatched');
    expect(result.agentType).toBe('endpoint');
    expect(result.command).toBe('execute');
    expect(result.actionId).toBe(MOCK_ACTION_ID);
    expect(result.error).toBeUndefined();
  });

  it('returns error status when the endpoint client rejects', async () => {
    const constructorOptions = endpointActionClientMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    (
      constructorOptions.endpointService.getInternalFleetServices()
        .ensureInCurrentSpace as jest.Mock
    ).mockRejectedValue(new Error('fleet unavailable'));

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-endpoint-error-001',
      agentType: 'endpoint',
      endpointIds: ['1-2-3'],
      command: 'execute',
      parameters: { command: 'ls -ltr' },
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('fleet unavailable');
    expect(result.actionId).toBe('');
  });

  it('throws for an unsupported agentType', async () => {
    const constructorOptions = endpointActionClientMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      username: constructorOptions.username,
      logger,
    });

    await expect(
      runner.run({
        emulationId: 'emu-bad-agent',
        agentType: 'unknown-agent' as ResponseActionAgentType,
        endpointIds: ['1-2-3'],
        command: 'isolate',
      })
    ).rejects.toThrow('is not supported');
  });
});

// ─── EmulationRunner happy path: sentinel_one agent type ─────────────────────

describe('detection_emulation — EmulationRunner happy path (sentinel_one agent type)', () => {
  const MOCK_ACTION_ID = 'action-id-from-mock';

  beforeEach(() => {
    mockGetActionDetailsById.mockResolvedValue({
      id: MOCK_ACTION_ID,
      agents: ['1-2-3'],
      hosts: { '1-2-3': { name: 'sentinelone-1460' } },
      command: 'isolate',
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      agentState: {},
      status: 'pending',
      createdBy: 'foo',
      agentType: 'sentinel_one',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches an isolate command for sentinel_one agent type and returns dispatched status', async () => {
    const constructorOptions = sentinelOneMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-s1-happy-001',
      agentType: 'sentinel_one',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('dispatched');
    expect(result.agentType).toBe('sentinel_one');
    expect(result.command).toBe('isolate');
    expect(result.actionId).toBe(MOCK_ACTION_ID);
    expect(result.error).toBeUndefined();
  });

  it('returns error status when the sentinel_one connector rejects', async () => {
    const constructorOptions = sentinelOneMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    (constructorOptions.connectorActions.execute as jest.Mock).mockRejectedValue(
      new Error('connector unavailable')
    );

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-s1-error-001',
      agentType: 'sentinel_one',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('connector unavailable');
    expect(result.actionId).toBe('');
  });

  it('returns error status when no sentinel_one connector is configured in the space', async () => {
    const constructorOptions = sentinelOneMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    // Simulate a space with no sentinel_one connector by returning an empty connector list.
    // NormalizedExternalConnectorClient.getConnectorInstance() throws
    // ResponseActionsConnectorNotConfiguredError when getAll() yields no matching connector.
    const emptyConnectorActionsClient = sentinelOneMock.createConnectorActionsClient();
    (emptyConnectorActionsClient.getAll as jest.Mock).mockResolvedValue([]);

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: sentinelOneMock.createNormalizedExternalConnectorClient(
        emptyConnectorActionsClient
      ),
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-s1-no-connector-001',
      agentType: 'sentinel_one',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('No stack connector instance configured');
    expect(result.actionId).toBe('');
  });
});

// ─── EmulationRunner happy path: crowdstrike agent type ──────────────────────

describe('detection_emulation — EmulationRunner happy path (crowdstrike agent type)', () => {
  const MOCK_ACTION_ID = 'action-id-from-mock';

  beforeEach(() => {
    mockGetActionDetailsById.mockResolvedValue({
      id: MOCK_ACTION_ID,
      agents: ['1-2-3'],
      hosts: { '1-2-3': { name: 'Crowdstrike-1460' } },
      command: 'isolate',
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      agentState: {},
      status: 'pending',
      createdBy: 'foo',
      agentType: 'crowdstrike',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches an isolate command for crowdstrike agent type and returns dispatched status', async () => {
    const constructorOptions = CrowdstrikeMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    // CrowdstrikeActionsClient.writeActionRequestToEndpointIndex calls getHostNameByAgentId,
    // which searches on the raw 'logs-crowdstrike*' pattern (not the namespaced pattern).
    // We need to intercept that search and return a response with a host name, otherwise
    // the client throws "Host name not found in the event document".
    const priorSearchImpl = constructorOptions.esClient.search.getMockImplementation();
    constructorOptions.esClient.search.mockImplementation(async (...args) => {
      const options = args[0];
      if (options?.index?.[0] === 'logs-crowdstrike*') {
        return CrowdstrikeMock.createEventSearchResponse();
      }
      if (priorSearchImpl) {
        return priorSearchImpl(...args);
      }
      return BaseDataGenerator.toEsSearchResponse([]);
    });

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-cs-happy-001',
      agentType: 'crowdstrike',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('dispatched');
    expect(result.agentType).toBe('crowdstrike');
    expect(result.command).toBe('isolate');
    expect(result.actionId).toBe(MOCK_ACTION_ID);
    expect(result.error).toBeUndefined();
  });

  it('returns error status when the crowdstrike connector rejects', async () => {
    const constructorOptions = CrowdstrikeMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    (constructorOptions.connectorActions.execute as jest.Mock).mockRejectedValue(
      new Error('connector unavailable')
    );

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-cs-error-001',
      agentType: 'crowdstrike',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('connector unavailable');
    expect(result.actionId).toBe('');
  });
});

// ─── EmulationRunner happy path: microsoft_defender_endpoint agent type ───────

describe('detection_emulation — EmulationRunner happy path (microsoft_defender_endpoint agent type)', () => {
  const MOCK_ACTION_ID = 'action-id-from-mock';

  beforeEach(() => {
    mockGetActionDetailsById.mockResolvedValue({
      id: MOCK_ACTION_ID,
      agents: ['1-2-3'],
      hosts: { '1-2-3': { name: 'mymachine1.contoso.com' } },
      command: 'isolate',
      isExpired: false,
      isCompleted: false,
      wasSuccessful: false,
      errors: undefined,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      agentState: {},
      status: 'pending',
      createdBy: 'foo',
      agentType: 'microsoft_defender_endpoint',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches an isolate command for microsoft_defender_endpoint agent type and returns dispatched status', async () => {
    const constructorOptions = microsoftDefenderMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-mde-happy-001',
      agentType: 'microsoft_defender_endpoint',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('dispatched');
    expect(result.agentType).toBe('microsoft_defender_endpoint');
    expect(result.command).toBe('isolate');
    expect(result.actionId).toBe(MOCK_ACTION_ID);
    expect(result.error).toBeUndefined();
  });

  it('returns error status when the microsoft_defender_endpoint connector rejects', async () => {
    const constructorOptions = microsoftDefenderMock.createConstructorOptions();
    const logger = loggingSystemMock.createLogger();

    (constructorOptions.connectorActions.execute as jest.Mock).mockRejectedValue(
      new Error('connector unavailable')
    );

    const runner = new EmulationRunner({
      endpointService: constructorOptions.endpointService,
      esClient: constructorOptions.esClient as unknown as ElasticsearchClient,
      spaceId: constructorOptions.spaceId,
      casesClient: constructorOptions.casesClient,
      username: constructorOptions.username,
      connectorActions: constructorOptions.connectorActions,
      logger,
    });

    const result = await runner.run({
      emulationId: 'emu-mde-error-001',
      agentType: 'microsoft_defender_endpoint',
      endpointIds: ['1-2-3'],
      command: 'isolate',
    });

    expect(result.status).toBe('error');
    expect(result.error).toContain('connector unavailable');
    expect(result.actionId).toBe('');
  });
});
