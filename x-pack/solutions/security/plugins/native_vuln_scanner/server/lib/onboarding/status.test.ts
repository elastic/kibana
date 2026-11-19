/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { FleetUnauthorizedError } from '@kbn/fleet-plugin/server';
import {
  createMockAgentClient,
  createMockAgentPolicyService,
} from '@kbn/fleet-plugin/server/mocks';
import { INVENTORY_PACK_BODY, INVENTORY_PACK_NAME, OSQUERY_RESULTS_INDEX } from '../inventory';
import { createPolicy, OSQUERY_PINNED_YAML } from './policy_fixture.mock';
import {
  AGENT_LIST_CAP,
  collectOnboardingStatus,
  hasUsableOsqueryManager,
  isScanRunning,
  policyAgentsKuery,
} from './status';

interface Scenario {
  policies?: Array<ReturnType<typeof createPolicy>>;
  packPolicyIds?: string[];
  agents?: Array<{ id: string; policy_id: string; status: string }>;
  agentsTotal?: number;
  reportingAgentIds?: string[];
  lastScan?: Record<string, unknown> | null;
  workflow?: { enabled: boolean } | null;
  runningExecutions?: number;
  agentsError?: Error;
}

const setup = ({
  policies = [],
  packPolicyIds = [],
  agents = [],
  agentsTotal,
  reportingAgentIds = [],
  lastScan = null,
  workflow = null,
  runningExecutions = 0,
  agentsError,
}: Scenario = {}) => {
  const request = httpServerMock.createKibanaRequest();
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockResolvedValue({
    saved_objects: [
      {
        id: 'pack-1',
        type: 'osquery-pack',
        score: 1,
        attributes: {
          name: INVENTORY_PACK_NAME,
          enabled: true,
          queries: Object.values(INVENTORY_PACK_BODY.queries),
        },
        references: packPolicyIds.map((id) => ({ type: 'ingest-agent-policies', id, name: id })),
      },
    ],
    total: 1,
    per_page: 100,
    page: 1,
  });
  const packRepository = savedObjectsRepositoryMock.create();
  packRepository.find.mockResolvedValue({ saved_objects: [], total: 0, per_page: 100, page: 1 });

  // The internal user reads both the run summary and the aggregate-only osquery results.
  const esInternal = elasticsearchServiceMock.createElasticsearchClient();
  esInternal.search.mockImplementation((async (params: { index?: string }) =>
    params.index === OSQUERY_RESULTS_INDEX
      ? { aggregations: { reporting: { buckets: reportingAgentIds.map((key) => ({ key })) } } }
      : { hits: { hits: lastScan ? [{ _source: lastScan }] : [] } }) as never);

  const agentPolicyService = createMockAgentPolicyService();
  agentPolicyService.list.mockResolvedValue({
    items: policies,
    total: policies.length,
    page: 1,
    perPage: 1000,
  });
  const agentClient = createMockAgentClient();
  if (agentsError) {
    agentClient.listAgents.mockRejectedValue(agentsError);
  } else {
    agentClient.listAgents.mockResolvedValue({
      agents,
      total: agentsTotal ?? agents.length,
      page: 1,
      perPage: 5000,
    } as never);
  }
  const workflows = {
    getWorkflow: jest.fn().mockResolvedValue(workflow),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ total: runningExecutions }),
  };

  const deps = {
    request,
    soClient,
    esInternal,
    packRepository,
    agentPolicyService,
    agentClient,
    workflows,
  };
  return { deps, esInternal, soClient, agentPolicyService, agentClient, workflows };
};

const SCAN = {
  status: 'success',
  hosts_scanned: 3,
  run_id: 'r1',
  findings_open: 1,
  findings_fixed: 0,
};

