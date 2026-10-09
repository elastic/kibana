/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCHES_SEED, WATCH_SETTINGS_SEED } from '@kbn/pnd-common';
import {
  getWatch,
  getWatchSettings,
  listSkills,
  listWatches,
  listWorkers,
  resetWatchStore,
  setSkillEnabled,
  setWatchApprovalGate,
  setWatchAutonomy,
  setWatchEnabled,
  setWatchScopeRouting,
  setWatchSkillEnabled,
  setWatchTriggers,
  setWatchWorkerEnabled,
  setWorkerEnabled,
} from './watch_store';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;

describe('watch store', () => {
  beforeEach(() => {
    resetWatchStore();
  });

  describe('seeding', () => {
    it('stamps relative seed offsets as absolute timestamps', () => {
      const worker = listWorkers().find(({ id }) => id === 'threat-intel-enrichment');
      // Seeded at 4 minutes ago, so it must parse as a date close to but before now.
      expect(Date.parse(worker!.lastRun!)).toBeLessThanOrEqual(Date.now());
      expect(Date.parse(worker!.lastRun!)).toBeGreaterThan(Date.now() - 10 * 60 * 1000);
    });

    it('leaves lastRun null when the seed has never run', () => {
      expect(listSkills().find(({ id }) => id === 'virustotal-lookup')?.lastRun).toBeNull();
      expect(listWorkers().find(({ id }) => id === 'host-context')?.lastRun).toBeNull();
    });

    it('does not mutate the shared seed constants', () => {
      setWatchEnabled(FLOOR, false);
      setWorkerEnabled('threat-intel-enrichment', false);

      expect(WATCHES_SEED.find(({ id }) => id === FLOOR)?.enabled).toBe(true);
      resetWatchStore();
      expect(getWatch(FLOOR)?.enabled).toBe(true);
    });

    it('reseeds after a reset', () => {
      setWatchEnabled(FLOOR, false);
      expect(getWatch(FLOOR)?.enabled).toBe(false);

      resetWatchStore();
      expect(getWatch(FLOOR)?.enabled).toBe(true);
    });
  });

  describe('watches', () => {
    it('lists every seeded watch', () => {
      expect(listWatches()).toHaveLength(Object.keys(WATCH_SETTINGS_SEED).length);
    });

    it('toggles enabled and reflects it in subsequent reads', () => {
      expect(setWatchEnabled(FLOOR, false)).toBeDefined();
      expect(getWatch(FLOOR)?.enabled).toBe(false);
      expect(listWatches().find(({ id }) => id === FLOOR)?.enabled).toBe(false);
    });

    it('returns undefined for an unknown watch', () => {
      expect(setWatchEnabled('nope', false)).toBeUndefined();
      expect(getWatch('nope')).toBeUndefined();
    });
  });

  describe('autonomy', () => {
    it('accepts any level on the shared scale', () => {
      expect(setWatchAutonomy(FLOOR, 'supervised')).toBeDefined();
      expect(getWatchSettings(FLOOR)?.autonomy).toBe('supervised');
    });

    it('returns undefined for a watch with no settings', () => {
      expect(setWatchAutonomy('nope', 'supervised')).toBeUndefined();
    });
  });

  describe('triggers', () => {
    it('accepts a schedule the watch offers', () => {
      expect(setWatchTriggers(FLOOR, { scheduleId: 'hourly' })).toBeDefined();
      expect(getWatchSettings(FLOOR)?.triggers?.schedule.selectedId).toBe('hourly');
    });

    it('rejects an unknown schedule without touching the stored value', () => {
      const before = getWatchSettings(FLOOR)?.triggers?.schedule.selectedId;

      expect(setWatchTriggers(FLOOR, { scheduleId: 'every-century' })).toBeUndefined();
      expect(getWatchSettings(FLOOR)?.triggers?.schedule.selectedId).toBe(before);
    });

    it('rejects a patch for a watch with no triggers section', () => {
      const settings = getWatchSettings(FLOOR)!;
      delete settings.triggers;

      expect(setWatchTriggers(FLOOR, { allowManualRun: false })).toBeUndefined();
    });
  });

  describe('scope and routing', () => {
    it('accepts offered ids across several selects at once', () => {
      expect(
        setWatchScopeRouting(FLOOR, { dataSources: 'alerts-only', assigneeQueue: 'threat-hunting' })
      ).toBeDefined();

      const { scopeRouting } = getWatchSettings(FLOOR)!;
      expect(scopeRouting?.dataSources.selectedId).toBe('alerts-only');
      expect(scopeRouting?.assigneeQueue.selectedId).toBe('threat-hunting');
    });

    it('rejects an unknown id', () => {
      expect(setWatchScopeRouting(FLOOR, { escalationContact: 'the-void' })).toBeUndefined();
    });
  });

  describe('approval gates', () => {
    it('refuses to weaken a locked gate', () => {
      expect(
        setWatchApprovalGate(FLOOR, 'host-isolation', { requirement: 'in-scope' })
      ).toBeUndefined();

      const gate = getWatchSettings(FLOOR)?.approvalGates?.find(
        ({ id }) => id === 'host-isolation'
      );
      expect(gate?.requirement).toBe('always');
    });

    it('allows changing the requirement of an unlocked gate', () => {
      expect(
        setWatchApprovalGate(FLOOR, 'hunt-execution', { requirement: 'always' })
      ).toBeDefined();

      const gate = getWatchSettings(FLOOR)?.approvalGates?.find(
        ({ id }) => id === 'hunt-execution'
      );
      expect(gate?.requirement).toBe('always');
    });

    it('accepts an approver role the gate offers and rejects one it does not', () => {
      expect(
        setWatchApprovalGate(FLOOR, 'host-isolation', { approverRoleId: 'soc-lead' })
      ).toBeDefined();
      expect(
        setWatchApprovalGate(FLOOR, 'host-isolation', { approverRoleId: 'the-intern' })
      ).toBeUndefined();
    });

    it('rejects an approver role on a gate that takes none', () => {
      expect(
        setWatchApprovalGate(FLOOR, 'evidence-only-investigation', { approverRoleId: 'soc-lead' })
      ).toBeUndefined();
    });

    it('returns undefined for an unknown gate', () => {
      expect(setWatchApprovalGate(FLOOR, 'nope', { requirement: 'always' })).toBeUndefined();
    });
  });

  describe('global flags versus per-watch attachments', () => {
    it('keeps the per-watch attachment independent of the global flag', () => {
      expect(setSkillEnabled('alert-triage', false)).toBeDefined();

      // The global flag flipped, but Watch Floor's attachment is untouched — the UI ANDs the two.
      expect(listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(false);
      expect(
        getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(true);
    });

    it('leaves the global flag alone when a per-watch attachment is toggled', () => {
      expect(setWatchSkillEnabled(FLOOR, 'alert-triage', false)).toBeDefined();

      expect(listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(true);
      expect(
        getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(false);
    });

    it('toggles a worker attachment without touching the global worker flag', () => {
      expect(setWatchWorkerEnabled(FLOOR, 'host-context', true)).toBeDefined();

      expect(listWorkers().find(({ id }) => id === 'host-context')?.enabled).toBe(false);
      expect(
        getWatchSettings(FLOOR)?.workers?.find(({ workerId }) => workerId === 'host-context')
          ?.enabled
      ).toBe(true);
    });

    it('does not confuse a worker id with the identically named skill id', () => {
      // Containment exists as both a worker and a skill, so the two must move independently.
      expect(setWorkerEnabled('containment', false)).toBeDefined();

      expect(listWorkers().find(({ id }) => id === 'containment')?.enabled).toBe(false);
      expect(listSkills().find(({ id }) => id === 'containment')?.enabled).toBe(true);
    });

    it('rejects toggling an entity the watch does not attach', () => {
      expect(setWatchWorkerEnabled(FLOOR, 'rule-tuning', false)).toBeUndefined();
      expect(setWatchSkillEnabled(FLOOR, 'escalation', false)).toBeUndefined();
    });

    it('returns undefined for unknown global ids', () => {
      expect(setWorkerEnabled('nope', false)).toBeUndefined();
      expect(setSkillEnabled('nope', false)).toBeUndefined();
    });
  });
});
