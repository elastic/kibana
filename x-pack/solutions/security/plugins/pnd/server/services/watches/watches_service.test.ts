/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { AgentTypeDefinition } from '@kbn/agent-builder-server/agents';
import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import type { WatchWorkflowsManagementClient } from './watch_workflows_management_client';
import { WatchesService } from './watches_service';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;
const SPACE = 'default';
const request = {} as KibanaRequest;

interface FakeClient {
  client: WatchWorkflowsManagementClient;
  updateWorkflow: jest.Mock;
  /** Enablement the fake workflow store reports back on subsequent reads. */
  workflowEnabled: Map<string, boolean>;
}

const createFakeClient = ({ failUpdate = false } = {}): FakeClient => {
  const workflowEnabled = new Map<string, boolean>();

  const updateWorkflow = jest.fn(async (id: string, { enabled }: { enabled: boolean }) => {
    if (failUpdate) {
      throw new Error('ManagedWorkflowUpdateForbiddenError');
    }
    workflowEnabled.set(id, enabled);
    return {} as never;
  });

  const client = {
    updateWorkflow,
    getWorkflows: jest.fn(async () => ({
      results: [...workflowEnabled].map(([id, enabled]) => ({ id, enabled })),
    })),
    getWorkflow: jest.fn(async () => null),
    getWorkflowExecutions: jest.fn(),
    getWorkflowExecution: jest.fn(),
    createWorkflow: jest.fn(),
    deleteWorkflows: jest.fn(),
  } as unknown as WatchWorkflowsManagementClient;

  return { client, updateWorkflow, workflowEnabled };
};

const createService = (
  management: WatchWorkflowsManagementClient | undefined,
  useMockData = true
) => new WatchesService(management, loggingSystemMock.createLogger() as Logger, useMockData);

const createServiceWithOptions = (
  management: WatchWorkflowsManagementClient | undefined,
  options: {
    ensureAgentForSpace?: (spaceId: string) => Promise<void>;
    agentBuilder?: AgentBuilderPluginStart;
    agentTypes?: readonly AgentTypeDefinition[];
  },
  useMockData = true
) =>
  new WatchesService(
    management,
    loggingSystemMock.createLogger() as Logger,
    useMockData,
    Promise.resolve(),
    options
  );

interface FakeAgentBuilder {
  agentBuilder: AgentBuilderPluginStart;
  agentList: jest.Mock;
  skillList: jest.Mock;
}

const makeAgentBuilder = ({
  agentItems = [] as Array<{ id: string }>,
  skillItems = [] as Array<{ id: string }>,
  failGetRegistry = false,
} = {}): FakeAgentBuilder => {
  const agentList = jest.fn(async () => agentItems);
  const skillList = jest.fn(async () => skillItems);
  const agentBuilder = {
    agents: {
      getRegistry: jest.fn(async () => {
        if (failGetRegistry) throw new Error('registry unavailable');
        return { list: agentList };
      }),
    },
    skills: {
      getRegistry: jest.fn(async () => {
        if (failGetRegistry) throw new Error('registry unavailable');
        return { list: skillList };
      }),
    },
  } as unknown as AgentBuilderPluginStart;
  return { agentBuilder, agentList, skillList };
};

