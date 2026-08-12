/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeCombinedAlerts } from '.';
import type { AlertRetrievalData, CombinedAlerts } from '.';

describe('computeCombinedAlerts', () => {
  const defaultEsqlResult: AlertRetrievalData = {
    alerts: ['legacy-alert-1', 'legacy-alert-2'],
    alerts_context_count: 2,
    extraction_strategy: 'default_esql',
  };

  const customWorkflowResult: AlertRetrievalData = {
    alerts: ['esql-alert-1', 'esql-alert-2', 'esql-alert-3'],
    alerts_context_count: 3,
    extraction_strategy: 'custom_workflow',
  };

  const genericResult: AlertRetrievalData = {
    alerts: ['generic-alert-1'],
    alerts_context_count: null,
    extraction_strategy: 'custom_workflow',
  };

  it('returns empty alerts and zero count for empty input', () => {
    const result: CombinedAlerts = computeCombinedAlerts([]);

    expect(result).toEqual({
      alerts: [],
      alerts_context_count: 0,
    });
  });

  it('returns the single result for default_esql-only input', () => {
    const result = computeCombinedAlerts([defaultEsqlResult]);

    expect(result).toEqual({
      alerts: ['legacy-alert-1', 'legacy-alert-2'],
      alerts_context_count: 2,
    });
  });

  it('returns the single result for custom_workflow-only input', () => {
    const result = computeCombinedAlerts([customWorkflowResult]);

    expect(result).toEqual({
      alerts: ['esql-alert-1', 'esql-alert-2', 'esql-alert-3'],
      alerts_context_count: 3,
    });
  });

  it('uses alerts.length as fallback for custom_workflow strategy with null count', () => {
    const result = computeCombinedAlerts([genericResult]);

    expect(result).toEqual({
      alerts: ['generic-alert-1'],
      alerts_context_count: 1,
    });
  });

  it('merges default_esql and custom_workflow results', () => {
    const result = computeCombinedAlerts([defaultEsqlResult, customWorkflowResult]);

    expect(result).toEqual({
      alerts: ['legacy-alert-1', 'legacy-alert-2', 'esql-alert-1', 'esql-alert-2', 'esql-alert-3'],
      alerts_context_count: 5,
    });
  });

  it('merges default_esql and custom_workflow results, using alerts.length for null count', () => {
    const result = computeCombinedAlerts([defaultEsqlResult, genericResult]);

    expect(result).toEqual({
      alerts: ['legacy-alert-1', 'legacy-alert-2', 'generic-alert-1'],
      alerts_context_count: 3,
    });
  });

  it('merges custom_workflow results', () => {
    const result = computeCombinedAlerts([customWorkflowResult, genericResult]);

    expect(result).toEqual({
      alerts: ['esql-alert-1', 'esql-alert-2', 'esql-alert-3', 'generic-alert-1'],
      alerts_context_count: 4,
    });
  });

  it('merges default_esql and multiple custom_workflow results', () => {
    const result = computeCombinedAlerts([defaultEsqlResult, customWorkflowResult, genericResult]);

    expect(result).toEqual({
      alerts: [
        'legacy-alert-1',
        'legacy-alert-2',
        'esql-alert-1',
        'esql-alert-2',
        'esql-alert-3',
        'generic-alert-1',
      ],
      alerts_context_count: 6,
    });
  });

  it('handles multiple custom_workflow results, each with null count', () => {
    const generic1: AlertRetrievalData = {
      alerts: ['gen-1', 'gen-2'],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const generic2: AlertRetrievalData = {
      alerts: ['gen-3'],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const result = computeCombinedAlerts([generic1, generic2]);

    expect(result).toEqual({
      alerts: ['gen-1', 'gen-2', 'gen-3'],
      alerts_context_count: 3,
    });
  });

  it('handles a single workflow result', () => {
    const singleResult: AlertRetrievalData = {
      alerts: ['only-alert'],
      alerts_context_count: 1,
      extraction_strategy: 'custom_workflow',
    };

    const result = computeCombinedAlerts([singleResult]);

    expect(result).toEqual({
      alerts: ['only-alert'],
      alerts_context_count: 1,
    });
  });

  it('handles custom-only results with null counts', () => {
    const custom1: AlertRetrievalData = {
      alerts: ['custom-a', 'custom-b'],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const custom2: AlertRetrievalData = {
      alerts: ['custom-c', 'custom-d', 'custom-e'],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const result = computeCombinedAlerts([custom1, custom2]);

    expect(result).toEqual({
      alerts: ['custom-a', 'custom-b', 'custom-c', 'custom-d', 'custom-e'],
      alerts_context_count: 5,
    });
  });

  it('handles results with empty alerts arrays', () => {
    const emptyDefaultEsql: AlertRetrievalData = {
      alerts: [],
      alerts_context_count: 0,
      extraction_strategy: 'default_esql',
    };

    const emptyCustomWorkflow: AlertRetrievalData = {
      alerts: [],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const result = computeCombinedAlerts([emptyDefaultEsql, emptyCustomWorkflow]);

    expect(result).toEqual({
      alerts: [],
      alerts_context_count: 0,
    });
  });

  it('preserves alert ordering across results', () => {
    const first: AlertRetrievalData = {
      alerts: ['a1', 'a2'],
      alerts_context_count: 2,
      extraction_strategy: 'default_esql',
    };

    const second: AlertRetrievalData = {
      alerts: ['b1'],
      alerts_context_count: null,
      extraction_strategy: 'custom_workflow',
    };

    const third: AlertRetrievalData = {
      alerts: ['c1', 'c2', 'c3'],
      alerts_context_count: 3,
      extraction_strategy: 'custom_workflow',
    };

    const result = computeCombinedAlerts([first, second, third]);

    expect(result.alerts).toEqual(['a1', 'a2', 'b1', 'c1', 'c2', 'c3']);
    expect(result.alerts_context_count).toBe(6);
  });
});
