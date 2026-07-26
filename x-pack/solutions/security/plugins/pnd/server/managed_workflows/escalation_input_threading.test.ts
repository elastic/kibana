/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * L0 regression guard for bugs #9 and #10 (fixed 2026-07-26, commit 86af5ff0c3cf).
 *
 * Bug #9: Dark/Deep Watch's `run_dark_worker`/`run_deep_worker` steps read
 * `event.escalation` for their nested worker's escalation payload. A
 * `workflow.execute`-invoked child only ever populates `context.inputs` on
 * itself, never `context.event` (event.* is exclusively for event-driven
 * triggers). Every `event.escalation` read silently evaluated to undefined,
 * and a `{{ }}` (bare, string-only) template on the resulting object value
 * serialized it as the literal string "[object Object]" instead of using the
 * `${{ }}` (raw-value) template that preserves object type end to end.
 *
 * Bug #10: Detection Watch's two reactive routes (`route_rule_creation`,
 * `route_rule_tuning`) gated on `event.detectionChangeSignal` /
 * `event.ruleTuningTrigger` for the exact same reason — Detection Watch is
 * always invoked via `workflow.execute` (from Dark/Deep's escalation step or
 * Floor's tuning-trigger step), so both routes were dead code end-to-end
 * despite receiving a real payload in `inputs.*`.
 *
 * This suite is deliberately a static YAML/text assertion, not a live
 * execution test: it is meant to fail loudly and immediately (no ES/Kibana
 * required) the moment someone reintroduces an `event.*` read or a bare
 * `{{ }}` template on an object-typed escalation/signal field in any of the
 * five Watch orchestrator YAMLs. Live end-to-end proof that the fix threads
 * one investigationId through Floor->Dark->Deep->Detection lives in the
 * kbn-evals composite-pipeline spec (see watch_escalation_chain eval suite);
 * this file is the cheap, deterministic, every-PR tripwire for the same
 * regression class.
 */

import * as fs from 'fs';
import * as path from 'path';

const YAML_DIR = path.resolve(
  __dirname,
  '../../../../../../../src/platform/packages/shared/kbn-workflows/managed/definitions/pnd'
);

const readYamlText = (name: string) => fs.readFileSync(path.join(YAML_DIR, name), 'utf8');

/**
 * Extract the raw template expression bound to a given YAML key on a single
 * logical line, e.g. for `investigationId: '{{ foo }}'` returns `{{ foo }}`.
 * Deliberately text-based (not a YAML/AST parse) because the bug class is a
 * templating-string mistake, not a structural one — we want to catch the
 * exact bytes a workflow author writes.
 */
function extractTemplateExpressions(yamlText: string, key: string): string[] {
  const lineRegex = new RegExp(`^\\s*${key}:\\s*(.+)$`, 'gm');
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = lineRegex.exec(yamlText)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

/** True when a template reads from `event.*` — the bug #9/#10 root cause. */
function readsFromEvent(expr: string): boolean {
  return /\bevent\.[a-zA-Z_]/.test(expr);
}

/** True when a template reads from `inputs.*` or `trigger.context` (the fix). */
function readsFromInputsOrTrigger(expr: string): boolean {
  return /\binputs\.[a-zA-Z_]/.test(expr) || /\btrigger\.context\b/.test(expr);
}

/**
 * True when an expression uses the bare `{{ }}` (stringifying) template
 * delimiter rather than `${{ }}` (raw-value, type-preserving) for a value
 * that is bound to an object-typed field. Bare `{{ }}` on an object renders
 * "[object Object]" — exactly the bug #9 symptom.
 */
function usesBareBraces(expr: string): boolean {
  return /^\{\{.*\}\}$/.test(expr) && !expr.startsWith('${{');
}

function usesRawValueBraces(expr: string): boolean {
  return /^\$\{\{.*\}\}$/.test(expr);
}

describe('Watch escalation input threading — regression guard (bugs #9, #10)', () => {
  describe('Bug #9 — Dark/Deep Watch escalation input must read inputs.*, never event.*', () => {
    it.each([
      ['watch_dark_orchestrator.yaml', 'escalation'],
      ['watch_deep_orchestrator.yaml', 'escalation'],
    ])('%s: the `escalation` field passed to workflow.execute avoids event.*', (file, key) => {
      const text = readYamlText(file);
      const exprs = extractTemplateExpressions(text, key);
      expect(exprs.length).toBeGreaterThan(0);

      for (const expr of exprs) {
        expect(readsFromEvent(expr)).toBe(false);
      }
    });

    it.each(['watch_dark_orchestrator.yaml', 'watch_deep_orchestrator.yaml'])(
      '%s: at least one escalation input read comes from inputs.* or trigger.context (the fix)',
      (file) => {
        const text = readYamlText(file);
        const exprs = extractTemplateExpressions(text, 'escalation');
        expect(exprs.some(readsFromInputsOrTrigger)).toBe(true);
      }
    );

    it.each(['watch_dark_orchestrator.yaml', 'watch_deep_orchestrator.yaml'])(
      '%s: the escalation input uses raw-value ${{ }} templating, never bare {{ }} (object-typed field)',
      (file) => {
        const text = readYamlText(file);
        const exprs = extractTemplateExpressions(text, 'escalation').filter(
          (e) => e.includes('inputs.escalation') || e.includes('trigger.context')
        );
        expect(exprs.length).toBeGreaterThan(0);
        for (const expr of exprs) {
          // The escalation payload is an object (fromWatch/toWatch/investigationId/...);
          // a bare {{ }} would stringify it to "[object Object]".
          expect(usesBareBraces(expr)).toBe(false);
        }
      }
    );
  });

  describe('Bug #10 — Detection Watch reactive routes must gate on inputs.*, never event.*', () => {
    const DETECTION_FILE = 'watch_detection_orchestrator.yaml';

    it('route_rule_creation condition reads inputs.detectionChangeSignal, not event.*', () => {
      const text = readYamlText(DETECTION_FILE);
      const conditionMatch = text.match(/condition:\s*'([^']*detectionChangeSignal[^']*)'/);
      expect(conditionMatch).not.toBeNull();
      const condition = conditionMatch![1];

      expect(readsFromEvent(condition)).toBe(false);
      expect(condition.includes('inputs.detectionChangeSignal')).toBe(true);
    });

    it('route_rule_tuning condition reads inputs.ruleTuningTrigger, not event.*', () => {
      const text = readYamlText(DETECTION_FILE);
      const conditionMatch = text.match(/condition:\s*'([^']*ruleTuningTrigger[^']*)'/);
      expect(conditionMatch).not.toBeNull();
      const condition = conditionMatch![1];

      expect(readsFromEvent(condition)).toBe(false);
      expect(condition.includes('inputs.ruleTuningTrigger')).toBe(true);
    });

    it('neither reactive route condition references event.* anywhere in the file', () => {
      // Belt-and-braces: scan every `condition:` line in the file, not just the
      // two we know about, so a future third route can't reintroduce the bug.
      const text = readYamlText(DETECTION_FILE);
      const conditionLines = text.split('\n').filter((line) => /^\s*condition:/.test(line));
      expect(conditionLines.length).toBeGreaterThanOrEqual(2);
      for (const line of conditionLines) {
        expect(readsFromEvent(line)).toBe(false);
      }
    });
  });

  describe('Cross-cutting: investigationId propagation uses correct templating shape', () => {
    // investigationId is a plain string field (unlike escalation/detectionChangeSignal,
    // which are objects) -- bare {{ }} is *correct* here, this test documents why the
    // two field classes are templated differently rather than assuming one rule fits all.
    it.each([
      'watch_dark_orchestrator.yaml',
      'watch_deep_orchestrator.yaml',
      'watch_detection_orchestrator.yaml',
    ])('%s: every investigationId template avoids event.*', (file) => {
      const text = readYamlText(file);
      const exprs = extractTemplateExpressions(text, 'investigationId');
      expect(exprs.length).toBeGreaterThan(0);
      for (const expr of exprs) {
        expect(readsFromEvent(expr)).toBe(false);
      }
    });
  });

  describe('Sanity: the extraction helpers themselves catch the historical bug shape', () => {
    // Meta-test: prove the detectors used above actually flag the exact broken
    // lines this fix replaced, so a future refactor of the detectors can't
    // silently stop catching the regression.
    it('readsFromEvent flags the historical broken pattern', () => {
      expect(readsFromEvent('{{ event.escalation }}')).toBe(true);
      expect(readsFromEvent("'{{ event.detectionChangeSignal.sourceWatch }}:*'")).toBe(true);
    });

    it('readsFromEvent does not flag the fixed pattern', () => {
      expect(readsFromEvent('${{ inputs.escalation | default: trigger.context }}')).toBe(false);
      expect(readsFromEvent('inputs.detectionChangeSignal.sourceWatch:*')).toBe(false);
    });

    it('usesBareBraces flags the historical [object Object]-producing pattern', () => {
      expect(usesBareBraces('{{ inputs.escalation }}')).toBe(true);
    });

    it('usesRawValueBraces recognizes the fixed raw-value pattern', () => {
      expect(usesRawValueBraces('${{ inputs.escalation | default: trigger.context }}')).toBe(true);
      expect(usesBareBraces('${{ inputs.escalation | default: trigger.context }}')).toBe(false);
    });
  });
});
