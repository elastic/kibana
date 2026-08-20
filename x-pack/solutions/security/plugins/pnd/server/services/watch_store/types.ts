/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  Watch,
  WatchApprovalGate,
  WatchAutonomyLevel,
  WatchSettings,
  WatchSkill,
  WatchWorker,
} from '@kbn/pnd-common';

export interface WatchTriggersPatch {
  scheduleId?: string;
  allowManualRun?: boolean;
}

const SCOPE_ROUTING_SELECTS = ['dataSources', 'assigneeQueue', 'escalationContact'] as const;
export type WatchScopeRoutingPatch = Partial<
  Record<(typeof SCOPE_ROUTING_SELECTS)[number], string>
>;

export interface IWatchStore {
  /** Unconditionally re-fetches/re-seeds, updates in-memory state, and returns the watch list. */
  refresh(request: KibanaRequest, spaceId: string): Promise<Watch[]>;
  /** No-op when already populated; otherwise delegates to refresh. */
  ensurePopulated(request: KibanaRequest, spaceId: string): Promise<void>;

  listWatches(): Watch[];
  getWatch(watchId: string): Watch | undefined;
  setWatchEnabled(watchId: string, enabled: boolean): Watch | undefined;

  getWatchSettings(watchId: string): WatchSettings | undefined;
  setWatchAutonomy(watchId: string, level: WatchAutonomyLevel): WatchSettings | undefined;
  setWatchTriggers(watchId: string, patch: WatchTriggersPatch): WatchSettings | undefined;
  setWatchScopeRouting(watchId: string, patch: WatchScopeRoutingPatch): WatchSettings | undefined;
  setWatchApprovalGate(
    watchId: string,
    gateId: string,
    patch: Partial<Pick<WatchApprovalGate, 'requirement' | 'approverRoleId'>>
  ): WatchSettings | undefined;
  setWatchWorkerEnabled(
    watchId: string,
    workerId: string,
    enabled: boolean
  ): WatchSettings | undefined;
  setWatchSkillEnabled(
    watchId: string,
    skillId: string,
    enabled: boolean
  ): WatchSettings | undefined;

  /** Projects WatchSkill[] for a single watch, merged with the existing skill catalog. */
  projectSkillsForWatch(watch: Watch): WatchSkill[];
  listSkills(): WatchSkill[];
  setSkillEnabled(skillId: string, enabled: boolean): WatchSkill | undefined;

  /** Worker catalog — populated in mock mode only; live returns empty. */
  listWorkers(): WatchWorker[];
  setWorkerEnabled(workerId: string, enabled: boolean): WatchWorker | undefined;
}

export interface WatchStoreState {
  watches: Watch[];
  settingsByWatchId: Map<string, WatchSettings>;
  workers?: WatchWorker[];
  skills: WatchSkill[];
}