describe('hasUsableOsqueryManager', () => {
  it.each([
    ['0.6.0', true],
    ['1.2.3', true],
    ['0.5.9', false],
    ['not-a-version', false],
  ])('osquery_manager %s -> %s', (osqueryVersion, expected) => {
    expect(hasUsableOsqueryManager(createPolicy({ osqueryVersion }))).toBe(expected);
  });

  it('is false without an osquery_manager package policy', () => {
    expect(hasUsableOsqueryManager(createPolicy({ osqueryVersion: null }))).toBe(false);
  });
});

describe('policyAgentsKuery', () => {
  it('quotes and escapes ids', () => {
    expect(policyAgentsKuery(['a', 'b"c'])).toBe('policy_id:("a" or "b\\"c")');
  });
});

describe('collectOnboardingStatus', () => {
  it('marks a policy not_configured until the pack is assigned and the runtime pinned', async () => {
    const { deps } = setup({
      policies: [
        createPolicy({ id: 'no-pack', agentInternal: OSQUERY_PINNED_YAML }),
        createPolicy({ id: 'no-pin' }),
      ],
      packPolicyIds: ['no-pin'],
    });
    const status = await collectOnboardingStatus(deps);
    expect(status.license).toBe('ok');
    expect(
      status.policies.map(({ id, state, packAssigned, runtimePinned }) => ({
        id,
        state,
        packAssigned,
        runtimePinned,
      }))
    ).toEqual([
      { id: 'no-pack', state: 'not_configured', packAssigned: false, runtimePinned: true },
      { id: 'no-pin', state: 'not_configured', packAssigned: true, runtimePinned: false },
    ]);
  });

  it('is pending_inventory when configured but no agent reports results yet', async () => {
    const { deps } = setup({
      policies: [createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML })],
      packPolicyIds: ['p'],
      agents: [{ id: 'a1', policy_id: 'p', status: 'online' }],
    });
    const [policy] = (await collectOnboardingStatus(deps)).policies;
    expect(policy).toMatchObject({
      state: 'pending_inventory',
      agents: { total: 1, online: 1 },
      reportingInventory: 0,
    });
  });

  it('joins reporting agents to their policy and is reporting before any scan', async () => {
    const { deps } = setup({
      policies: [
        createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML }),
        createPolicy({ id: 'q', agentInternal: OSQUERY_PINNED_YAML }),
      ],
      packPolicyIds: ['p', 'q'],
      agents: [
        { id: 'a1', policy_id: 'p', status: 'online' },
        { id: 'a2', policy_id: 'p', status: 'offline' },
        { id: 'a3', policy_id: 'q', status: 'online' },
      ],
      reportingAgentIds: ['a1', 'a2'],
    });
    const { policies } = await collectOnboardingStatus(deps);
    expect(
      policies.map(({ id, state, agents, reportingInventory }) => ({
        id,
        state,
        agents,
        reportingInventory,
      }))
    ).toEqual([
      { id: 'p', state: 'reporting', agents: { total: 2, online: 1 }, reportingInventory: 2 },
      {
        id: 'q',
        state: 'pending_inventory',
        agents: { total: 1, online: 1 },
        reportingInventory: 0,
      },
    ]);
  });

  it.each([['success'], ['partial']])(
    'is scanned after a %s scan that covered hosts',
    async (scanStatus) => {
      const { deps } = setup({
        policies: [createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML })],
        packPolicyIds: ['p'],
        agents: [{ id: 'a1', policy_id: 'p', status: 'online' }],
        reportingAgentIds: ['a1'],
        lastScan: { ...SCAN, status: scanStatus },
      });
      const status = await collectOnboardingStatus(deps);
      expect(status.policies[0].state).toBe('scanned');
      expect(status.lastScan).toMatchObject({ run_id: 'r1' });
    }
  );

  it.each([
    ['a failed scan', { ...SCAN, status: 'failed' }],
    ['a scan that covered no hosts', { ...SCAN, hosts_scanned: 0 }],
  ])('stays reporting after %s', async (_, lastScan) => {
    const { deps } = setup({
      policies: [createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML })],
      packPolicyIds: ['p'],
      agents: [{ id: 'a1', policy_id: 'p', status: 'online' }],
      reportingAgentIds: ['a1'],
      lastScan,
    });
    expect((await collectOnboardingStatus(deps)).policies[0].state).toBe('reporting');
  });

  it('lists policies without a usable osquery integration separately and does not query their agents', async () => {
    const { deps, agentClient } = setup({
      policies: [
        createPolicy({ id: 'ok' }),
        createPolicy({ id: 'none', name: 'None', osqueryVersion: null }),
        createPolicy({ id: 'old', name: 'Old', osqueryVersion: '0.5.0' }),
      ],
    });
    const status = await collectOnboardingStatus(deps);
    expect(status.policies.map(({ id }) => id)).toEqual(['ok']);
    expect(status.needsOsqueryIntegration).toEqual([
      { id: 'none', name: 'None' },
      { id: 'old', name: 'Old' },
    ]);
    expect(agentClient.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:("ok")' })
    );
  });

  it('reports the schedule and whether a scan is running', async () => {
    const installed = setup({ workflow: { enabled: false }, runningExecutions: 1 });
    expect(await collectOnboardingStatus(installed.deps)).toMatchObject({
      schedule: { installed: true, enabled: false },
      scanRunning: true,
    });
    const absent = setup({ workflow: null });
    expect(await collectOnboardingStatus(absent.deps)).toMatchObject({
      schedule: { installed: false, enabled: false },
      scanRunning: false,
    });
  });

  it('flags a truncated agent list', async () => {
    const { deps } = setup({
      policies: [createPolicy({ id: 'p' })],
      agents: [{ id: 'a1', policy_id: 'p', status: 'online' }],
      agentsTotal: AGENT_LIST_CAP + 1,
    });
    expect((await collectOnboardingStatus(deps)).agentsTruncated).toBe(true);
  });

  it('does not flag truncation when the agent total equals the cap exactly', async () => {
    const agents = Array.from({ length: AGENT_LIST_CAP }, (_, i) => ({
      id: `a${i}`,
      policy_id: 'p',
      status: 'online',
    }));
    const { deps } = setup({ policies: [createPolicy({ id: 'p' })], agents });
    const status = await collectOnboardingStatus(deps);
    expect(status.agentsTruncated).toBe(false);
    expect(status.policies[0].agents?.total).toBe(AGENT_LIST_CAP);
  });

  it('does not flag truncation when the cap is reached and later batches have no agents', async () => {
    const policies = Array.from({ length: 101 }, (_, i) => createPolicy({ id: `p${i}` }));
    const agents = Array.from({ length: AGENT_LIST_CAP }, (_, i) => ({
      id: `a${i}`,
      policy_id: 'p0',
      status: 'online',
    }));
    const { deps, agentClient } = setup({ policies });
    agentClient.listAgents
      .mockResolvedValueOnce({ agents, total: AGENT_LIST_CAP, page: 1, perPage: 5000 } as never)
      .mockResolvedValueOnce({ agents: [], total: 0, page: 1, perPage: 1 } as never);
    expect((await collectOnboardingStatus(deps)).agentsTruncated).toBe(false);
  });

  it('flags truncation when the cap is reached and a later batch still has agents', async () => {
    const policies = Array.from({ length: 101 }, (_, i) => createPolicy({ id: `p${i}` }));
    const agents = Array.from({ length: AGENT_LIST_CAP }, (_, i) => ({
      id: `a${i}`,
      policy_id: 'p0',
      status: 'online',
    }));
    const { deps, agentClient } = setup({ policies });
    agentClient.listAgents
      .mockResolvedValueOnce({ agents, total: AGENT_LIST_CAP, page: 1, perPage: 5000 } as never)
      .mockResolvedValueOnce({
        agents: [{ id: 'x', policy_id: 'p100', status: 'online' }],
        total: 1,
        page: 1,
        perPage: 1,
      } as never);
    expect((await collectOnboardingStatus(deps)).agentsTruncated).toBe(true);
  });

  it('does not search results when there are no agents', async () => {
    const { deps, esInternal } = setup({ policies: [createPolicy({ id: 'p' })] });
    const status = await collectOnboardingStatus(deps);
    expect(status.agentsTruncated).toBe(false);
    expect(esInternal.search).not.toHaveBeenCalledWith(
      expect.objectContaining({ index: OSQUERY_RESULTS_INDEX })
    );
  });

  it('reads the results and the summary as the internal user', async () => {
    const { deps, esInternal } = setup({
      policies: [createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML })],
      packPolicyIds: ['p'],
      agents: [{ id: 'a1', policy_id: 'p', status: 'online' }],
      reportingAgentIds: ['a1'],
    });
    await collectOnboardingStatus(deps);
    expect(esInternal.search).toHaveBeenCalledTimes(2);
    expect(esInternal.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: OSQUERY_RESULTS_INDEX, size: 0 })
    );
    expect(esInternal.search).toHaveBeenCalledWith(
      expect.objectContaining({ index: expect.stringContaining('native-vuln-scanner') })
    );
  });

  it('lists agentless policies separately and does not onboard or query them', async () => {
    const { deps, agentClient } = setup({
      policies: [
        createPolicy({ id: 'ok' }),
        createPolicy({ id: 'agentless', name: 'Agentless', supportsAgentless: true }),
      ],
    });
    const status = await collectOnboardingStatus(deps);
    expect(status.policies.map(({ id }) => id)).toEqual(['ok']);
    expect(status.agentlessPolicies).toEqual([{ id: 'agentless', name: 'Agentless' }]);
    expect(status.needsOsqueryIntegration).toEqual([]);
    expect(agentClient.listAgents).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:("ok")' })
    );
  });

  describe('without agents read', () => {
    const configured = {
      policies: [
        createPolicy({ id: 'p', agentInternal: OSQUERY_PINNED_YAML }),
        createPolicy({ id: 'q' }),
      ],
      packPolicyIds: ['p', 'q'],
    };

    it('degrades to null agent data instead of failing when Fleet denies the agent list', async () => {
      const { deps, esInternal } = setup({
        ...configured,
        agentsError: new FleetUnauthorizedError('no agents read'),
        lastScan: SCAN,
      });
      const status = await collectOnboardingStatus(deps);
      expect(status.agentsVisible).toBe(false);
      expect(status.agentsTruncated).toBe(false);
      expect(
        status.policies.map(({ id, state, agents, reportingInventory }) => ({
          id,
          state,
          agents,
          reportingInventory,
        }))
      ).toEqual([
        { id: 'p', state: 'pending_inventory', agents: null, reportingInventory: null },
        { id: 'q', state: 'not_configured', agents: null, reportingInventory: null },
      ]);
      expect(esInternal.search).not.toHaveBeenCalledWith(
        expect.objectContaining({ index: OSQUERY_RESULTS_INDEX })
      );
    });

    it('reports agentsVisible when the agent list is readable', async () => {
      const { deps } = setup(configured);
      expect((await collectOnboardingStatus(deps)).agentsVisible).toBe(true);
    });

    it('propagates any other agent list error', async () => {
      const { deps } = setup({ ...configured, agentsError: new Error('fleet down') });
      await expect(collectOnboardingStatus(deps)).rejects.toThrow('fleet down');
    });
  });
});

describe('isScanRunning', () => {
  it('asks for non-terminal executions of the scan workflow as the caller', async () => {
    const { deps, workflows } = setup({ runningExecutions: 2 });
    expect(await isScanRunning(deps)).toBe(true);
    expect(workflows.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: expect.any(String),
        statuses: expect.arrayContaining(['running']),
        request: deps.request,
      }),
      'default'
    );
  });
});
