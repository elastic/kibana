/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineDataResponse } from '../../../../hooks/use_pipeline_data';
import { getStepDataModalConfig } from '.';

const esqlAlerts = ['esql-alert-1', 'esql-alert-2'];
const agentBuilderAlerts = ['agent-builder-alert-1'];

const pipelineDataWithReversedOrder: PipelineDataResponse = {
  alert_retrieval: [
    {
      alerts: agentBuilderAlerts,
      alerts_context_count: 1,
      extraction_strategy: 'custom_workflow',
      workflow_run_id: 'agent-builder-run-456',
    },
    {
      alerts: esqlAlerts,
      alerts_context_count: 2,
      extraction_strategy: 'custom_workflow',
      workflow_run_id: 'esql-run-123',
    },
  ],
  combined_alerts: {
    alerts: [...agentBuilderAlerts, ...esqlAlerts],
    alerts_context_count: 3,
  },
  generation: null,
  validated_discoveries: null,
};

describe('getStepDataModalConfig', () => {
  describe('per-workflow retrieval (retrieval:N)', () => {
    it('returns the correct workflow data by workflow_run_id even when positional index would return the wrong entry', () => {
      const result = getStepDataModalConfig('retrieval:0', pipelineDataWithReversedOrder, {
        workflowRunId: 'esql-run-123',
      });

      expect(result).toEqual({
        dataCount: 2,
        dataType: 'alerts',
        extractionStrategy: 'custom_workflow',
        items: esqlAlerts,
        stepName: 'Alert retrieval',
      });
    });

    it('returns the agent builder data when metadata matches the agent builder workflow', () => {
      const result = getStepDataModalConfig('retrieval:1', pipelineDataWithReversedOrder, {
        workflowRunId: 'agent-builder-run-456',
      });

      expect(result).toEqual({
        dataCount: 1,
        dataType: 'alerts',
        extractionStrategy: 'custom_workflow',
        items: agentBuilderAlerts,
        stepName: 'Alert retrieval',
      });
    });

    it('falls back to positional index when metadata has no workflowRunId', () => {
      const result = getStepDataModalConfig('retrieval:0', pipelineDataWithReversedOrder);

      expect(result).toEqual({
        dataCount: 1,
        dataType: 'alerts',
        extractionStrategy: 'custom_workflow',
        items: agentBuilderAlerts,
        stepName: 'Alert retrieval',
      });
    });

    it('falls back to positional index when workflow_run_id does not match any entry', () => {
      const result = getStepDataModalConfig('retrieval:0', pipelineDataWithReversedOrder, {
        workflowRunId: 'nonexistent-run',
      });

      expect(result).toEqual({
        dataCount: 1,
        dataType: 'alerts',
        extractionStrategy: 'custom_workflow',
        items: agentBuilderAlerts,
        stepName: 'Alert retrieval',
      });
    });

    it('returns null when alert_retrieval is null', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: null,
        combined_alerts: null,
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval:0', pipelineData, {
        workflowRunId: 'esql-run-123',
      });

      expect(result).toBeNull();
    });
  });

  describe('combined retrieval', () => {
    it('returns combined alerts data with extractionStrategy when all entries share the same strategy', () => {
      const result = getStepDataModalConfig('retrieval', pipelineDataWithReversedOrder);

      expect(result).toEqual({
        dataCount: 3,
        dataType: 'alerts',
        extractionStrategy: 'custom_workflow',
        items: [...agentBuilderAlerts, ...esqlAlerts],
        stepName: 'Alert Retrieval',
      });
    });

    it('returns extractionStrategy as default_esql when all entries use default_esql', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_esql',
          },
        ],
        combined_alerts: {
          alerts: ['alert-1'],
          alerts_context_count: 1,
        },
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval', pipelineData);

      expect(result?.extractionStrategy).toBe('default_esql');
    });

    it('returns extractionStrategy as default_custom_query when all entries use default_custom_query', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_custom_query',
          },
        ],
        combined_alerts: {
          alerts: ['alert-1'],
          alerts_context_count: 1,
        },
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval', pipelineData);

      expect(result?.extractionStrategy).toBe('default_custom_query');
    });

    it('does not include extractionStrategy when entries have different strategies', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: [
          {
            alerts: ['alert-1'],
            alerts_context_count: 1,
            extraction_strategy: 'default_esql',
          },
          {
            alerts: ['alert-2'],
            alerts_context_count: 1,
            extraction_strategy: 'custom_workflow',
          },
        ],
        combined_alerts: {
          alerts: ['alert-1', 'alert-2'],
          alerts_context_count: 2,
        },
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval', pipelineData);

      expect(result).not.toHaveProperty('extractionStrategy');
    });

    it('does not include extractionStrategy when alert_retrieval is null', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: null,
        combined_alerts: null,
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval', pipelineData);

      expect(result).not.toHaveProperty('extractionStrategy');
    });

    it('does not include extractionStrategy when alert_retrieval is empty', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: [],
        combined_alerts: {
          alerts: [],
          alerts_context_count: 0,
        },
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('retrieval', pipelineData);

      expect(result).not.toHaveProperty('extractionStrategy');
    });
  });

  describe('combined_retrieval (raw-only combined alerts)', () => {
    it('returns combined alerts data with per-workflow summaries', () => {
      const result = getStepDataModalConfig('combined_retrieval', pipelineDataWithReversedOrder);

      expect(result).toEqual({
        dataCount: 3,
        dataType: 'alerts',
        items: [...agentBuilderAlerts, ...esqlAlerts],
        stepName: 'Combined alert retrieval',
        workflowSummaries: [
          { alertsCount: 1, workflowRunId: 'agent-builder-run-456' },
          { alertsCount: 2, workflowRunId: 'esql-run-123' },
        ],
      });
    });

    it('returns empty workflowSummaries when alert_retrieval is null', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: null,
        combined_alerts: null,
        generation: null,
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('combined_retrieval', pipelineData);

      expect(result).toEqual({
        dataCount: null,
        dataType: 'alerts',
        items: [],
        stepName: 'Combined alert retrieval',
        workflowSummaries: [],
      });
    });
  });

  describe('generation', () => {
    it('returns generation data when available', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: null,
        combined_alerts: null,
        generation: {
          attack_discoveries: [
            {
              alert_ids: ['alert-1'],
              details_markdown: 'details',
              summary_markdown: 'summary',
              title: 'Discovery 1',
            },
          ],
          execution_uuid: 'exec-123',
          replacements: {},
        },
        validated_discoveries: null,
      };

      const result = getStepDataModalConfig('generation', pipelineData);

      expect(result).toEqual({
        dataCount: 1,
        dataType: 'discoveries',
        items: pipelineData.generation?.attack_discoveries,
        stepName: 'Generation',
      });
    });
  });

  describe('validation', () => {
    it('returns validated discoveries when available', () => {
      const pipelineData: PipelineDataResponse = {
        alert_retrieval: null,
        combined_alerts: null,
        generation: null,
        validated_discoveries: [{ id: 'validated-1' }],
      };

      const result = getStepDataModalConfig('validation', pipelineData);

      expect(result).toEqual({
        dataCount: 1,
        dataType: 'validated_discoveries',
        items: [{ id: 'validated-1' }],
        stepName: 'Validation',
      });
    });
  });

  describe('unknown step', () => {
    it('returns null for unknown step names', () => {
      const result = getStepDataModalConfig('unknown', pipelineDataWithReversedOrder);

      expect(result).toBeNull();
    });
  });
});
