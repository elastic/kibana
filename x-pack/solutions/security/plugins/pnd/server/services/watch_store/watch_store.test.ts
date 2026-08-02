/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCHES_SEED, WATCH_SETTINGS_SEED } from '@kbn/pnd-common';
import * as watchStore from './watch_store';
import {
  getWatch,
  getWatchSettings,
  listSkills,
  listWatches,
  resetWatchStore,
  setSkillEnabled,
  setWatchEnabled,
  setWatchScopeRouting,
  setWatchSkillsEnabled,
  setWatchTriggers,
} from './watch_store';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;

describe('watch store', () => {
  beforeEach(() => {
    resetWatchStore();
  });

  describe('seeding', () => {
    it('stamps relative seed offsets as absolute timestamps', () => {
      const skill = listSkills().find(({ id }) => id === 'alert-triage');
      // Seeded relative to now, so it must parse as a date close to but before now.
      expect(Date.parse(skill!.lastRun!)).toBeLessThanOrEqual(Date.now());
      expect(Date.parse(skill!.lastRun!)).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
    });

    it('leaves lastRun null when the seed has never run', () => {
      expect(listSkills().find(({ id }) => id === 'virustotal-lookup')?.lastRun).toBeNull();
    });

    it('does not mutate the shared seed constants', () => {
      setWatchEnabled(FLOOR, false);
      setSkillEnabled('alert-triage', false);

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

  describe('autonomy — deliberately not writable here', () => {
    it('exports no autonomy writer', () => {
      // The one writer is `PUT /internal/pnd/autonomy`, gated on `pnd_manage_autonomy`. A writer here
      // would be reachable through `PATCH /internal/pnd/watches/{watchId}`, which carries only
      // `pnd_write`, so it would launder an autonomy raise past the privilege that gates it.
      expect(Object.keys(watchStore).filter((name) => /autonomy/i.test(name))).toEqual([]);
    });

    it('still seeds autonomy as a readable projection field', () => {
      expect(getWatchSettings(FLOOR)?.autonomy).toBe(WATCH_SETTINGS_SEED[FLOOR].autonomy);
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

  describe('approval gates — deliberately not writable here (bead kibana-phf4.33)', () => {
    /**
     * The 2026-08-10 design deleted the Approval gates section of the Watch settings page, which was
     * the only surface these rows ever had, so the writer went with it — `setWatchApprovalGates` and
     * the `alwaysGate` / `requirementLocked` / `in-scope` refusals it carried are gone, and
     * `PATCH /internal/pnd/watches/{watchId}` rejects the field instead (see `watches_service.test.ts`).
     *
     * ⛔ D15 is untouched by that. It is enforced in three places that remain, each with its own
     * assertions: `alwaysGate` in `PND_GATE_REGISTRY` (`gate_registry/index.test.ts`), the absence of
     * an `if` wrapper around `await_incident_contained` / `await_apply_tuning` in the watch YAML
     * (`managed_workflow_drift.test.ts`), and `_auto_respond`'s unconditional refusal of both
     * (`partition_auto_respondable_gates/index.test.ts`, `pnd_security_regression.test.ts`).
     */
    it('exports no approval-gate writer', () => {
      expect(Object.keys(watchStore).filter((name) => /approvalgate/i.test(name))).toEqual([]);
    });

    it('seeds no approval gates for any watch either', () => {
      expect(Object.values(WATCH_SETTINGS_SEED).filter((seed) => 'approvalGates' in seed)).toEqual(
        []
      );
    });
  });

  describe('global flags versus per-watch attachments (skills)', () => {
    it('keeps the per-watch attachment independent of the global flag', () => {
      expect(setSkillEnabled('alert-triage', false)).toBeDefined();

      // The global flag flipped, but Watch Floor's attachment is untouched — the UI ANDs the two.
      expect(listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(false);
      expect(
        getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(true);
    });

    it('leaves the global flag alone when a per-watch attachment is toggled', () => {
      expect(
        setWatchSkillsEnabled(FLOOR, [{ enabled: false, skillId: 'alert-triage' }])
      ).toBeDefined();

      expect(listSkills().find(({ id }) => id === 'alert-triage')?.enabled).toBe(true);
      expect(
        getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(false);
    });

    it('rejects toggling an entity the watch does not attach', () => {
      expect(
        setWatchSkillsEnabled(FLOOR, [{ enabled: false, skillId: 'escalation' }])
      ).toBeUndefined();
    });

    it('toggles several attachments in one call, which is what one Save sends', () => {
      setWatchSkillsEnabled(FLOOR, [
        { enabled: false, skillId: 'alert-triage' },
        { enabled: false, skillId: 'dark-web-feeds' },
      ]);

      expect(
        getWatchSettings(FLOOR)
          ?.skills?.filter(({ enabled }) => !enabled)
          .map(({ skillId }) => skillId)
      ).toEqual(['alert-triage', 'dark-web-feeds']);
    });

    it('leaves an attached skill untouched when a sibling entry is not attached', () => {
      setWatchSkillsEnabled(FLOOR, [
        { enabled: false, skillId: 'alert-triage' },
        { enabled: false, skillId: 'escalation' },
      ]);

      expect(
        getWatchSettings(FLOOR)?.skills?.find(({ skillId }) => skillId === 'alert-triage')?.enabled
      ).toBe(true);
    });

    it('returns undefined for unknown global ids', () => {
      expect(setSkillEnabled('nope', false)).toBeUndefined();
    });
  });

  describe('workers — deliberately not stored here', () => {
    it('exports no worker reader or writer', () => {
      // A worker is a read-only projection of an `ai.agent` step (kibana-phf4.6), built by
      // `project_workers.ts` from the managed definitions. A writer here would back a flag nothing
      // consults at execution time, so it would report a change it never made.
      expect(Object.keys(watchStore).filter((name) => /worker/i.test(name))).toEqual([]);
    });

    it('seeds no per-watch worker attachment either', () => {
      expect(Object.values(WATCH_SETTINGS_SEED).filter((seed) => 'workers' in seed)).toEqual([]);
    });
  });
});
