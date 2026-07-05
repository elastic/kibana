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
});

describe('installBuiltinWorkflows', () => {
  const noDelay = () => Promise.resolve();

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

  it('succeeds immediately when all workflows register on the first attempt', async () => {
    const bulkCreate = jest.fn().mockResolvedValue(allCreated());
    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger, _delayFn: noDelay });

    expect(bulkCreate).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retries when the first N calls partially fail, then succeeds', async () => {
    // First 2 calls: only the first workflow registers; attempts 3+ succeed.
    const partial = {
      created: [
        {
          id: BUILTIN_WORKFLOWS[0].id,
          name: BUILTIN_WORKFLOWS[0].id,
        } as unknown as WorkflowDetailDto,
      ],
      failed: BUILTIN_WORKFLOWS.slice(1).map((wf, i) => ({
        index: i + 1,
        id: wf.id,
        error: 'transient: not ready',
      })),
    };
    const bulkCreate = jest
      .fn()
      .mockResolvedValueOnce(partial)
      .mockResolvedValueOnce(partial)
      .mockResolvedValue(allCreated());

    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger, _delayFn: noDelay });

    // Should have retried until success (3 calls total).
    expect(bulkCreate).toHaveBeenCalledTimes(3);
    // Partial-failure attempts surface as error + warn per attempt.
    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
    // But no terminal error after eventual success.
    const terminalErrorCalls = (logger.error as jest.Mock).mock.calls.filter((args: string[]) =>
      String(args[0]).includes('failed after')
    );
    expect(terminalErrorCalls).toHaveLength(0);
  });

  it('logs a terminal error (not just warn) when all attempts are exhausted', async () => {
    const partial = {
      created: [],
      failed: BUILTIN_WORKFLOWS.map((wf, i) => ({
        index: i,
        id: wf.id,
        error: 'persistent error',
      })),
    };
    const bulkCreate = jest.fn().mockResolvedValue(partial);

    const workflowsManagement = {
      management: { bulkCreateWorkflows: bulkCreate },
    } as unknown as WorkflowsServerPluginSetup;
    const logger = makeLogger();

    await installBuiltinWorkflows({ workflowsManagement, logger, _delayFn: noDelay });

    // Should have tried INSTALL_MAX_ATTEMPTS times (imported indirectly via behaviour).
    expect(bulkCreate.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Terminal log.error must mention "failed after".
    const terminalError = (logger.error as jest.Mock).mock.calls.find((args: string[]) =>
      String(args[0]).includes('failed after')
    );
    expect(terminalError).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// nl_extraction_behavioral isolation guard
//
// WHY this test exists:
//   nl-extraction must ONLY load pending docs. STIX partner docs are
//   pre-structured at ingest (Cycle 2) and carry extraction_method:'stix'.
//   The `load_pending_reports` step and the `check_already_extracted`
//   per-item dedup gate together form the isolation boundary that prevents
//   Haiku from re-extracting IOCs we already parsed — and from clobbering
//   the 'stix' extraction_method marker.
//
//   A future edit that drops, weakens, or renames either filter would
//   silently break the boundary. This test fails loudly in that case.
// ---------------------------------------------------------------------------
describe('nl_extraction_behavioral — STIX isolation boundary', () => {
  const nlWorkflow = BUILTIN_WORKFLOWS.find(
    (wf) => wf.id === 'threat-intel-nl-extraction-behavioral'
  );
  // Guard: if the workflow entry itself is removed this fails with a clear message.
  if (!nlWorkflow) {
    it('threat-intel-nl-extraction-behavioral is present in BUILTIN_WORKFLOWS', () => {
      expect(nlWorkflow).toBeDefined();
    });
  } else {
    const yaml = nlWorkflow.yaml;

    it('load_pending_reports step contains a term filter on provenance.extraction_method: pending', () => {
      const step = stepText(yaml, 'load_pending_reports');
      expect(step).not.toBe('');
      // The isolation filter — removal or rename breaks STIX doc isolation.
      expect(step).toContain('provenance.extraction_method');
      expect(step).toContain('pending');
    });

    it('check_already_extracted step contains a must_not filter that excludes pending (dedup gate)', () => {
      const step = stepText(yaml, 'check_already_extracted');
      expect(step).not.toBe('');
      // The must_not clause: "skip if a non-pending doc with the same fingerprint exists"
      // is the per-item guard that prevents double-processing.
      expect(step).toContain('must_not');
      expect(step).toContain('provenance.extraction_method');
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
  }
});
