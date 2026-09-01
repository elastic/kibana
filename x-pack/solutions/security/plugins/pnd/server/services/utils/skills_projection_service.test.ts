/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Watch } from '@kbn/pnd-common';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';
import { SkillsProjectionService } from './skills_projection_service';

jest.mock('../watches/project_watch', () => ({
  projectWorkflowToWatch: jest.fn(),
}));
jest.mock('./build_agent_lookup', () => ({
  buildAgentLookup: jest.fn(),
}));

import { projectWorkflowToWatch } from '../watches/project_watch';
import { buildAgentLookup } from './build_agent_lookup';

const mockProjectWatch = projectWorkflowToWatch as jest.Mock;
const mockBuildAgentLookup = buildAgentLookup as jest.Mock;

const mockRequest = {} as KibanaRequest;
const mockLogger = { debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger;
const spaceId = 'default';

const makeWatch = (id: string, skillIds: string[]): Watch =>
  ({
    id,
    name: id,
    sortOrder: 0,
    skills: skillIds.map((skillId) => ({
      kind: 'skill' as const,
      id: skillId,
      name: skillId,
      summary: '',
    })),
  } as unknown as Watch);

const makeWorkflowListDto = (items: Array<{ id: string }>, total?: number) =>
  ({
    results: items,
    total: total ?? items.length,
    page: 1,
    size: 100,
  } as any);

describe('SkillsProjectionService', () => {
  let management: jest.Mocked<Pick<WatchWorkflowsManagementClient, 'getWorkflows'>>;
  let service: SkillsProjectionService;

  beforeEach(() => {
    jest.clearAllMocks();
    management = { getWorkflows: jest.fn() };
    service = new SkillsProjectionService(
      management as unknown as WatchWorkflowsManagementClient,
      undefined,
      mockLogger
    );
  });

  describe('list()', () => {
    it('returns skills projected from watch', async () => {
      management.getWorkflows.mockResolvedValue(
        makeWorkflowListDto([{ id: 'watch-a' }, { id: 'watch-b' }])
      );
      mockProjectWatch
        .mockReturnValueOnce(makeWatch('watch-a', ['skill-1', 'skill-2']))
        .mockReturnValueOnce(makeWatch('watch-b', ['skill-2', 'skill-3']));

      const skills = await service.list(mockRequest, spaceId);

      expect(skills.map((s) => s.id).sort()).toEqual(['skill-1', 'skill-2', 'skill-3']);
      expect(skills.find((s) => s.id === 'skill-1')?.name).toBe('skill-1');
    });

    it('includes all watch IDs for a skill shared across watches', async () => {
      management.getWorkflows.mockResolvedValue(
        makeWorkflowListDto([{ id: 'watch-a' }, { id: 'watch-b' }])
      );
      mockProjectWatch
        .mockReturnValueOnce(makeWatch('watch-a', ['shared']))
        .mockReturnValueOnce(makeWatch('watch-b', ['shared']));

      const [skill] = await service.list(mockRequest, spaceId);

      expect(skill.id).toBe('shared');
      expect(skill.name).toBe('shared');
      expect(skill.watchIds.sort()).toEqual(['watch-a', 'watch-b']);
    });

    it('preserves the name from the first watch that resolves it', async () => {
      management.getWorkflows.mockResolvedValue(
        makeWorkflowListDto([{ id: 'watch-a' }, { id: 'watch-b' }])
      );
      const watchA = makeWatch('watch-a', ['shared']);
      watchA.skills[0].name = 'First Name';
      const watchB = makeWatch('watch-b', ['shared']);
      watchB.skills[0].name = 'Second Name';
      mockProjectWatch.mockReturnValueOnce(watchA).mockReturnValueOnce(watchB);

      const [skill] = await service.list(mockRequest, spaceId);

      expect(skill.name).toBe('First Name');
    });

    it('returns empty when no watches have skills', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-a' }]));
      mockProjectWatch.mockReturnValueOnce(makeWatch('watch-a', []));

      const skills = await service.list(mockRequest, spaceId);

      expect(skills).toEqual([]);
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      management.getWorkflows.mockResolvedValue(
        makeWorkflowListDto([{ id: 'watch-a' }, { id: 'watch-b' }, { id: 'watch-c' }])
      );
      mockProjectWatch
        .mockReturnValueOnce(makeWatch('watch-a', ['skill-1']))
        .mockReturnValueOnce(makeWatch('watch-b', ['skill-2']))
        .mockReturnValueOnce(makeWatch('watch-c', ['skill-3']));
    });

    it('returns only skills belonging to the specified watch IDs', async () => {
      const skills = await service.get(mockRequest, spaceId, ['watch-a', 'watch-c']);

      expect(skills.map((s) => s.id).sort()).toEqual(['skill-1', 'skill-3']);
    });

    it('returns empty when none of the watch IDs match', async () => {
      const skills = await service.get(mockRequest, spaceId, ['watch-z']);

      expect(skills).toEqual([]);
    });

    it('returns a shared skill when any of its watches matches', async () => {
      management.getWorkflows.mockReset();
      mockProjectWatch.mockReset();
      management.getWorkflows.mockResolvedValue(
        makeWorkflowListDto([{ id: 'watch-a' }, { id: 'watch-b' }])
      );
      mockProjectWatch
        .mockReturnValueOnce(makeWatch('watch-a', ['shared']))
        .mockReturnValueOnce(makeWatch('watch-b', ['shared']));

      const skills = await service.get(mockRequest, spaceId, ['watch-a']);

      expect(skills).toHaveLength(1);
      expect(skills[0].watchIds.sort()).toEqual(['watch-a', 'watch-b']);
    });
  });

  describe('caching', () => {
    it('re-fetches immediately after invalidation', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([]));
      mockProjectWatch.mockReturnValue(makeWatch('w', []));

      const first = await service.list(mockRequest, spaceId);
      expect(first).toEqual([]);
      expect(management.getWorkflows).toHaveBeenCalledTimes(1);

      service.invalidate(spaceId);

      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-floor' }]));
      mockProjectWatch.mockReturnValueOnce(makeWatch('watch-floor', ['alert-analysis']));

      const second = await service.list(mockRequest, spaceId);
      expect(management.getWorkflows).toHaveBeenCalledTimes(2);
      expect(second.map((s) => s.id)).toEqual(['alert-analysis']);
    });

    it('only invalidates the targeted space', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'w' }]));
      mockProjectWatch.mockReturnValue(makeWatch('w', ['s']));

      await service.list(mockRequest, 'space-1');
      await service.list(mockRequest, 'space-2');
      expect(management.getWorkflows).toHaveBeenCalledTimes(2);

      service.invalidate('space-1');

      mockProjectWatch.mockReturnValue(makeWatch('w', ['s']));
      await service.list(mockRequest, 'space-1'); // must re-fetch
      await service.list(mockRequest, 'space-2'); // still cached

      expect(management.getWorkflows).toHaveBeenCalledTimes(3);
    });

    it('does not re-fetch within the 5-minute TTL', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-a' }]));
      mockProjectWatch.mockReturnValue(makeWatch('watch-a', ['skill-1']));

      await service.list(mockRequest, spaceId);
      await service.list(mockRequest, spaceId);

      expect(management.getWorkflows).toHaveBeenCalledTimes(1);
    });

    it('re-fetches after the cache TTL expires', async () => {
      jest.useFakeTimers();
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-a' }]));
      mockProjectWatch.mockReturnValue(makeWatch('watch-a', ['skill-1']));

      await service.list(mockRequest, spaceId);

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      await service.list(mockRequest, spaceId);

      expect(management.getWorkflows).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    it('caches independently per space', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([]));
      mockProjectWatch.mockReturnValue(makeWatch('w', []));

      await service.list(mockRequest, 'space-1');
      await service.list(mockRequest, 'space-2');

      expect(management.getWorkflows).toHaveBeenCalledTimes(2);
    });

    it('returns null for lastRun (skill-level run tracking is not supported)', async () => {
      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-a' }]));
      mockProjectWatch.mockReturnValue(makeWatch('watch-a', ['skill-1']));

      const [skill] = await service.list(mockRequest, spaceId);

      expect(skill.lastRun).toBeNull();
    });

    it('uses cached workflow items but resolves names per request from each user registry', async () => {
      const userARequest = { id: 'user-a' } as unknown as KibanaRequest;
      const userBRequest = { id: 'user-b' } as unknown as KibanaRequest;
      const mockAgentBuilder = {} as unknown as AgentBuilderPluginStart;

      const serviceWithBuilder = new SkillsProjectionService(
        management as unknown as WatchWorkflowsManagementClient,
        undefined,
        mockLogger,
        mockAgentBuilder
      );

      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-1' }]));

      const userALookup = { getSkill: jest.fn(), getAgent: jest.fn(), getAgentType: jest.fn() };
      const userBLookup = { getSkill: jest.fn(), getAgent: jest.fn(), getAgentType: jest.fn() };

      mockBuildAgentLookup.mockResolvedValueOnce(userALookup).mockResolvedValueOnce(userBLookup);

      // Return different skill IDs depending on which user's lookup is in scope
      mockProjectWatch.mockImplementation((_item: unknown, lookup: unknown) =>
        lookup === userALookup
          ? makeWatch('watch-1', ['skill-user-a'])
          : makeWatch('watch-1', ['skill-user-b'])
      );

      const userASkills = await serviceWithBuilder.list(userARequest, spaceId);
      const userBSkills = await serviceWithBuilder.list(userBRequest, spaceId);

      // Workflow I/O is cached — only one fetch regardless of how many callers
      expect(management.getWorkflows).toHaveBeenCalledTimes(1);

      // Registry is resolved once per request, not once per cache-miss
      expect(mockBuildAgentLookup).toHaveBeenCalledTimes(2);
      expect(mockBuildAgentLookup).toHaveBeenNthCalledWith(
        1,
        mockAgentBuilder,
        expect.anything(),
        userARequest,
        mockLogger
      );
      expect(mockBuildAgentLookup).toHaveBeenNthCalledWith(
        2,
        mockAgentBuilder,
        expect.anything(),
        userBRequest,
        mockLogger
      );

      // Each user sees names resolved through their own registry — not the first caller's
      expect(userASkills.map((s) => s.id)).toEqual(['skill-user-a']);
      expect(userBSkills.map((s) => s.id)).toEqual(['skill-user-b']);
    });
  });

  describe('pagination', () => {
    it('fetches all pages until total is reached', async () => {
      const page1 = makeWorkflowListDto([{ id: 'w1' }, { id: 'w2' }], 3);
      const page2 = makeWorkflowListDto([{ id: 'w3' }], 3);
      management.getWorkflows.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);
      mockProjectWatch
        .mockReturnValueOnce(makeWatch('w1', ['s1']))
        .mockReturnValueOnce(makeWatch('w2', ['s2']))
        .mockReturnValueOnce(makeWatch('w3', ['s3']));

      const skills = await service.list(mockRequest, spaceId);

      expect(management.getWorkflows).toHaveBeenCalledTimes(2);
      expect(skills.map((s) => s.id).sort()).toEqual(['s1', 's2', 's3']);
    });
  });
});
