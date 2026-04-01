/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowConfig } from '../types';
import { getWorkflowLoadingMessage } from '.';

describe('getWorkflowLoadingMessage', () => {
  describe('custom_query mode only (no custom workflows)', () => {
    const workflowConfig: WorkflowConfig = {
      alert_retrieval_workflow_ids: [],
      default_alert_retrieval_mode: 'custom_query',
      validation_workflow_id: 'default',
    };

    it('returns the default 24-hour message when start and end are the defaults', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.'
      );
    });

    it('returns a range message for non-default start and end', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 50,
        end: 'now-1h',
        start: 'now-72h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 50 alerts from now-72h to now-1h to generate discoveries.'
      );
    });

    it('returns a from-only message when only start is provided', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 200,
        start: 'now-48h',
        workflowConfig,
      });

      expect(result).toBe('AI is analyzing up to 200 alerts now-48h to generate discoveries.');
    });

    it('returns the default 24-hour message when neither start nor end is provided', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.'
      );
    });

    it('handles singular alert count', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 1,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 1 alert in the last 24 hours to generate discoveries.'
      );
    });
  });

  describe('esql mode only (no custom workflows)', () => {
    const workflowConfig: WorkflowConfig = {
      alert_retrieval_workflow_ids: [],
      default_alert_retrieval_mode: 'esql',
      esql_query: 'FROM .alerts-security.alerts-default | LIMIT 100',
      validation_workflow_id: 'default',
    };

    it('returns the ES|QL message', () => {
      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe('AI is analyzing alerts retrieved via ES|QL to generate discoveries.');
    });
  });

  describe('custom workflows only (default retrieval disabled)', () => {
    it('returns the single workflow message when one workflow is selected', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1'],
        default_alert_retrieval_mode: 'disabled',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe('AI is analyzing alerts from 1 workflow to generate discoveries.');
    });

    it('returns the plural workflows message when multiple workflows are selected', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2', 'workflow-3'],
        default_alert_retrieval_mode: 'disabled',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe('AI is analyzing alerts from 3 workflows to generate discoveries.');
    });
  });

  describe('custom_query mode with custom workflows (combined)', () => {
    it('combines custom query and single workflow message', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1'],
        default_alert_retrieval_mode: 'custom_query',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 100 alerts in the last 24 hours and alerts from 1 workflow to generate discoveries.'
      );
    });

    it('combines custom query and multiple workflows message', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2'],
        default_alert_retrieval_mode: 'custom_query',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 50,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 50 alerts in the last 24 hours and alerts from 2 workflows to generate discoveries.'
      );
    });

    it('combines custom query range with workflows', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1'],
        default_alert_retrieval_mode: 'custom_query',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now-1h',
        start: 'now-72h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 100 alerts from now-72h to now-1h and alerts from 1 workflow to generate discoveries.'
      );
    });
  });

  describe('esql mode with custom workflows (combined)', () => {
    it('combines ES|QL and single workflow message', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1'],
        default_alert_retrieval_mode: 'esql',
        esql_query: 'FROM .alerts | LIMIT 100',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing alerts retrieved via ES|QL and alerts from 1 workflow to generate discoveries.'
      );
    });

    it('combines ES|QL and multiple workflows message', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: ['workflow-1', 'workflow-2', 'workflow-3'],
        default_alert_retrieval_mode: 'esql',
        esql_query: 'FROM .alerts | LIMIT 100',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing alerts retrieved via ES|QL and alerts from 3 workflows to generate discoveries.'
      );
    });
  });

  describe('disabled mode with no custom workflows (edge case)', () => {
    it('falls back to the default custom_query message', () => {
      const workflowConfig: WorkflowConfig = {
        alert_retrieval_workflow_ids: [],
        default_alert_retrieval_mode: 'disabled',
        validation_workflow_id: 'default',
      };

      const result = getWorkflowLoadingMessage({
        alertsCount: 100,
        end: 'now',
        start: 'now-24h',
        workflowConfig,
      });

      expect(result).toBe(
        'AI is analyzing up to 100 alerts in the last 24 hours to generate discoveries.'
      );
    });
  });
});
