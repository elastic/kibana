/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_TAG } from '@kbn/pnd-common';
import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import { WatchStore } from './watch_store';
import type { WatchWorkflowsManagementClient } from '../watches/watch_workflows_management_client';

describe('WatchStore', () => {
  let liveStore: WatchStore;
  let getWorkflows: jest.Mock;
  const request = {} as KibanaRequest;
  const SPACE = 'default';

  const makeWorkflowDto = (id: string, options: { agentId?: string; tags?: string[] } = {}) => ({
    id,
    name: `Watch ${id}`,
    enabled: true,
    managed: true,
    managedBy: 'pnd',
    definition: {
      tags: options.tags ?? [WATCH_TAG],
      ...(options.agentId && {
        steps: [{ name: 'run_agent', type: 'ai.agent', 'agent-id': options.agentId, with: {} }],
      }),
    },
  });

  const makeAgentBuilder = (agentId: string, skillIds: string[]): AgentBuilderPluginStart =>
    ({
      agents: {
        getRegistry: jest.fn().mockResolvedValue({
          list: jest
            .fn()
            .mockResolvedValue([{ id: agentId, configuration: { skill_ids: skillIds } }]),
        }),
      },
      skills: {
        getRegistry: jest.fn().mockResolvedValue({ list: jest.fn().mockResolvedValue([]) }),
      },
    } as unknown as AgentBuilderPluginStart);

  beforeEach(() => {
    getWorkflows = jest.fn().mockResolvedValue({ results: [] });
    const management = {
      getWorkflows,
    } as unknown as WatchWorkflowsManagementClient;
    liveStore = new WatchStore(management, loggingSystemMock.createLogger());
  });

  describe('initial state (before refresh)', () => {
    it('listWatches returns empty', () => {
      expect(liveStore.listWatches()).toEqual([]);
    });

    it('listSkills returns empty', () => {
      expect(liveStore.listSkills()).toEqual([]);
    });

    it('getWatch returns undefined', () => {
      expect(liveStore.getWatch('any')).toBeUndefined();
    });

    it('getWatchSettings returns undefined', () => {
      expect(liveStore.getWatchSettings('any')).toBeUndefined();
    });

    it('listWorkers returns empty', () => {
      expect(liveStore.listWorkers()).toEqual([]);
    });
  });

  describe('refresh()', () => {
    it('calls getWorkflows with the watch tag and all-managed filter', async () => {
      await liveStore.refresh(request, SPACE);
      expect(getWorkflows).toHaveBeenCalledWith(
        expect.objectContaining({ tags: [WATCH_TAG], managedFilter: 'all' }),
        SPACE,
        expect.anything()
      );
    });

    it('populates watches from results tagged with WATCH_TAG', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);
      expect(liveStore.listWatches()).toHaveLength(1);
      expect(liveStore.getWatch('watch-a')).toBeDefined();
    });

    it('excludes results that do not carry the watch tag', async () => {
      getWorkflows.mockResolvedValueOnce({
        results: [makeWorkflowDto('watch-a', { tags: [] })],
      });
      await liveStore.refresh(request, SPACE);
      expect(liveStore.listWatches()).toHaveLength(0);
    });

    it('initializes default settings for every fetched watch', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);
      expect(liveStore.getWatchSettings('watch-a')).toMatchObject({
        watchId: 'watch-a',
        autonomy: 'manual',
      });
    });

    it('returns the projected watch list', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      const watches = await liveStore.refresh(request, SPACE);
      expect(watches).toHaveLength(1);
      expect(watches[0].id).toBe('watch-a');
    });

    it('preserves existing per-watch settings across refreshes', async () => {
      getWorkflows.mockResolvedValue({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);

      const settingsBefore = liveStore.getWatchSettings('watch-a')!;
      settingsBefore.autonomy = 'supervised';

      await liveStore.refresh(request, SPACE);
      expect(liveStore.getWatchSettings('watch-a')).toBe(settingsBefore);
      expect(liveStore.getWatchSettings('watch-a')?.autonomy).toBe('supervised');
    });
  });

  describe('ensurePopulated()', () => {
    it('calls refresh when the store has no skills', async () => {
      await liveStore.ensurePopulated(request, SPACE);
      expect(getWorkflows).toHaveBeenCalledTimes(1);
    });

    it('does not re-fetch when already populated, even when watches have no skill callables', async () => {
      await liveStore.ensurePopulated(request, SPACE);
      await liveStore.ensurePopulated(request, SPACE);
      expect(getWorkflows).toHaveBeenCalledTimes(1);
    });
  });

  describe('setWatchEnabled()', () => {
    it('updates the enabled flag and returns the mutated watch', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);

      const result = liveStore.setWatchEnabled('watch-a', false);
      expect(result).toBeDefined();
      expect(liveStore.getWatch('watch-a')?.enabled).toBe(false);
    });

    it('returns undefined for an unknown watch', () => {
      expect(liveStore.setWatchEnabled('nope', false)).toBeUndefined();
    });
  });

  describe('settings setters — not supported in live mode', () => {
    it('setWatchAutonomy returns undefined', () => {
      expect(liveStore.setWatchAutonomy('any', 'assisted')).toBeUndefined();
    });

    it('setWatchTriggers returns undefined', () => {
      expect(liveStore.setWatchTriggers('any', {})).toBeUndefined();
    });

    it('setWatchScopeRouting returns undefined', () => {
      expect(liveStore.setWatchScopeRouting('any', {})).toBeUndefined();
    });

    it('setWatchApprovalGate returns undefined', () => {
      expect(liveStore.setWatchApprovalGate('any', 'gate', {})).toBeUndefined();
    });

    it('setWatchWorkerEnabled returns undefined', () => {
      expect(liveStore.setWatchWorkerEnabled('any', 'worker', true)).toBeUndefined();
    });

    it('setWorkerEnabled returns undefined', () => {
      expect(liveStore.setWorkerEnabled('any', true)).toBeUndefined();
    });
  });

  describe('setWatchSkillEnabled()', () => {
    let storeWithAgent: WatchStore;

    beforeEach(() => {
      const management = { getWorkflows } as unknown as WatchWorkflowsManagementClient;
      storeWithAgent = new WatchStore(
        management,
        loggingSystemMock.createLogger(),
        makeAgentBuilder('test-agent', ['alert-triage'])
      );
    });

    it('toggles the per-watch skill attachment and returns settings', async () => {
      getWorkflows.mockResolvedValueOnce({
        results: [makeWorkflowDto('watch-a', { agentId: 'test-agent' })],
      });
      await storeWithAgent.refresh(request, SPACE);

      const result = storeWithAgent.setWatchSkillEnabled('watch-a', 'alert-triage', false);
      expect(result).toBeDefined();
      expect(
        storeWithAgent
          .getWatchSettings('watch-a')
          ?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(false);
    });

    it('preserves the skill attachment state across refreshes', async () => {
      getWorkflows.mockResolvedValue({
        results: [makeWorkflowDto('watch-a', { agentId: 'test-agent' })],
      });
      await storeWithAgent.refresh(request, SPACE);
      storeWithAgent.setWatchSkillEnabled('watch-a', 'alert-triage', false);

      await storeWithAgent.refresh(request, SPACE);
      expect(
        storeWithAgent
          .getWatchSettings('watch-a')
          ?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(false);
    });

    it('returns undefined for a skill not attached to the watch', async () => {
      getWorkflows.mockResolvedValueOnce({
        results: [makeWorkflowDto('watch-a', { agentId: 'test-agent' })],
      });
      await storeWithAgent.refresh(request, SPACE);

      expect(
        storeWithAgent.setWatchSkillEnabled('watch-a', 'unknown-skill', false)
      ).toBeUndefined();
    });

    it('returns undefined for watches with no skill callables', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);

      expect(liveStore.setWatchSkillEnabled('watch-a', 'alert-triage', false)).toBeUndefined();
    });
  });

  describe('skill catalog', () => {
    it('listSkills returns empty when watches have no skill callables', async () => {
      getWorkflows.mockResolvedValueOnce({ results: [makeWorkflowDto('watch-a')] });
      await liveStore.refresh(request, SPACE);
      expect(liveStore.listSkills()).toEqual([]);
    });

    it('setSkillEnabled returns undefined when there are no skills', () => {
      expect(liveStore.setSkillEnabled('nope', false)).toBeUndefined();
    });
  });
});
