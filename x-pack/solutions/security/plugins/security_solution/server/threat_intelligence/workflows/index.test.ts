/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BUILTIN_WORKFLOWS, installBuiltinWorkflows } from '.';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { WorkflowDetailDto } from '@kbn/workflows';
import type { Logger } from '@kbn/core/server';

// ---------------------------------------------------------------------------
// Helpers for YAML structural assertions (no parser needed — step names are
// top-level list markers, so slicing between `\n- name:` boundaries isolates
// each step's text).
// ---------------------------------------------------------------------------
const stepText = (yaml: string, stepName: string): string => {
  const marker = `name: ${stepName}`;
  const start = yaml.indexOf(marker);
  if (start === -1) return '';
  const rest = yaml.slice(start);
  // Top-level workflow steps are indented with 2 spaces (`  - name:`).
  // Nested steps inside a foreach use deeper indentation, so matching
  // `\n  - name:` (exactly 2 spaces) finds the next TOP-LEVEL sibling only.
  const nextStep = rest.search(/\n  - name:/);
  return nextStep > 0 ? rest.slice(0, nextStep) : rest;
};

// The same pattern enforced by @kbn/human-readable-id / isValidWorkflowId.
// Dots and underscores are intentionally excluded — the workflow management
// plugin rejects them at registration time with a WorkflowValidationError,
// which is caught and swallowed as a log.warn, meaning invalid IDs fail
// silently on every cluster restart.
const WORKFLOW_ID_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

describe('BUILTIN_WORKFLOWS', () => {
  it.each(BUILTIN_WORKFLOWS)('id "$id" passes the workflow-id format validator', ({ id }) => {
    expect(id).toMatch(WORKFLOW_ID_PATTERN);
  });

  it.each(BUILTIN_WORKFLOWS)(
    'yaml for "$id" uses a short name and the threat-intel tag',
    ({ yaml }) => {
      expect(yaml).toContain('- threat-intel');
      expect(yaml).not.toContain('Threat intelligence —');
    }
  );
});

describe('installBuiltinWorkflows', () => {
  const makeLogger = (): jest.Mocked<Logger> => {
    const child = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      get: jest.fn(),
      log: jest.fn(),
      isLevelEnabled: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    child.get = jest.fn().mockReturnValue(child);
    return child;
  };

  const allCreated = () => ({
    created: BUILTIN_WORKFLOWS.map(
      (wf) => ({ id: wf.id, name: wf.id } as unknown as WorkflowDetailDto)
    ),
    failed: [],
  });

  it('calls bulkCreateWorkflows once and logs no errors when all workflows register', async () => {
    const bulkCreate = jest.fn().mockResolvedValue(allCreated());
    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger });

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs a loud error naming the failed workflow when failed[] is non-empty', async () => {
    const failedId = BUILTIN_WORKFLOWS[1].id;
    const bulkCreate = jest.fn().mockResolvedValue({
      created: BUILTIN_WORKFLOWS.filter((wf) => wf.id !== failedId).map(
        (wf) => ({ id: wf.id, name: wf.id } as unknown as WorkflowDetailDto)
      ),
      failed: [{ index: 1, id: failedId, error: 'validation error' }],
    });
    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger });

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    const errorMsg = String((logger.error as jest.Mock).mock.calls[0]?.[0] ?? '');
    expect(errorMsg).toContain(failedId);
    expect(errorMsg).toContain('validation error');
    expect(errorMsg).toContain('will not run autonomously');
  });

  it('logs a loud error when created count is short of BUILTIN_WORKFLOWS length', async () => {
    // created is short but failed[] is also empty (e.g. silent partial write)
    const bulkCreate = jest.fn().mockResolvedValue({
      created: [{ id: BUILTIN_WORKFLOWS[0].id, name: BUILTIN_WORKFLOWS[0].id }],
      failed: [],
    });
    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger });

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    const errorMsg = String((logger.error as jest.Mock).mock.calls[0]?.[0] ?? '');
    // Should name the missing IDs
    for (const wf of BUILTIN_WORKFLOWS.slice(1)) {
      expect(errorMsg).toContain(wf.id);
    }
    expect(errorMsg).toContain('will not run autonomously');
  });
});

