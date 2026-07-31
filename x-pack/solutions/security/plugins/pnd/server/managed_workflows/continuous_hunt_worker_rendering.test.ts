/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yamlLib from 'yaml';

import { getManagedWorkflowDefinitions } from '@kbn/workflows/managed';
import { PND_WATCH_WORKFLOW_IDS } from './install_static';

const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);
const loadYaml = (name: string) =>
  yamlLib.parse(fs.readFileSync(path.join(YAML_DIR, name), 'utf8')) as any;

/**
 * L0 schema/contract coverage for the Dark Watch Continuous Threat Hunt Worker
 * (lifted from the Black Hat continuous-hunt POC, kibana#278905, per the Dark
 * Watch MVP slice). Asserts the workflow parses, the candidate-selection
 * predicate carries the cooldown + IOC/behavior filters, the per-report hunt
 * invokes the internal hunt_orchestrator with the product-default Tier 2
 * gating, and the emitted WorkerRun is typed as a watch-dark
 * continuous_threat_hunt run.
 */
describe('watch dark continuous hunt worker rendering', () => {
  const doc = loadYaml('watch_dark_continuous_hunt_worker.yaml');
  const steps = doc.steps as any[];
  const byName = (n: string) => steps.find((s: any) => s.name === n);

  it('parses as a workflow with the expected step graph', () => {
    expect(doc.version).toBe('1');
    expect(steps.map((s: any) => `${s.name}:${s.type}`)).toEqual([
      'watch_policy:data.set',
      'load_hunt_candidates:elasticsearch.search',
      'hunt_each_report:foreach',
      'worker_output:data.set',
    ]);
  });

  it('candidate selection carries the IOC/behavior filter and the hunt cooldown', () => {
    const search = byName('load_hunt_candidates');
    expect(search).toBeDefined();
    expect(search.with.index).toBe('.kibana-threat-reports');
    expect(search.with.size).toBe(10);

    const q = search.with.query;
    // At least one IOC or behavior technique is required (minimum_should_match: 1).
    const shouldClauses = q.bool.filter[0].bool.should;
    expect(q.bool.filter[0].bool.minimum_should_match).toBe(1);
    const paths = shouldClauses.map((c: any) => c.nested.path).sort();
    expect(paths).toEqual(['extracted.behaviors', 'extracted.iocs']);

    // Cooldown: skip reports hunted within the cadence window.
    const mustNot = q.bool.must_not[0].range['feedback.last_hunted_at'];
    expect(mustNot.gte).toBe('now-4h');

    // Ranked by corroborated rank score first.
    expect(search.with.sort[0]).toHaveProperty('corroborated_rank_score');
  });

  it('per-report hunt invokes the internal hunt_orchestrator with on_hits Tier 2 gating', () => {
    const foreach = byName('hunt_each_report');
    expect(foreach).toBeDefined();
    expect(foreach.foreach).toContain('load_hunt_candidates');

    const hunt = (foreach.steps as any[]).find((s: any) => s.name === 'run_hunt_orchestrator');
    expect(hunt).toBeDefined();
    expect(hunt.type).toBe('kibana.request');
    expect(hunt.with.path).toBe('/api/threat_intelligence/hunt_orchestrator');
    // Product default is `on_hits` (`always` is for demo reliability only — mvp-slice.md).
    expect(hunt.with.body.tier2_when).toBe('on_hits');
    expect(hunt.with.body.report_id).toContain('foreach.item._id');
    // A single report's failure must not kill the batch.
    expect(hunt['on-failure'].continue).toBe(true);
  });

  it('emits a typed watch-dark continuous_threat_hunt WorkerRun with a threat-intelligence allowlist', () => {
    const policy = byName('watch_policy');
    expect(policy.with.watch.skill_allowlist).toEqual(['threat-intelligence']);

    const out = byName('worker_output');
    expect(out).toBeDefined();
    expect(out.with.workerRun.watch).toBe('watch-dark');
    expect(out.with.workerRun.workerKind).toBe('continuous_threat_hunt');
    expect(out.with.workerRun.candidateCount).toContain('load_hunt_candidates');
  });

  /**
   * Regression guard for a real live-boot failure: a workflow listed in
   * `PND_WATCH_WORKFLOW_IDS` (what `installStatic` iterates) but missing from
   * the platform's `managedWorkflowDefinitions` registry installs nothing and
   * fails at runtime with `Unknown managed workflow id: <id>`. The two lists
   * live in different files, so membership in one does not imply the other.
   * Every installable PND watch id must resolve to a registered definition.
   */
  it('every installable PND watch id is registered in the managed-workflow registry', () => {
    const ids = PND_WATCH_WORKFLOW_IDS as readonly string[];
    const registeredIds = new Set(getManagedWorkflowDefinitions().map((d) => d.id as string));
    const unregistered = ids.filter((id) => !registeredIds.has(id));
    expect(unregistered).toEqual([]);
    expect(ids).toContain('system-security-watch-dark-continuous-hunt-worker');
  });
});
