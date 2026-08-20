/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeWorkflowAlertCounts, findAdToolResult } from './evaluate_dataset';
import { createAdToolResultEvaluator } from './evaluators/ad_tool_result_evaluator';

describe('evaluate_dataset wiring', () => {
  // Smoke test: the refactor (Fix 5) moved evaluator construction into
  // src/evaluators/ factories. This guards against a wiring regression where
  // evaluate_dataset.ts silently stops using the extracted factory.
  it('createAdToolResultEvaluator produces a CODE evaluator named AdToolResult', () => {
    const evaluator = createAdToolResultEvaluator();

    expect(evaluator.name).toBe('AdToolResult');
    expect(evaluator.kind).toBe('CODE');
  });
});

describe('findAdToolResult', () => {
  // Fix 6 (Defect B): `buildSuccessResult`/`buildErrorResult`
  // (run_attack_discovery_tool/index.ts) return `{ data, tool_result_id, type }`
  // — `type` is a SIBLING of `data`, not a member of it. Reading
  // `data.type` made it always `undefined`, so `getAdStatus`'s
  // `resultType === 'error'` branch was unreachable and every AD tool error
  // was mislabelled as `status: null` ("no data") instead of `'error'`.
  //
  // The payload below is the real shape captured from a live converse
  // response against `security.attack-discovery.run`.
  it("labels an error result 'error' rather than null", () => {
    const result = findAdToolResult([
      {
        type: 'tool_call',
        tool_id: 'security.attack-discovery.run',
        results: [
          {
            data: { message: 'Attack Discovery workflows are not enabled for this space.' },
            tool_result_id: 'h4HKuy',
            type: 'error',
          },
        ],
      },
    ]);

    expect(result?.status).toBe('error');
  });

  it('reports a successful run as completed with its counts', () => {
    const result = findAdToolResult([
      {
        type: 'tool_call',
        tool_id: 'security.attack-discovery.run',
        results: [
          {
            data: {
              status: 'completed',
              execution_uuid: 'db82a24c-af29-40f5-b364-2b910ff3ccc0',
              alerts_context_count: 2,
              discovery_count: 1,
            },
            tool_result_id: 'ok1',
            type: 'other',
          },
        ],
      },
    ]);

    expect(result).toEqual({
      status: 'completed',
      executionUuid: 'db82a24c-af29-40f5-b364-2b910ff3ccc0',
      alertsContextCount: 2,
      discoveryCount: 1,
    });
  });

  it('returns undefined when the AD tool step never ran', () => {
    expect(
      findAdToolResult([{ tool_id: 'security.attack-discovery.get_status', results: [] }])
    ).toBeUndefined();
  });
});

describe('computeWorkflowAlertCounts', () => {
  // Fix 1: retrievedAlertCount and passedAlertCount must not both derive
  // from `adToolResult.alertsContextCount` (the PASSED count). Without the
  // fix, whenever the pipeline endpoint reports nothing for retrieval, the
  // retrieved count would silently mirror the passed count instead of
  // staying null.
  it('does not fall back to the passed count when the pipeline reports no retrieved count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {},
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.passedAlertCount).toBe(7);
    expect(result.retrievedAlertCount).toBeNull();
  });

  it('uses alert_retrieval[0] as the primary retrieved-count source', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: {
        alert_retrieval: [{ alerts_context_count: 12 }],
        combined_alerts: { alerts_context_count: 99 },
      },
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.retrievedAlertCount).toBe(12);
    expect(result.passedAlertCount).toBe(7);
  });

  it('falls back to combined_alerts only when alert_retrieval is absent, independently of the passed count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: { combined_alerts: { alerts_context_count: 20 } },
      adToolResult: { alertsContextCount: 7, discoveryCount: 2, status: 'completed' },
    });

    expect(result.retrievedAlertCount).toBe(20);
    expect(result.passedAlertCount).toBe(7);
    expect(result.retrievedAlertCount).not.toBe(result.passedAlertCount);
  });

  it('leaves passedAlertCount null when adToolResult never reported a count', () => {
    const result = computeWorkflowAlertCounts({
      pipeline: { alert_retrieval: [{ alerts_context_count: 5 }] },
      adToolResult: undefined,
    });

    expect(result.passedAlertCount).toBeNull();
    expect(result.retrievedAlertCount).toBe(5);
  });
});
