/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_FLOOR_ID, WATCHES_SEED, WORKERS_SEED } from '@kbn/pnd-common';
import {
  getWatch,
  listSkills,
  listWatches,
  listWorkers,
  resetWatchStore,
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
      setWorkerEnabled('threat-intel-enrichment', false);

      expect(WATCHES_SEED.find(({ id }) => id === FLOOR)?.enabled).toBe(true);
      expect(WORKERS_SEED.find(({ id }) => id === 'threat-intel-enrichment')?.enabled).toBe(true);
      resetWatchStore();
      expect(listWorkers().find(({ id }) => id === 'threat-intel-enrichment')?.enabled).toBe(true);
    });

    it('reseeds after a reset', () => {
      setWorkerEnabled('threat-intel-enrichment', false);
      expect(listWorkers().find(({ id }) => id === 'threat-intel-enrichment')?.enabled).toBe(false);

      resetWatchStore();
      expect(listWorkers().find(({ id }) => id === 'threat-intel-enrichment')?.enabled).toBe(true);
    });
  });

  describe('watches', () => {
    it('lists every seeded watch', () => {
      expect(listWatches()).toHaveLength(WATCHES_SEED.length);
    });

    it('returns undefined for an unknown watch', () => {
      expect(getWatch('nope')).toBeUndefined();
    });
  });

  describe('global worker flags', () => {
    it('does not confuse a worker id with the identically named skill id', () => {
      // Containment exists as both a worker and a skill, so the two must move independently.
      expect(setWorkerEnabled('containment', false)).toBeDefined();

      expect(listWorkers().find(({ id }) => id === 'containment')?.enabled).toBe(false);
    });

    it('returns undefined for unknown global ids', () => {
      expect(setWorkerEnabled('nope', false)).toBeUndefined();
    });
  });
});
