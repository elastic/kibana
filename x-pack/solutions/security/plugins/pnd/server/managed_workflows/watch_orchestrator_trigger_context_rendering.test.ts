/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yamlLib from 'yaml';

import { WorkflowTemplatingEngine } from '@kbn/workflows-execution-engine/server/templating_engine';

// Load PND orchestrator YAMLs directly from disk (Jest imports .yaml as raw string, not parsed).
const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);
const loadYaml = (name: string) =>
  yamlLib.parse(fs.readFileSync(path.join(YAML_DIR, name), 'utf8')) as any;

/**
 * `buildWorkflowContext` (workflows_execution_engine/server/workflow_context_manager/
 * build_workflow_context.ts) only ever populates `event` / `inputs` / `output` / `workflow` /
 * `consts` / `parent` / `metadata` on the render context — there is no top-level `trigger` key
 * at all. Every `| default: trigger.context...` fallback previously authored into the PND
 * orchestrator YAMLs was therefore dead: Liquid's `default` filter treats an undefined variable
 * reference as falsy and silently renders the primary value (or empty, if that's also absent)
 * without ever surfacing an error. These tests prove the *replacement* fallback path
 * (`inputs.*`) is actually reachable, for each of the 4 orchestrators that carried the bug.
 */
describe('PND orchestrator dead trigger.context fallback fix', () => {
  const engine = new WorkflowTemplatingEngine();

  it('watch_floor_orchestrator: alertId + investigationId fall back to inputs.alertId when event.alerts is empty', () => {
    const doc = loadYaml('watch_floor_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_floor_worker');
    expect(step).toBeDefined();

    // Manual/on-demand path: no real alert-trigger event, alertId supplied via inputs instead.
    const renderContext = { event: {}, inputs: { alertId: 'manual-alert-42' } };
    const rendered = engine.render(step.with.inputs, renderContext);

    expect(rendered.alertId).toBe('manual-alert-42');
    expect(rendered.investigationId).toBe('inv-floor-manual-alert-42');
  });

  it('watch_floor_orchestrator: alert-trigger event.alerts[0]._id still takes priority over inputs.alertId', () => {
    const doc = loadYaml('watch_floor_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_floor_worker');

    const renderContext = {
      event: { alerts: [{ _id: 'real-alert-1' }] },
      inputs: { alertId: 'should-not-be-used' },
    };
    const rendered = engine.render(step.with.inputs, renderContext);

    expect(rendered.alertId).toBe('real-alert-1');
    expect(rendered.investigationId).toBe('inv-floor-real-alert-1');
  });

  it('watch_dark_orchestrator: escalation reads from inputs.escalation (child invocation via workflow.execute)', () => {
    const doc = loadYaml('watch_dark_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_dark_worker');
    expect(step).toBeDefined();

    const escalation = { fromWatch: 'watch-floor', toWatch: 'watch-dark', confidence: 0.9 };
    const rendered = engine.render(step.with.inputs, { inputs: { escalation } });

    expect(rendered.escalation).toEqual(escalation);
  });

  it('watch_deep_orchestrator: escalation reads from inputs.escalation (child invocation via workflow.execute)', () => {
    const doc = loadYaml('watch_deep_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_deep_worker');
    expect(step).toBeDefined();

    const escalation = { fromWatch: 'watch-dark', toWatch: 'watch-deep', confidence: 0.85 };
    const rendered = engine.render(step.with.inputs, { inputs: { escalation } });

    expect(rendered.escalation).toEqual(escalation);
  });

  it('watch_ad_continuation_orchestrator: discovery falls back to inputs.discovery when event.discovery is absent', () => {
    const doc = loadYaml('watch_ad_continuation_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_ad_continuation_worker');
    expect(step).toBeDefined();

    const discovery = { id: 'discovery-1', title: 'Lateral movement pattern' };
    const rendered = engine.render(step.with.inputs, { event: {}, inputs: { discovery } });

    expect(rendered.discovery).toEqual(discovery);
  });

  it('watch_ad_continuation_orchestrator: event.discovery still takes priority over inputs.discovery', () => {
    const doc = loadYaml('watch_ad_continuation_orchestrator.yaml');
    const step = (doc.steps as any[]).find((s: any) => s.name === 'run_ad_continuation_worker');

    const eventDiscovery = { id: 'from-event' };
    const rendered = engine.render(step.with.inputs, {
      event: { discovery: eventDiscovery },
      inputs: { discovery: { id: 'should-not-be-used' } },
    });

    expect(rendered.discovery).toEqual(eventDiscovery);
  });

  it('none of the 4 fixed orchestrator YAMLs still reference the dead trigger.context path in a live template expression', () => {
    const files = [
      'watch_floor_orchestrator.yaml',
      'watch_dark_orchestrator.yaml',
      'watch_deep_orchestrator.yaml',
      'watch_ad_continuation_orchestrator.yaml',
    ];
    // Comments are allowed to still mention `trigger.context` as historical context for why it
    // was removed — only a live `{{ ... }}` / `${{ ... }}` Liquid expression referencing it would
    // be a regression (silently rendering empty again).
    const liveTemplatePattern = /[$]?\{\{[^}]*trigger\.context[^}]*\}\}/;
    for (const file of files) {
      const raw = fs.readFileSync(path.join(YAML_DIR, file), 'utf8');
      const codeOnly = raw
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
      expect(codeOnly).not.toMatch(liveTemplatePattern);
    }
  });
});