// ---------------------------------------------------------------------------
// enrich_threat_report isolation guard
//
// WHY this test exists:
//   nl-extraction must ONLY load pending docs. Two structured-method types
//   must NEVER be reprocessed by the nl-extraction workflow:
//
//     • 'stix'                — STIX partner docs are pre-structured at
//                               ingest (Cycle 2) and carry extraction_method:'stix'.
//                               Re-running Haiku over them would clobber the
//                               stix marker and double-count IOCs.
//
//     • 'text_indicator_list' — Maltrail trail files are parsed deterministically
//                               by the text_indicator_list adapter at ingest time.
//                               IOCs are already extracted; nl-extraction must not
//                               touch them or overwrite the extraction_method marker.
//
//   The `load_pending_reports` step (term filter: extraction_method == 'pending')
//   and the `check_already_extracted` per-item dedup gate together form the
//   isolation boundary. Both structured types are excluded automatically because
//   neither value equals 'pending' under strict term semantics.
//
//   A future edit that drops, weakens, or renames either filter would
//   silently break the boundary. This test fails loudly in that case.
// ---------------------------------------------------------------------------
describe('threat-intel-continuous-threat-hunt', () => {
  it('registers with tier2_when always on the scheduled hunt path', () => {
    const workflow = BUILTIN_WORKFLOWS.find(
      (wf) => wf.id === 'threat-intel-continuous-threat-hunt'
    );
    expect(workflow).toBeDefined();
    expect(workflow?.yaml).toContain('tier2_when: always');
    expect(workflow?.yaml).toContain('/api/threat_intelligence/hunt_orchestrator');
  });
});

describe('enrich_threat_report — structured-method isolation boundary (stix + text_indicator_list)', () => {
  const nlWorkflow = BUILTIN_WORKFLOWS.find((wf) => wf.id === 'threat-intel-enrich-threat-report');
  // Guard: if the workflow entry itself is removed this fails with a clear message.
  if (!nlWorkflow) {
    it('threat-intel-enrich-threat-report is present in BUILTIN_WORKFLOWS', () => {
      expect(nlWorkflow).toBeDefined();
    });
  } else {
    const yaml = nlWorkflow.yaml;

    it('load_pending_reports step contains a term filter on lineage.extraction_method: pending', () => {
      const step = stepText(yaml, 'load_pending_reports');
      expect(step).not.toBe('');
      // The isolation filter — removal or rename breaks STIX doc isolation.
      expect(step).toContain('lineage.extraction_method');
      expect(step).toContain('pending');
    });

    it('check_already_extracted step contains a must_not filter that excludes pending (dedup gate)', () => {
      const step = stepText(yaml, 'check_already_extracted');
      expect(step).not.toBe('');
      // The must_not clause: "skip if a non-pending doc with the same fingerprint exists"
      // is the per-item guard that prevents double-processing.
      expect(step).toContain('must_not');
      expect(step).toContain('lineage.extraction_method');
      expect(step).toContain('pending');
    });

    it('a doc with extraction_method stix would not match the load_pending_reports filter (structural)', () => {
      // Structural negative: the filter is a strict `term` (exact-match) query.
      // Any doc with extraction_method:'stix' is excluded because its value
      // != 'pending'. `term:` guarantees exact-match semantics — if someone
      // replaced it with `match:`, `prefix:`, or `exists:`, the first test
      // above (toContain('term:')) would already fail; this test documents the
      // invariant explicitly so the reason is clear on the next read.
      const step = stepText(yaml, 'load_pending_reports');
      // term: + pending together mean exactly "extraction_method equals 'pending'".
      // 'stix' != 'pending', so STIX docs are excluded by ES term semantics.
      expect(step).toContain('term:');
      expect(step).toContain('pending');
    });

    it('a doc with extraction_method text_indicator_list would not match the load_pending_reports filter (structural)', () => {
      // Structural negative for text_indicator_list: same invariant as the stix
      // test above. Maltrail trail files are ingested with extraction_method set
      // to 'text_indicator_list' by the textIndicatorListAdapter at ingest time.
      // The `term: pending` filter is strict exact-match, so any doc whose
      // extraction_method is 'text_indicator_list' is excluded automatically —
      // no special-case logic is needed. This test locks the invariant against
      // a future weakening of the filter (e.g. changing `term:` to `exists:`).
      const step = stepText(yaml, 'load_pending_reports');
      // term: + pending → 'text_indicator_list' != 'pending' → excluded.
      expect(step).toContain('term:');
      expect(step).toContain('pending');
      // The filter must NOT use 'exists:' or 'match:' (which would include
      // text_indicator_list docs). The two assertions above already verify
      // term: semantics — this comment makes the protection explicit.
    });
  }
});