describe('WatchesService', () => {
  describe('enabled — written to the real workflow', () => {
    it('sends an enablement-only update to the workflow', async () => {
      const { client, updateWorkflow } = createFakeClient();

      const result = await createService(client).update(FLOOR, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      // Only `enabled` may be sent: anything more is forbidden on a managed workflow.
      expect(updateWorkflow).toHaveBeenCalledWith(FLOOR, { enabled: false }, SPACE, request);
    });

    it('reads enablement back from the workflow, not the seed', async () => {
      const { client } = createFakeClient();
      const service = createService(client);

      await service.update(FLOOR, { enabled: false }, SPACE, request);

      const detail = await service.get(FLOOR, SPACE, request);
      expect(detail?.watch.enabled).toBe(false);

      const { watches } = await service.list(request, SPACE);
      expect(watches.find(({ id }) => id === FLOOR)?.enabled).toBe(false);
    });

    it('still reports the change when the workflow write fails', async () => {
      const { client, updateWorkflow } = createFakeClient({ failUpdate: true });
      const service = createService(client);

      const result = await service.update(FLOOR, { enabled: false }, SPACE, request);

      expect(updateWorkflow).toHaveBeenCalled();
      expect(result.outcome).toBe('updated');
      // Falls back to the store so the UI does not silently disagree with itself.
      expect((await service.get(FLOOR, SPACE, request))?.watch.enabled).toBe(false);
    });

    it('falls back to the store when Workflows is unavailable', async () => {
      const service = createService(undefined);

      const result = await service.update(FLOOR, { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect((await service.get(FLOOR, SPACE, request))?.watch.enabled).toBe(false);
    });

    it('reports not-found for an unknown watch', async () => {
      const { client } = createFakeClient();

      const result = await createService(client).update('nope', { enabled: false }, SPACE, request);

      expect(result.outcome).toBe('not-found');
    });
  });

  describe('settings — written to the store', () => {
    it('returns the updated settings alongside the watch', async () => {
      const service = createService(createFakeClient().client);

      const result = await service.update(FLOOR, { autonomyLevel: 'supervised' }, SPACE, request);

      expect(result.outcome).toBe('updated');
      expect(result.outcome === 'updated' && result.response.settings?.autonomy).toBe('supervised');
    });

    it('does not touch the workflow for a settings-only patch', async () => {
      const { client, updateWorkflow } = createFakeClient();

      await createService(client).update(FLOOR, { autonomyLevel: 'assisted' }, SPACE, request);

      expect(updateWorkflow).not.toHaveBeenCalled();
    });

    it('applies enabled and settings together in one patch', async () => {
      const { client, updateWorkflow } = createFakeClient();

      const result = await createService(client).update(
        FLOOR,
        { enabled: false, autonomyLevel: 'assisted' },
        SPACE,
        request
      );

      expect(updateWorkflow).toHaveBeenCalledWith(FLOOR, { enabled: false }, SPACE, request);
      expect(result.outcome === 'updated' && result.response.watch.enabled).toBe(false);
      expect(result.outcome === 'updated' && result.response.settings?.autonomy).toBe('assisted');
    });

    it('rejects a patch the watch does not offer', async () => {
      const service = createService(createFakeClient().client);

      const gate = await service.update(
        FLOOR,
        { approvalGate: { gateId: 'host-isolation', requirement: 'in-scope' } },
        SPACE,
        request
      );
      expect(gate).toEqual({ outcome: 'rejected', what: 'approval gate "host-isolation"' });

      const schedule = await service.update(
        FLOOR,
        { triggers: { scheduleId: 'every-century' } },
        SPACE,
        request
      );
      expect(schedule).toEqual({ outcome: 'rejected', what: 'trigger settings' });
    });

    it('leaves the workflow untouched when a settings patch in the same body is rejected', async () => {
      const { client, updateWorkflow } = createFakeClient();
      const service = createService(client);

      const result = await service.update(
        FLOOR,
        { enabled: false, triggers: { scheduleId: 'every-century' } },
        SPACE,
        request
      );

      expect(result).toEqual({ outcome: 'rejected', what: 'trigger settings' });
      // `enabled` is the one field with a real persisted side effect, so settings must validate first:
      // a rejected patch has to leave the workflow alone rather than disable it and report 400.
      expect(updateWorkflow).not.toHaveBeenCalled();
      expect((await service.get(FLOOR, SPACE, request))?.watch.enabled).toBe(true);
    });

    it('refuses settings writes when not backed by the store', async () => {
      const service = createService(createFakeClient().client, false);

      const result = await service.update(FLOOR, { autonomyLevel: 'assisted' }, SPACE, request);

      expect(result.outcome).toBe('unavailable');
    });

    it('applies a per-watch skill toggle independently of the global skill flag', async () => {
      const service = createService(createFakeClient().client);

      // Toggle the skill for this watch — the global catalog should not change.
      const result = await service.update(
        FLOOR,
        { skill: { skillId: 'alert-triage', enabled: false } },
        SPACE,
        request
      );

      expect(result.outcome).toBe('updated');
      // The watch detail reflects the per-watch override.
      const detail = result.outcome === 'updated' ? result.response : undefined;
      expect(detail?.settings?.skills?.find((s) => s.skillId === 'alert-triage')?.enabled).toBe(
        false
      );
      // The global skill catalog is unchanged.
      expect(service.listWorkers()).toBeDefined(); // sanity: service still functional
      const globalSkills = await service.listSkills(request, SPACE);
      expect(globalSkills.find((s) => s.id === 'alert-triage')?.enabled).toBe(true);
    });

    it('rejects a skill toggle for a skill not attached to the watch', async () => {
      const service = createService(createFakeClient().client);

      const result = await service.update(
        FLOOR,
        { skill: { skillId: 'no-such-skill', enabled: false } },
        SPACE,
        request
      );

      expect(result).toEqual({ outcome: 'rejected', what: 'skill "no-such-skill"' });
    });

    it('mock mode — global skill toggle does not affect the per-watch override', async () => {
      const service = createService(createFakeClient().client);
      // Establish a per-watch override.
      await service.update(
        FLOOR,
        { skill: { skillId: 'alert-triage', enabled: false } },
        SPACE,
        request
      );
      // Flip the global flag both ways; the stored per-watch override must not move.
      await service.setSkillEnabled('alert-triage', false, request, SPACE);
      await service.setSkillEnabled('alert-triage', true, request, SPACE);

      const detail = await service.get(FLOOR, SPACE, request);
      expect(detail?.settings?.skills?.find((s) => s.skillId === 'alert-triage')?.enabled).toBe(
        false
      );
    });

    it('non-mock mode — per-watch skill toggle is not supported', async () => {
      const service = createService(createFakeClient().client, false);

      const result = await service.update(
        FLOOR,
        { skill: { skillId: 'alert-triage', enabled: false } },
        SPACE,
        request
      );

      expect(result.outcome).toBe('unavailable');
    });
  });

  describe('catalogs', () => {
    it('exposes workers from the store and returns undefined for unknown entries', () => {
      const service = createService(undefined);

      expect(service.listWorkers().length).toBeGreaterThan(0);
      expect(service.setWorkerEnabled('containment', false)?.enabled).toBe(false);
      expect(service.setWorkerEnabled('nope', false)).toBeUndefined();
    });

    it('setSkillEnabled returns undefined for an unknown skill id in mock mode', async () => {
      const service = createService(undefined);
      expect(await service.setSkillEnabled('nope', false, request, SPACE)).toBeUndefined();
    });

    it('setSkillEnabled returns undefined for an unknown skill id in non-mock mode when cache is empty', async () => {
      const service = createService(createFakeClient().client, false);
      expect(await service.setSkillEnabled('nope', false, request, SPACE)).toBeUndefined();
    });
  });

  describe('listSkills', () => {
    const WATCH_1 = 'watch-1';
    const WATCH_2 = 'watch-2';
    const TYPE_ID = 'test-type';

    // Build a minimal workflow list item that projectWorkflowToWatch can handle.
    const makeItem = (id: string, steps: object[]) => ({
      id,
      name: id,
      description: '',
      enabled: true,
      managed: false,
      managedBy: undefined,
      tags: ['watch'],
      definition: { steps } as unknown,
      createdAt: '2026-01-01T00:00:00Z',
      valid: true,
      history: [],
    });

    // ai.agent step with an optional step-level skill_ids override.
    const agentStep = (stepSkillIds?: string[]) => ({
      name: 'run',
      type: 'ai.agent',
      'agent-id': 'my-agent',
      with: stepSkillIds != null ? { configuration_overrides: { skill_ids: stepSkillIds } } : {},
    });

    const makeAgentLookup = ({
      agentSkillIds = [] as string[],
      typeBaseSkillIds = [] as string[],
    } = {}): { agentBuilder: AgentBuilderPluginStart; agentTypes: AgentTypeDefinition[] } => ({
      agentBuilder: {
        agents: {
          getRegistry: jest.fn(async () => ({
            list: jest.fn(async () => [
              { id: 'my-agent', type: TYPE_ID, configuration: { skill_ids: agentSkillIds } },
            ]),
          })),
        },
        skills: {
          getRegistry: jest.fn(async () => ({
            list: jest.fn(async () =>
              [...new Set([...agentSkillIds, ...typeBaseSkillIds])].map((sid) => ({
                id: sid,
                name: sid,
                description: `${sid} desc`,
              }))
            ),
          })),
        },
      } as unknown as AgentBuilderPluginStart,
      agentTypes: [
        { id: TYPE_ID, baseConfiguration: { skill_ids: typeBaseSkillIds } },
      ] as unknown as AgentTypeDefinition[],
    });

    const clientFrom = (items: ReturnType<typeof makeItem>[]): WatchWorkflowsManagementClient =>
      ({
        getWorkflows: jest.fn(async () => ({ results: items })),
        getWorkflow: jest.fn(async () => null),
        getWorkflowExecutions: jest.fn(async () => ({ results: [] })),
        getWorkflowExecution: jest.fn(async () => null),
        createWorkflow: jest.fn(),
        updateWorkflow: jest.fn(),
        deleteWorkflows: jest.fn(),
      } as unknown as WatchWorkflowsManagementClient);

    it('in mock mode, returns stored skills from SKILLS_SEED', async () => {
      const service = createService(undefined, true);

      const skills = await service.listSkills(request, SPACE);

      // SKILLS_SEED has 'alert-triage' covering FLOOR.
      const alertTriage = skills.find((s) => s.id === 'alert-triage');
      expect(alertTriage).toBeDefined();
      expect(alertTriage?.watchIds).toContain(FLOOR);
      expect(alertTriage?.enabled).toBe(true);
    });

    it('uses agent type base skills when the step has no skill_ids override', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({
        agentSkillIds: ['agent-skill'],
        typeBaseSkillIds: ['base-skill'],
      });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      const skills = await service.listSkills(request, SPACE);
      const ids = skills.map((s) => s.id);

      // No step override → base skills prepend, agent skills follow.
      expect(ids).toContain('base-skill');
      expect(ids).toContain('agent-skill');
    });

    it('step skill_ids override replaces agent skills; type base skills still prepend', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({
        agentSkillIds: ['agent-skill'],
        typeBaseSkillIds: ['base-skill'],
      });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep(['override-skill'])])]),
        { agentBuilder, agentTypes },
        false
      );

      const skills = await service.listSkills(request, SPACE);
      const ids = skills.map((s) => s.id);

      expect(ids).toContain('base-skill');
      expect(ids).toContain('override-skill');
      expect(ids).not.toContain('agent-skill');
    });

    it('aggregates watchIds when the same skill appears across multiple watches', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({
        typeBaseSkillIds: ['shared-skill'],
      });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()]), makeItem(WATCH_2, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      const skills = await service.listSkills(request, SPACE);
      const shared = skills.find((s) => s.id === 'shared-skill');

      expect(shared?.watchIds).toEqual(expect.arrayContaining([WATCH_1, WATCH_2]));
    });

    it('defaults enabled: true and lastRun: null for a newly projected skill with no prior cache', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      const [skill] = await service.listSkills(request, SPACE);

      expect(skill.enabled).toBe(true);
      expect(skill.lastRun).toBeNull();
    });

    it('returns the same cached array on repeated calls without re-fetching', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const client = clientFrom([makeItem(WATCH_1, [agentStep()])]);
      const service = createServiceWithOptions(client, { agentBuilder, agentTypes }, false);

      const first = await service.listSkills(request, SPACE);
      const second = await service.listSkills(request, SPACE);

      expect(second).toBe(first);
      expect(client.getWorkflows).toHaveBeenCalledTimes(1);
    });

    it('setSkillEnabled mutates the cached entry and returns the updated skill', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      await service.listSkills(request, SPACE);
      const updated = await service.setSkillEnabled('skill-a', false, request, SPACE);

      expect(updated?.id).toBe('skill-a');
      expect(updated?.enabled).toBe(false);

      const [cached] = await service.listSkills(request, SPACE);
      expect(cached.enabled).toBe(false);
    });

    it('setSkillEnabled returns undefined for an unknown skill id', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      await service.listSkills(request, SPACE);

      expect(await service.setSkillEnabled('no-such-skill', false, request, SPACE)).toBeUndefined();
    });

    it('non-mock mode — global skill toggle does not create a per-watch override', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const service = createServiceWithOptions(
        clientFrom([makeItem(WATCH_1, [agentStep()])]),
        { agentBuilder, agentTypes },
        false
      );

      await service.listSkills(request, SPACE);
      await service.setSkillEnabled('skill-a', false, request, SPACE);
      expect(
        (await service.listSkills(request, SPACE)).find((s) => s.id === 'skill-a')?.enabled
      ).toBe(false);

      // Restoring the global flag propagates immediately — no per-watch override is stuck.
      await service.setSkillEnabled('skill-a', true, request, SPACE);
      expect(
        (await service.listSkills(request, SPACE)).find((s) => s.id === 'skill-a')?.enabled
      ).toBe(true);
    });

    it('list() warms the cache so a subsequent listSkills() call does not re-fetch', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const client = clientFrom([makeItem(WATCH_1, [agentStep()])]);
      const service = createServiceWithOptions(client, { agentBuilder, agentTypes }, false);

      await service.list(request, SPACE);
      await service.listSkills(request, SPACE);

      expect(client.getWorkflows).toHaveBeenCalledTimes(1);
    });

    it('preserves enabled state when list() is called again after setSkillEnabled', async () => {
      const { agentBuilder, agentTypes } = makeAgentLookup({ typeBaseSkillIds: ['skill-a'] });
      const client = clientFrom([makeItem(WATCH_1, [agentStep()])]);
      const service = createServiceWithOptions(client, { agentBuilder, agentTypes }, false);

      await service.listSkills(request, SPACE);
      await service.setSkillEnabled('skill-a', false, request, SPACE);

      // list() calls ensurePopulated(), which skips the refresh since skills are already cached.
      // The setSkillEnabled mutation persists directly on the cached skill entry.
      await service.list(request, SPACE);

      const skills = await service.listSkills(request, SPACE);
      expect(skills.find((s) => s.id === 'skill-a')?.enabled).toBe(false);
    });
  });

  describe('ensureAgentForSpace', () => {
    it('is called with the space on list()', async () => {
      const ensureAgentForSpace = jest.fn();
      const service = createServiceWithOptions(undefined, { ensureAgentForSpace });

      await service.list(request, SPACE);

      expect(ensureAgentForSpace).toHaveBeenCalledWith(SPACE);
    });

    it('is called with the space on get()', async () => {
      const ensureAgentForSpace = jest.fn();
      const service = createServiceWithOptions(undefined, { ensureAgentForSpace });

      await service.get(FLOOR, SPACE, request);

      expect(ensureAgentForSpace).toHaveBeenCalledWith(SPACE);
    });

    it('is called with the space on createCustom() before reaching the management client', async () => {
      const ensureAgentForSpace = jest.fn();
      const { client } = createFakeClient();
      (client.createWorkflow as jest.Mock).mockResolvedValue({ id: 'new-watch' });
      const service = createServiceWithOptions(client, { ensureAgentForSpace }, false);

      // get() returns undefined for the created id → createCustom throws, but ensureAgentForSpace
      // runs in prepareSpace before any workflow call.
      await service.createCustom(request, SPACE, { name: 'Test' }).catch(() => {});

      expect(ensureAgentForSpace).toHaveBeenCalledWith(SPACE);
    });

    it('is called with the space on listSkills() in non-mock mode', async () => {
      const ensureAgentForSpace = jest.fn();
      const { agentBuilder } = makeAgentBuilder();
      const service = createServiceWithOptions(
        createFakeClient().client,
        { ensureAgentForSpace, agentBuilder },
        false
      );

      await service.listSkills(request, SPACE);

      expect(ensureAgentForSpace).toHaveBeenCalledWith(SPACE);
    });

    it('does not throw when ensureAgentForSpace is not provided', async () => {
      const service = createService(undefined);
      await expect(service.list(request, SPACE)).resolves.toBeDefined();
    });
  });

  describe('buildAgentLookup', () => {
    it('fetches agent and skill registries on list() in non-mock mode', async () => {
      const { agentBuilder, agentList, skillList } = makeAgentBuilder();
      const { client } = createFakeClient();
      const service = createServiceWithOptions(client, { agentBuilder }, false);

      await service.list(request, SPACE);

      expect(agentList).toHaveBeenCalled();
      expect(skillList).toHaveBeenCalled();
    });

    it('fetches agent and skill registries on get() in non-mock mode', async () => {
      const { agentBuilder, agentList, skillList } = makeAgentBuilder();
      const { client } = createFakeClient();
      const service = createServiceWithOptions(client, { agentBuilder }, false);

      await service.get(FLOOR, SPACE, request);

      expect(agentList).toHaveBeenCalled();
      expect(skillList).toHaveBeenCalled();
    });

    it('fetches agent and skill registries on listSkills() in non-mock mode', async () => {
      const { agentBuilder, agentList, skillList } = makeAgentBuilder();
      const { client } = createFakeClient();
      const service = createServiceWithOptions(client, { agentBuilder }, false);

      await service.listSkills(request, SPACE);

      expect(agentList).toHaveBeenCalled();
      expect(skillList).toHaveBeenCalled();
    });

    it('is skipped in mock mode — no workflow projection, no lookup needed', async () => {
      const { agentBuilder, agentList } = makeAgentBuilder();
      const service = createServiceWithOptions(undefined, { agentBuilder }, true);

      await service.list(request, SPACE);

      expect(agentList).not.toHaveBeenCalled();
    });

    it('runs the agent lookup when get() is called in non-mock mode', async () => {
      const { agentBuilder, agentList } = makeAgentBuilder();
      const { client } = createFakeClient();
      const service = createServiceWithOptions(client, { agentBuilder }, false);

      await service.get(FLOOR, SPACE, request);

      expect(agentList).toHaveBeenCalled();
    });

    it('swallows registry errors and still returns a valid result', async () => {
      const { agentBuilder } = makeAgentBuilder({ failGetRegistry: true });
      const { client } = createFakeClient();
      const service = createServiceWithOptions(client, { agentBuilder }, false);

      await expect(service.list(request, SPACE)).resolves.toBeDefined();
    });

    it('is skipped when agentBuilder is not provided', async () => {
      // No agentBuilder → buildAgentLookup short-circuits; list still resolves.
      const service = createServiceWithOptions(createFakeClient().client, {}, false);
      await expect(service.list(request, SPACE)).resolves.toBeDefined();
    });
  });

  describe('non-mock data routes', () => {
    // Minimal workflow item that passes the WATCH_TAG filter in WatchStore.refresh().
    const makeTaggedItem = (id: string, options: { steps?: object[]; enabled?: boolean } = {}) => ({
      id,
      name: id,
      description: '',
      enabled: options.enabled ?? true,
      managed: true,
      managedBy: 'pnd',
      tags: ['watch'],
      definition: { tags: ['watch'], steps: options.steps ?? [] },
      createdAt: '2026-01-01T00:00:00Z',
      valid: true,
      history: [],
    });

    const makeLiveClient = (
      listItems: ReturnType<typeof makeTaggedItem>[] = [],
      detailItem: ReturnType<typeof makeTaggedItem> | null = null
    ) =>
      ({
        getWorkflows: jest.fn().mockResolvedValue({ results: listItems }),
        getWorkflow: jest.fn().mockResolvedValue(detailItem),
        getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
        getWorkflowExecution: jest.fn().mockResolvedValue(null),
        createWorkflow: jest.fn(),
        updateWorkflow: jest.fn(),
        deleteWorkflows: jest.fn(),
      } as unknown as WatchWorkflowsManagementClient);

    describe('list()', () => {
      it('returns watches fetched from the Workflows API', async () => {
        const service = createService(makeLiveClient([makeTaggedItem('watch-1')]), false);
        const { watches } = await service.list(request, SPACE);
        expect(watches).toHaveLength(1);
        expect(watches[0].id).toBe('watch-1');
      });

      it('excludes workflow items that do not carry the watch tag', async () => {
        const untagged = {
          ...makeTaggedItem('watch-1'),
          tags: [] as string[],
          definition: { tags: [] as string[], steps: [] },
        };
        const service = createService(
          makeLiveClient([untagged as unknown as ReturnType<typeof makeTaggedItem>]),
          false
        );
        const { watches } = await service.list(request, SPACE);
        expect(watches).toHaveLength(0);
      });

      it('does not re-fetch when the skill cache is warm', async () => {
        // ensurePopulated() skips refresh when listSkills().length > 0.
        const agentStep = { name: 'run', type: 'ai.agent', 'agent-id': 'my-agent', with: {} };
        const agentBuilder = {
          agents: {
            getRegistry: jest.fn().mockResolvedValue({
              list: jest
                .fn()
                .mockResolvedValue([{ id: 'my-agent', configuration: { skill_ids: ['skill-a'] } }]),
            }),
          },
          skills: {
            getRegistry: jest.fn().mockResolvedValue({ list: jest.fn().mockResolvedValue([]) }),
          },
        } as unknown as AgentBuilderPluginStart;
        const client = makeLiveClient([makeTaggedItem('watch-1', { steps: [agentStep] })]);
        const service = createServiceWithOptions(client, { agentBuilder }, false);

        await service.list(request, SPACE);
        await service.list(request, SPACE);

        expect(client.getWorkflows).toHaveBeenCalledTimes(1);
      });

      it('does not re-fetch when already populated, even when watches have no skill callables', async () => {
        const client = makeLiveClient([makeTaggedItem('watch-1')]);
        const service = createService(client, false);

        await service.list(request, SPACE);
        await service.list(request, SPACE);

        expect(client.getWorkflows).toHaveBeenCalledTimes(1);
      });
    });

    describe('get()', () => {
      it('returns undefined when the workflow is not found in the management API', async () => {
        const service = createService(makeLiveClient(), false);
        expect(await service.get('nope', SPACE, request)).toBeUndefined();
      });

      it('returns undefined when the detail DTO lacks the watch tag', async () => {
        const item = makeTaggedItem('watch-1');
        const untagged = { ...item, definition: { tags: [] as string[], steps: [] } };
        const client = makeLiveClient(
          [item],
          untagged as unknown as ReturnType<typeof makeTaggedItem>
        );
        const service = createService(client, false);
        expect(await service.get('watch-1', SPACE, request)).toBeUndefined();
      });

      it('returns the watch with default settings from the store', async () => {
        const item = makeTaggedItem('watch-1');
        const service = createService(makeLiveClient([item], item), false);

        await service.list(request, SPACE); // warm the store
        const result = await service.get('watch-1', SPACE, request);

        expect(result).toBeDefined();
        expect(result?.watch.id).toBe('watch-1');
        expect(result?.settings).toMatchObject({ watchId: 'watch-1', autonomy: 'manual' });
      });

      it('returns skill settings populated during the last list()', async () => {
        const agentId = 'my-agent';
        const agentStep = { name: 'run', type: 'ai.agent', 'agent-id': agentId, with: {} };
        const item = makeTaggedItem('watch-1', { steps: [agentStep] });
        const agentBuilder = {
          agents: {
            getRegistry: jest.fn().mockResolvedValue({
              list: jest
                .fn()
                .mockResolvedValue([{ id: agentId, configuration: { skill_ids: ['skill-a'] } }]),
            }),
          },
          skills: {
            getRegistry: jest.fn().mockResolvedValue({ list: jest.fn().mockResolvedValue([]) }),
          },
        } as unknown as AgentBuilderPluginStart;

        const client = makeLiveClient([item], item);
        const service = createServiceWithOptions(client, { agentBuilder }, false);

        await service.list(request, SPACE); // refresh populates settings.skills from callables
        const result = await service.get('watch-1', SPACE, request);

        expect(result?.settings?.skills).toHaveLength(1);
        expect(result?.settings?.skills?.[0]).toMatchObject({ skillId: 'skill-a', enabled: true });
      });
    });
  });

  describe('skill enablement', () => {
    describe('mock mode', () => {
      it('per-watch toggle is independent of the global catalog', async () => {
        const service = createService(createFakeClient().client);

        await service.update(
          FLOOR,
          { skill: { skillId: 'alert-triage', enabled: false } },
          SPACE,
          request
        );

        const detail = await service.get(FLOOR, SPACE, request);
        expect(detail?.settings?.skills?.find((s) => s.skillId === 'alert-triage')?.enabled).toBe(
          false
        );
        expect(
          (await service.listSkills(request, SPACE)).find((s) => s.id === 'alert-triage')?.enabled
        ).toBe(true);
      });

      it('global toggle does not overwrite a stored per-watch override', async () => {
        const service = createService(createFakeClient().client);

        await service.update(
          FLOOR,
          { skill: { skillId: 'alert-triage', enabled: false } },
          SPACE,
          request
        );
        await service.setSkillEnabled('alert-triage', false, request, SPACE);
        await service.setSkillEnabled('alert-triage', true, request, SPACE);

        const detail = await service.get(FLOOR, SPACE, request);
        expect(detail?.settings?.skills?.find((s) => s.skillId === 'alert-triage')?.enabled).toBe(
          false
        );
      });

      it('per-watch toggle is rejected for a skill not attached to the watch', async () => {
        const service = createService(createFakeClient().client);
        const result = await service.update(
          FLOOR,
          { skill: { skillId: 'no-such-skill', enabled: false } },
          SPACE,
          request
        );
        expect(result).toEqual({ outcome: 'rejected', what: 'skill "no-such-skill"' });
      });
    });

    describe('non-mock mode', () => {
      it('per-watch toggle returns unavailable — not supported in live mode', async () => {
        const service = createService(createFakeClient().client, false);
        const result = await service.update(
          FLOOR,
          { skill: { skillId: 'alert-triage', enabled: false } },
          SPACE,
          request
        );
        expect(result.outcome).toBe('unavailable');
      });

      it('global toggle mutates the cached skill and is visible through listSkills()', async () => {
        const agentId = 'my-agent';
        const agentStep = { name: 'run', type: 'ai.agent', 'agent-id': agentId, with: {} };
        const item = {
          id: 'watch-1',
          name: 'watch-1',
          description: '',
          enabled: true,
          managed: true,
          managedBy: 'pnd',
          tags: ['watch'],
          definition: { tags: ['watch'], steps: [agentStep] },
          createdAt: '2026-01-01T00:00:00Z',
          valid: true,
          history: [],
        };
        const agentBuilder = {
          agents: {
            getRegistry: jest.fn().mockResolvedValue({
              list: jest
                .fn()
                .mockResolvedValue([{ id: agentId, configuration: { skill_ids: ['skill-a'] } }]),
            }),
          },
          skills: {
            getRegistry: jest.fn().mockResolvedValue({ list: jest.fn().mockResolvedValue([]) }),
          },
        } as unknown as AgentBuilderPluginStart;
        const client = {
          getWorkflows: jest.fn().mockResolvedValue({ results: [item] }),
          getWorkflow: jest.fn().mockResolvedValue(null),
          getWorkflowExecutions: jest.fn().mockResolvedValue({ results: [] }),
          createWorkflow: jest.fn(),
          updateWorkflow: jest.fn(),
          deleteWorkflows: jest.fn(),
        } as unknown as WatchWorkflowsManagementClient;
        const service = createServiceWithOptions(client, { agentBuilder }, false);

        await service.listSkills(request, SPACE); // populate cache
        await service.setSkillEnabled('skill-a', false, request, SPACE);

        const skills = await service.listSkills(request, SPACE);
        expect(skills.find((s) => s.id === 'skill-a')?.enabled).toBe(false);
      });
    });
  });
});
