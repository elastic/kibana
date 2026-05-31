/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Integration test: full skill flow
 *
 * Covers: parse intent → resolve host → (confirm step) → execute → poll result
 *
 * External boundaries mocked:
 *   - Fleet/endpoint metadata API  (KibanaServices.get().http.get)
 *   - Response Actions isolate API (KibanaServices.get().http.post)
 *   - Response Actions poll API    (KibanaServices.get().http.get)
 *   - Dynamic imports used by action_client.ts
 */

import { parseIntent } from '../intent_parser';
import { resolveHost } from '../host_resolver';
import { executeAction, pollActionStatus } from '../action_client';
import {
  HOST_METADATA_LIST_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  UNISOLATE_HOST_ROUTE_V2,
} from '../../../../../common/endpoint/constants';

// ---------------------------------------------------------------------------
// Mock KibanaServices so that http calls are interceptable
// ---------------------------------------------------------------------------
jest.mock('../../../../common/lib/kibana');

// action_client.ts dynamically imports resolve_path_variables and ACTION_DETAILS_ROUTE.
// We stub both so the import() calls resolve synchronously inside tests.
jest.mock('../../../../common/utils/resolve_path_variables', () => ({
  resolvePathVariables: (path: string, vars: Record<string, string>) =>
    Object.keys(vars).reduce((acc, k) => acc.replace(`{${k}}`, vars[k]), path),
}));

// ---------------------------------------------------------------------------
// Import the mocked KibanaServices after jest.mock declarations
// ---------------------------------------------------------------------------
import { KibanaServices } from '../../../../common/lib/kibana';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const AGENT_ID = 'agent-uuid-001';
const HOSTNAME = 'WIN-PROD-042';
const ACTION_ID = 'action-abc-001';

/** Minimal MetadataListResponse fixture for a single non-isolated host. */
const makeMetadataResponse = (hostname: string, agentId: string, isIsolated = false) => ({
  data: [
    {
      metadata: {
        host: { hostname },
        agent: { id: agentId },
        Endpoint: { state: { isolation: isIsolated } },
      },
    },
  ],
  total: 1,
  page: 0,
  pageSize: 10,
});

/** Minimal ResponseActionApiResponse fixture. */
const makeResponseActionResponse = (actionId: string) => ({
  data: { id: actionId },
});

/** Minimal action-details response for a given status. */
const makeActionDetailsResponse = (
  actionId: string,
  status: 'pending' | 'completed' | 'failed',
  error?: string
) => ({
  data: {
    id: actionId,
    status,
    ...(error ? { error } : {}),
    hosts: [
      {
        id: AGENT_ID,
        status,
        ...(error ? { error } : {}),
      },
    ],
  },
});

