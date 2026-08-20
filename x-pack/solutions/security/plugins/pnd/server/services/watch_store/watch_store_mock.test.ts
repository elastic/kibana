/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCHES_SEED, WATCH_SETTINGS_SEED } from '@kbn/pnd-common';
import { MockWatchStore } from './watch_store_mock';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;

describe('MockWatchStore', () => {
  let store: MockWatchStore;

  beforeEach(() => {
    store = new MockWatchStore();
  });

  describe('seeding', () => {
    it('stamps relative seed offsets as absolute timestamps', () => {
      const worker = store.listWorkers().find(({ id }) => id === 'threat-intel-enrichment');
      // Seeded at 4 minutes ago, so it must parse as a date close to but before now.
      expect(Date.parse(worker!.lastRun!)).toBeLessThanOrEqual(Date.now());
      expect(Date.parse(worker!.lastRun!)).toBeGreaterThan(Date.now() - 10 * 60 * 1000);
    });

    it('leaves lastRun null when the seed has never run', () => {
      expect(store.listSkills().find(({ id }) => id === 'virustotal-lookup')?.lastRun).toBeNull();
      expect(store.listWorkers().find(({ id }) => id === 'host-context')?.lastRun).toBeNull();
    });

    it('does not mutate the shared seed constants', () => {
      store.setWatchEnabled(FLOOR, false);
      store.setWorkerEnabled('threat-intel-enrichment', false);

      expect(WATCHES_SEED.find(({ id }) => id === FLOOR)?.enabled).toBe(true);
      store.reset();
      expect(store.getWatch(FLOOR)?.enabled).toBe(true);
    });

    it('reseeds after a reset', () => {
      store.setWatchEnabled(FLOOR, false);
      expect(store.getWatch(FLOOR)?.enabled).toBe(false);

      store.reset();
      expect(store.getWatch(FLOOR)?.enabled).toBe(true);
    });
  });

  describe('watches', () => {
    it('lists every seeded watch', () => {
      expect(store.listWatches()).toHaveLength(Object.keys(WATCH_SETTINGS_SEED).length);
    });

    it('toggles enabled and reflects it in subsequent reads', () => {
      expect(store.setWatchEnabled(FLOOR, false)).toBeDefined();
      expect(store.getWatch(FLOOR)?.enabled).toBe(false);
      expect(store.listWatches().find(({ id }) => id === FLOOR)?.enabled).toBe(false);
    });

    it('returns undefined for an unknown watch', () => {
      expect(store.setWatchEnabled('nope', false)).toBeUndefined();
      expect(store.getWatch('nope')).toBeUndefined();
    });
  });

  describe('autonomy', () => {
    it('accepts any level on the shared scale', () => {
      expect(store.setWatchAutonomy(FLOOR, 'supervised')).toBeDefined();
      expect(store.getWatchSettings(FLOOR)?.autonomy).toBe('supervised');
    });

    it('returns undefined for a watch with no settings', () => {
      expect(store.setWatchAutonomy('nope', 'supervised')).toBeUndefined();
    });
  });

  describe('triggers', () => {
    it('accepts a schedule the watch offers', () => {
      expect(store.setWatchTriggers(FLOOR, { scheduleId: 'hourly' })).toBeDefined();
      expect(store.getWatchSettings(FLOOR)?.triggers?.schedule.selectedId).toBe('hourly');
    });

    it('rejects an unknown schedule without touching the stored value', () => {
      const before = store.getWatchSettings(FLOOR)?.triggers?.schedule.selectedId;

      expect(store.setWatchTriggers(FLOOR, { scheduleId: 'every-century' })).toBeUndefined();
      expect(store.getWatchSettings(FLOOR)?.triggers?.schedule.selectedId).toBe(before);
    });

    it('rejects a patch for a watch with no triggers section', () => {
      const settings = store.getWatchSettings(FLOOR)!;
      delete settings.triggers;

      expect(store.setWatchTriggers(FLOOR, { allowManualRun: false })).toBeUndefined();
    });
  });

  describe('scope and routing', () => {
    it('accepts offered ids across several selects at once', () => {
      expect(
        store.setWatchScopeRouting(FLOOR, {
          dataSources: 'alerts-only',
          assigneeQueue: 'threat-hunting',
        })
      ).toBeDefined();

      const { scopeRouting } = store.getWatchSettings(FLOOR)!;
      expect(scopeRouting?.dataSources.selectedId).toBe('alerts-only');
      expect(scopeRouting?.assigneeQueue.selectedId).toBe('threat-hunting');
    });

    it('rejects an unknown id', () => {
      expect(store.setWatchScopeRouting(FLOOR, { escalationContact: 'the-void' })).toBeUndefined();
    });
  });

  describe('approval gates', () => {
    it('refuses to weaken a locked gate', () => {
      expect(
        store.setWatchApprovalGate(FLOOR, 'host-isolation', { requirement: 'in-scope' })
      ).toBeUndefined();

      const gate = store
        .getWatchSettings(FLOOR)
        ?.approvalGates?.find(({ id }) => id === 'host-isolation');
      expect(gate?.requirement).toBe('always');
    });

    it('allows changing the requirement of an unlocked gate', () => {
      expect(
        store.setWatchApprovalGate(FLOOR, 'hunt-execution', { requirement: 'always' })
      ).toBeDefined();

      const gate = store
        .getWatchSettings(FLOOR)
        ?.approvalGates?.find(({ id }) => id === 'hunt-execution');
      expect(gate?.requirement).toBe('always');
    });

    it('accepts an approver role the gate offers and rejects one it does not', () => {
      expect(
        store.setWatchApprovalGate(FLOOR, 'host-isolation', { approverRoleId: 'soc-lead' })
      ).toBeDefined();
      expect(
        store.setWatchApprovalGate(FLOOR, 'host-isolation', { approverRoleId: 'the-intern' })
      ).toBeUndefined();
    });

    it('rejects an approver role on a gate that takes none', () => {
      expect(
        store.setWatchApprovalGate(FLOOR, 'evidence-only-investigation', {
          approverRoleId: 'soc-lead',
        })
      ).toBeUndefined();
    });

    it('returns undefined for an unknown gate', () => {
      expect(store.setWatchApprovalGate(FLOOR, 'nope', { requirement: 'always' })).toBeUndefined();
    });
  });

  describe('global flags versus per-watch attachments', () => {
    it('toggles the global skill flag', () => {
      expect(store.setSkillEnabled('alert-triage', false)).toBeDefined();
      expect(store.listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(false);
    });

    it('toggles a per-watch skill flag independently of the global skill flag', () => {
      expect(store.setWatchSkillEnabled(FLOOR, 'alert-triage', false)).toBeDefined();
      // Global flag unchanged
      expect(store.listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(true);
      // Per-watch override stored in settings.skills (WatchSkillAttachment format)
      expect(
        store.getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')
          ?.enabled
      ).toBe(false);
    });

    it('rejects a per-watch skill toggle for a skill not attached to the watch', () => {
      expect(store.setWatchSkillEnabled('nope', 'alert-triage', false)).toBeUndefined();
    });

    it('toggles a worker attachment without touching the global worker flag', () => {
      expect(store.setWatchWorkerEnabled(FLOOR, 'host-context', true)).toBeDefined();

      expect(store.listWorkers().find(({ id }) => id === 'host-context')?.enabled).toBe(false);
      expect(
        store.getWatchSettings(FLOOR)?.workers?.find(({ workerId }) => workerId === 'host-context')
          ?.enabled
      ).toBe(true);
    });

    it('does not confuse a worker id with the identically named skill id', () => {
      // Containment exists as both a worker and a skill, so the two must move independently.
      expect(store.setWorkerEnabled('containment', false)).toBeDefined();

      expect(store.listWorkers().find(({ id }) => id === 'containment')?.enabled).toBe(false);
      expect(store.listSkills().find(({ id }) => id === 'containment')?.enabled).toBe(true);
    });

    it('rejects toggling a worker the watch does not attach', () => {
      expect(store.setWatchWorkerEnabled(FLOOR, 'rule-tuning', false)).toBeUndefined();
    });

    it('returns undefined for unknown global ids', () => {
      expect(store.setWorkerEnabled('nope', false)).toBeUndefined();
      expect(store.setSkillEnabled('nope', false)).toBeUndefined();
    });
  });
});
