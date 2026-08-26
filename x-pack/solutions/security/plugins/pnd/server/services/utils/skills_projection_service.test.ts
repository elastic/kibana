/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
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

const mockProjectWatch = projectWorkflowToWatch as jest.Mock;

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
      expect(skill.watchIds.sort()).toEqual(['watch-a', 'watch-b']);
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

    it('preserves lastRun across refreshes', async () => {
      jest.useFakeTimers();
      const lastRun = '2024-01-01T00:00:00.000Z';

      management.getWorkflows.mockResolvedValue(makeWorkflowListDto([{ id: 'watch-a' }]));
      mockProjectWatch.mockReturnValue(makeWatch('watch-a', ['skill-1']));

      const firstSkills = await service.list(mockRequest, spaceId);
      expect(firstSkills[0].lastRun).toBeNull();

      // Simulate a prior run record being written to the cache
      (service as any).cacheBySpace.get(spaceId).skills[0].lastRun = lastRun;

      jest.advanceTimersByTime(5 * 60 * 1000 + 1);
      mockProjectWatch.mockReturnValue(makeWatch('watch-a', ['skill-1']));
      const [second] = await service.list(mockRequest, spaceId);

      expect(second.lastRun).toBe(lastRun);
      jest.useRealTimers();
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