// ---------------------------------------------------------------------------
// Helper: extract the mocked http object from KibanaServices
// ---------------------------------------------------------------------------
const getMockHttp = () => (KibanaServices.get as jest.Mock)().http as jest.Mocked<{
  get: jest.Mock;
  post: jest.Mock;
}>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Endpoint Response Actions — integration (mocked APIs)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Step 1: intent parsing (pure, no mocks needed)
  // -------------------------------------------------------------------------
  describe('step 1 — parse intent', () => {
    it('parses "Isolate WIN-PROD-042" into an isolate intent', () => {
      const intent = parseIntent('Isolate WIN-PROD-042');
      expect(intent).not.toBeNull();
      expect(intent!.type).toBe('isolate');
      expect(intent!.hostName).toBe(HOSTNAME);
    });

    it('parses "Un-isolate WIN-PROD-042" via release synonym', () => {
      const intent = parseIntent('Release WIN-PROD-042');
      expect(intent).not.toBeNull();
      expect(intent!.type).toBe('unisolate');
      expect(intent!.hostName).toBe(HOSTNAME);
    });

    it('returns null for an unrelated message', () => {
      expect(parseIntent('Show me all alerts')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Step 2: resolve host via Fleet API
  // -------------------------------------------------------------------------
  describe('step 2 — resolve host', () => {
    it('resolves an exact hostname to a HostRef', async () => {
      getMockHttp().get.mockResolvedValueOnce(makeMetadataResponse(HOSTNAME, AGENT_ID));

      const results = await resolveHost({ searchString: HOSTNAME });

      expect(getMockHttp().get).toHaveBeenCalledWith(
        HOST_METADATA_LIST_ROUTE,
        expect.objectContaining({
          version: '2023-10-31',
          query: expect.objectContaining({ kuery: expect.stringContaining(HOSTNAME) }),
        })
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        hostName: HOSTNAME,
        agentId: AGENT_ID,
        isIsolated: false,
      });
    });

    it('returns empty array when no hosts match', async () => {
      getMockHttp().get.mockResolvedValueOnce({ data: [], total: 0, page: 0, pageSize: 10 });

      const results = await resolveHost({ searchString: 'UNKNOWN-HOST' });
      expect(results).toHaveLength(0);
    });

    it('returns empty array for blank search string without calling the API', async () => {
      const results = await resolveHost({ searchString: '   ' });
      expect(results).toHaveLength(0);
      expect(getMockHttp().get).not.toHaveBeenCalled();
    });

    it('surfaces already-isolated flag when host is isolated', async () => {
      getMockHttp().get.mockResolvedValueOnce(makeMetadataResponse(HOSTNAME, AGENT_ID, true));

      const results = await resolveHost({ searchString: HOSTNAME });
      expect(results[0].isIsolated).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Step 3: confirmation step (rendered by ConfirmationCard — pure UI, not
  //   exercised here; covered by confirmation_renderer.test.tsx).
  //   We model the confirmation as a boolean gate in the flow.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Step 4: execute action
  // -------------------------------------------------------------------------
  describe('step 4 — execute action', () => {
    it('posts to the isolate route and returns the action ID', async () => {
      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID));

      const result = await executeAction('isolate', AGENT_ID);

      expect(getMockHttp().post).toHaveBeenCalledWith(
        ISOLATE_HOST_ROUTE_V2,
        expect.objectContaining({
          version: '2023-10-31',
          body: expect.stringContaining(AGENT_ID),
        })
      );
      expect(result).toEqual({ actionId: ACTION_ID });
    });

    it('posts to the unisolate route for a unisolate action', async () => {
      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID));

      await executeAction('unisolate', AGENT_ID);

      expect(getMockHttp().post).toHaveBeenCalledWith(
        UNISOLATE_HOST_ROUTE_V2,
        expect.objectContaining({ version: '2023-10-31' })
      );
    });

    it('includes the agent_type field in the request body', async () => {
      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID));

      await executeAction('isolate', AGENT_ID);

      const { body } = getMockHttp().post.mock.calls[0][1];
      const parsed = JSON.parse(body);
      expect(parsed.agent_type).toBe('endpoint');
      expect(parsed.endpoint_ids).toContain(AGENT_ID);
    });
  });

  // -------------------------------------------------------------------------
  // Step 5: poll result
  // -------------------------------------------------------------------------
  describe('step 5 — poll result', () => {
    it('returns pending status on first poll', async () => {
      getMockHttp().get.mockResolvedValueOnce(
        makeActionDetailsResponse(ACTION_ID, 'pending')
      );

      const result = await pollActionStatus(ACTION_ID);

      expect(result.actionId).toBe(ACTION_ID);
      expect(result.status).toBe('pending');
      expect(result.errorMessage).toBeUndefined();
    });

    it('returns completed status when the action finishes', async () => {
      getMockHttp().get.mockResolvedValueOnce(
        makeActionDetailsResponse(ACTION_ID, 'completed')
      );

      const result = await pollActionStatus(ACTION_ID);
      expect(result.status).toBe('completed');
    });

    it('returns failed status and error message when the action fails', async () => {
      getMockHttp().get.mockResolvedValueOnce(
        makeActionDetailsResponse(ACTION_ID, 'failed', 'Agent unreachable')
      );

      const result = await pollActionStatus(ACTION_ID);
      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Agent unreachable');
    });

    it('polls the correct action-details URL', async () => {
      getMockHttp().get.mockResolvedValueOnce(
        makeActionDetailsResponse(ACTION_ID, 'completed')
      );

      await pollActionStatus(ACTION_ID);

      const calledUrl: string = getMockHttp().get.mock.calls[0][0];
      expect(calledUrl).toContain(ACTION_ID);
      // Should NOT contain the raw path template variable
      expect(calledUrl).not.toContain('{action_id}');
    });
  });

  // -------------------------------------------------------------------------
  // Full end-to-end flow: parse → resolve → (confirm=true) → execute → poll
  // -------------------------------------------------------------------------
  describe('full flow — isolate', () => {
    it('completes the isolate flow end-to-end', async () => {
      // Arrange
      getMockHttp().get
        .mockResolvedValueOnce(makeMetadataResponse(HOSTNAME, AGENT_ID)) // resolve host
        .mockResolvedValueOnce(makeActionDetailsResponse(ACTION_ID, 'completed')); // poll

      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID)); // execute

      // 1. Parse
      const intent = parseIntent(`Isolate ${HOSTNAME}`);
      expect(intent).not.toBeNull();
      expect(intent!.type).toBe('isolate');

      // 2. Resolve
      const hosts = await resolveHost({ searchString: intent!.hostName });
      expect(hosts).toHaveLength(1);
      const host = hosts[0];
      expect(host.hostName).toBe(HOSTNAME);
      expect(host.agentId).toBe(AGENT_ID);

      // 3. Confirm (simulated: analyst confirms — no API call, pure UI gate)
      const confirmed = true;
      expect(confirmed).toBe(true);

      // 4. Execute
      const { actionId } = await executeAction(intent!.type, host.agentId);
      expect(actionId).toBe(ACTION_ID);

      // 5. Poll
      const pollResult = await pollActionStatus(actionId);
      expect(pollResult.status).toBe('completed');
      expect(pollResult.actionId).toBe(ACTION_ID);
    });
  });

  describe('full flow — unisolate', () => {
    it('completes the unisolate flow end-to-end', async () => {
      // Arrange: host is currently isolated
      getMockHttp().get
        .mockResolvedValueOnce(makeMetadataResponse(HOSTNAME, AGENT_ID, true)) // resolve host
        .mockResolvedValueOnce(makeActionDetailsResponse(ACTION_ID, 'completed')); // poll

      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID)); // execute

      // 1. Parse
      const intent = parseIntent(`Unisolate ${HOSTNAME}`);
      expect(intent).not.toBeNull();
      expect(intent!.type).toBe('unisolate');

      // 2. Resolve
      const hosts = await resolveHost({ searchString: intent!.hostName });
      expect(hosts[0].isIsolated).toBe(true);

      // 3. Confirm (simulated)
      const confirmed = true;
      expect(confirmed).toBe(true);

      // 4. Execute
      const { actionId } = await executeAction(intent!.type, hosts[0].agentId);

      // Verify unisolate route used
      expect(getMockHttp().post).toHaveBeenCalledWith(
        UNISOLATE_HOST_ROUTE_V2,
        expect.objectContaining({ version: '2023-10-31' })
      );

      // 5. Poll
      const pollResult = await pollActionStatus(actionId);
      expect(pollResult.status).toBe('completed');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('host not found: resolve returns empty array', async () => {
      getMockHttp().get.mockResolvedValueOnce({ data: [], total: 0, page: 0, pageSize: 10 });

      const intent = parseIntent('Isolate GHOST-HOST');
      expect(intent).not.toBeNull();

      const hosts = await resolveHost({ searchString: intent!.hostName });
      // Consumer must check length before proceeding
      expect(hosts).toHaveLength(0);
    });

    it('already isolated: flow still executes (business logic check is consumer responsibility)', async () => {
      getMockHttp().get.mockResolvedValueOnce(makeMetadataResponse(HOSTNAME, AGENT_ID, true));

      const hosts = await resolveHost({ searchString: HOSTNAME });
      expect(hosts[0].isIsolated).toBe(true);
      // The resolver surfaces the flag; the skill layer decides to surface
      // "already isolated" message instead of proceeding to execute.
    });

    it('action failure propagates error message via poll', async () => {
      getMockHttp().post.mockResolvedValueOnce(makeResponseActionResponse(ACTION_ID));
      getMockHttp().get.mockResolvedValueOnce(
        makeActionDetailsResponse(ACTION_ID, 'failed', 'Agent unreachable: timeout')
      );

      const { actionId } = await executeAction('isolate', AGENT_ID);
      const pollResult = await pollActionStatus(actionId);

      expect(pollResult.status).toBe('failed');
      expect(pollResult.errorMessage).toBe('Agent unreachable: timeout');
    });

    it('multiple hosts returned triggers ambiguity (caller must disambiguate)', async () => {
      getMockHttp().get.mockResolvedValueOnce({
        data: [
          {
            metadata: {
              host: { hostname: 'WIN-PROD-042-A' },
              agent: { id: 'agent-A' },
              Endpoint: { state: { isolation: false } },
            },
          },
          {
            metadata: {
              host: { hostname: 'WIN-PROD-042-B' },
              agent: { id: 'agent-B' },
              Endpoint: { state: { isolation: false } },
            },
          },
        ],
        total: 2,
        page: 0,
        pageSize: 10,
      });

      const hosts = await resolveHost({ searchString: 'WIN-PROD-042' });
      // Caller receives multiple results and must prompt for clarification
      expect(hosts).toHaveLength(2);
    });
  });
});
