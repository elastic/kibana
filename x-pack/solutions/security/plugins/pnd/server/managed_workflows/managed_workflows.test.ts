/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_WATCH_WORKFLOW_IDS } from '@kbn/workflows/managed';
import { projectWorkflowToWatch } from '../services/watches/project_watch';
import * as yamlLib from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

// Load watch YAMLs directly from disk (Jest imports .yaml as raw string, not parsed).
const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);
const loadYaml = (name: string) =>
  yamlLib.parse(fs.readFileSync(path.join(YAML_DIR, name), 'utf8')) as any;

const WATCH_FLOOR_YAML = loadYaml('watch_floor.yaml');
const WATCH_DARK_YAML = loadYaml('watch_dark.yaml');
const WATCH_DEEP_YAML = loadYaml('watch_deep.yaml');
const WATCH_OFFICER_YAML = loadYaml('watch_officer.yaml');

const ALL_YAMLS = [
  { id: 'system-security-watch-floor', name: 'Watch Floor', yaml: WATCH_FLOOR_YAML },
  { id: 'system-security-watch-dark', name: 'Dark Watch', yaml: WATCH_DARK_YAML },
  { id: 'system-security-watch-deep', name: 'Deep Watch', yaml: WATCH_DEEP_YAML },
  { id: 'system-security-watch-officer', name: 'Watch Officer', yaml: WATCH_OFFICER_YAML },
];

const makeItem = (id: string, name: string, yaml: any) => ({
  id,
  name,
  description: '',
  enabled: true,
  managed: true,
  managedBy: 'pnd',
  definition: yaml,
  tags: ['watch'],
  history: [],
});

describe('PND managed watch workflows', () => {
  it('registers exactly 4 watch IDs', () => {
    expect(PND_WATCH_WORKFLOW_IDS).toHaveLength(4);
  });

  it('all YAMLs parse with valid name', () => {
    for (const { name, yaml } of ALL_YAMLS) {
      expect(yaml.name).toBeTruthy();
      expect(typeof yaml.name).toBe('string');
    }
  });

  it('all YAMLs have at least one step', () => {
    for (const { name, yaml } of ALL_YAMLS) {
      expect(yaml.steps.length).toBeGreaterThan(0);
    }
  });

  // ── Watch Floor ─────────────────────────────────────────────────────────

  describe('Watch Floor', () => {
    const watch = projectWorkflowToWatch(
      makeItem('system-security-watch-floor', 'Watch Floor', WATCH_FLOOR_YAML) as any
    );

    it('projects alert-analysis skill in callables', () => {
      const skillIds = watch.callables.map((c) => c.id);
      expect(skillIds).toContain('alert-analysis');
    });

    it('has event trigger (alert-driven)', () => {
      const types = watch.triggers.map((t) => t.type);
      expect(types).toContain('event');
    });

    it('schedule mode is always (alert-driven, no sweep)', () => {
      expect(watch.schedule.mode).toBe('always');
    });
  });

  // ── Dark Watch ──────────────────────────────────────────────────────────

  describe('Dark Watch', () => {
    const watch = projectWorkflowToWatch(
      makeItem('system-security-watch-dark', 'Dark Watch', WATCH_DARK_YAML) as any
    );

    it('projects threat-intelligence skill in callables', () => {
      const skillIds = watch.callables.map((c) => c.id);
      expect(skillIds).toContain('threat-intelligence');
    });

    it('has scheduled trigger', () => {
      const types = watch.triggers.map((t) => t.type);
      expect(types).toContain('schedule');
    });

    it('schedule mode is window (scheduled sweep)', () => {
      expect(watch.schedule.mode).toBe('window');
    });

    it('cadence is sweep', () => {
      expect(watch.schedule.cadence).toBe('sweep');
    });
  });

  // ── Deep Watch ──────────────────────────────────────────────────────────

  describe('Deep Watch', () => {
    const watch = projectWorkflowToWatch(
      makeItem('system-security-watch-deep', 'Deep Watch', WATCH_DEEP_YAML) as any
    );

    it('projects deep-watch-forensics skill in callables', () => {
      const skillIds = watch.callables.map((c) => c.id);
      expect(skillIds).toContain('deep-watch-forensics');
    });

    it('has manual trigger (on-demand)', () => {
      const types = watch.triggers.map((t) => t.type);
      expect(types).toContain('manual');
    });

    it('schedule mode is not always (not alert-driven)', () => {
      expect(watch.schedule.mode).not.toBe('always');
    });

    it('is draft (not yet scheduled)', () => {
      expect(watch.schedule.set).toBe(false);
    });
  });

  // ── Watch Officer ───────────────────────────────────────────────────────

  describe('Watch Officer', () => {
    it('yaml parses with valid name', () => {
      expect(WATCH_OFFICER_YAML.name).toBeTruthy();
    });

    it('has at least one step', () => {
      expect(WATCH_OFFICER_YAML.steps.length).toBeGreaterThan(0);
    });
  });

  // ── Cross-watch consistency ──────────────────────────────────────────────

  describe('cross-watch consistency', () => {
    const allWatches = ALL_YAMLS.map(({ id, name, yaml }) =>
      projectWorkflowToWatch(makeItem(id, name, yaml) as any)
    );

    it('all watches have unique IDs', () => {
      const ids = allWatches.map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all watches have non-empty mandate', () => {
      for (const w of allWatches) {
        expect(w.mandate.length).toBeGreaterThan(0);
      }
    });

    it('all watches have tag=watch', () => {
      for (const w of allWatches) {
        expect(w.tags).toContain('watch');
      }
    });

    it('all watches have autonomyLevel between 1 and 5', () => {
      for (const w of allWatches) {
        expect(w.autonomyLevel).toBeGreaterThanOrEqual(1);
        expect(w.autonomyLevel).toBeLessThanOrEqual(5);
      }
    });

    it('Deep Watch and Dark Watch have distinct skills', () => {
      const deep = allWatches.find((w) => w.id === 'system-security-watch-deep')!;
      const dark = allWatches.find((w) => w.id === 'system-security-watch-dark')!;
      const deepSkills = deep.callables.map((c) => c.id);
      const darkSkills = dark.callables.map((c) => c.id);
      expect(deepSkills).not.toEqual(darkSkills);
    });
  });
});
