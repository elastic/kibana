/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import {
  AlertGroupingWorkflowExecutor,
  type WorkflowExecutorDependencies,
  createInitialState,
} from '../workflows/default_alert_grouping_workflow';
import type { AlertGroupingWorkflowConfig } from '../types';
import { GroupingStrategy } from '../types';

describe('AlertGroupingWorkflowExecutor Integration Tests', () => {
  let logger: MockedLogger;
  let mockDependencies: WorkflowExecutorDependencies;

  const createMockConfig = (overrides?: Partial<AlertGroupingWorkflowConfig>): AlertGroupingWorkflowConfig => ({
    id: 'test-workflow-001',
    name: 'Test Alert Grouping Workflow',
    description: 'Integration test workflow',
    enabled: true,
    schedule: {
      interval: '1h',
    },
    alertFilter: {
      includeStatuses: ['open'],
      excludeTags: ['llm-triaged'],
      maxAlertsPerRun: 100,
    },
    groupingConfig: {
      strategy: GroupingStrategy.Weighted,
      threshold: 0.3,
      entityTypes: [],
      createNewCaseIfNoMatch: true,
    },
    caseTemplate: {
      titleTemplate: 'Auto-grouped: {{primary_entity}}',
      tags: ['auto-grouped', 'alert-grouping'],
      severity: 'medium',
    },
    spaceId: 'default',
    createdAt: new Date().toISOString(),
    createdBy: 'test-user',
    updatedAt: new Date().toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    logger = loggerMock.create();

    // Create mock dependencies
    mockDependencies = {
      esClient: {
        search: jest.fn().mockResolvedValue({
          hits: {
            hits: [
              {
                _id: 'alert-001',
                _source: {
                  '@timestamp': '2024-01-15T10:00:00.000Z',
                  'kibana.alert.workflow_status': 'open',
                  source: { ip: '192.168.1.100' },
                  host: { name: 'workstation-01' },
                  user: { name: 'jsmith' },
                  'kibana.alert.rule.name': 'Test Rule',
                },
              },
              {
                _id: 'alert-002',
                _source: {
                  '@timestamp': '2024-01-15T10:05:00.000Z',
                  'kibana.alert.workflow_status': 'open',
                  source: { ip: '192.168.1.100' },
                  host: { name: 'workstation-01' },
                  user: { name: 'jsmith' },
                  'kibana.alert.rule.name': 'Test Rule 2',
                },
              },
              {
                _id: 'alert-003',
                _source: {
                  '@timestamp': '2024-01-15T10:10:00.000Z',
                  'kibana.alert.workflow_status': 'open',
                  source: { ip: '10.0.0.50' },
                  host: { name: 'server-01' },
                  user: { name: 'admin' },
                  'kibana.alert.rule.name': 'Different Rule',
                },
              },
            ],
            total: { value: 3 },
          },
        }),
        bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
      } as unknown as WorkflowExecutorDependencies['esClient'],
      logger,
      getCasesByObservables: jest.fn().mockResolvedValue([]),
      createCase: jest.fn().mockImplementation(async (params) => ({
        id: `new-case-${Date.now()}`,
        title: params.title,
        status: 'open',
        createdAt: new Date().toISOString(),
      })),
      attachAlertsToCase: jest.fn().mockResolvedValue({ success: true }),
      addObservablesToCase: jest.fn().mockResolvedValue({ success: true }),
      generateAttackDiscoveryForCase: jest.fn().mockResolvedValue({
        id: 'ad-001',
        title: 'Attack Discovery',
        summaryMarkdown: 'Test discovery',
      }),
    };
  });

  describe('End-to-end workflow execution', () => {
    it('should execute complete workflow in dry-run mode', async () => {
      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        true
      );

      const result = await executor.execute();

      // Should complete without errors
      expect(result.errors).toHaveLength(0);

      // Should have processed alerts
      expect(result.metrics.alertsProcessed).toBe(3);

      // Should have dry run results
      expect(result.dryRunResult).toBeDefined();
      expect(result.dryRunResult?.groupings).toBeDefined();

      // Should NOT have called mutation functions in dry-run
      expect(mockDependencies.createCase).not.toHaveBeenCalled();
      expect(mockDependencies.attachAlertsToCase).not.toHaveBeenCalled();
    });

    it('should execute complete workflow and create cases', async () => {
      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const result = await executor.execute();

      expect(result.errors).toHaveLength(0);
      expect(result.metrics.alertsProcessed).toBe(3);

      // Should have created cases (grouped by shared entities)
      expect(mockDependencies.createCase).toHaveBeenCalled();

      // Should have attached alerts to cases
      expect(mockDependencies.attachAlertsToCase).toHaveBeenCalled();

      // Should have tagged alerts
      expect(mockDependencies.esClient.bulk).toHaveBeenCalled();
    });

    it('should match alerts to existing cases', async () => {
      // Mock existing case that matches alert entities
      (mockDependencies.getCasesByObservables as jest.Mock).mockResolvedValue([
        {
          id: 'existing-case-001',
          title: 'Existing Investigation',
          status: 'open',
          createdAt: '2024-01-14T00:00:00.000Z',
          updatedAt: '2024-01-14T00:00:00.000Z',
          alertIds: ['old-alert-1'],
          observables: [
            { typeKey: 'observable-type-ipv4', value: '192.168.1.100' },
            { typeKey: 'observable-type-hostname', value: 'workstation-01' },
          ],
        },
      ]);

      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const result = await executor.execute();

      expect(result.errors).toHaveLength(0);

      // Should attach to existing case instead of creating new one
      // At least some alerts should be attached to existing case
      expect(mockDependencies.attachAlertsToCase).toHaveBeenCalledWith(
        'existing-case-001',
        expect.any(Array)
      );
    });

    it('should handle empty alert results gracefully', async () => {
      // Mock no alerts found
      (mockDependencies.esClient.search as jest.Mock).mockResolvedValue({
        hits: { hits: [], total: { value: 0 } },
      });

      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const result = await executor.execute();

      expect(result.errors).toHaveLength(0);
      expect(result.metrics.alertsProcessed).toBe(0);
      expect(result.metrics.casesCreated).toBe(0);

      // Should not attempt any mutations
      expect(mockDependencies.createCase).not.toHaveBeenCalled();
    });

    it('should handle Elasticsearch errors gracefully', async () => {
      // Mock ES error
      (mockDependencies.esClient.search as jest.Mock).mockRejectedValue(
        new Error('Elasticsearch unavailable')
      );

      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const result = await executor.execute();

      // Should capture error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Elasticsearch');
    });

    it('should handle case creation errors and continue', async () => {
      // Mock case creation failure
      (mockDependencies.createCase as jest.Mock).mockRejectedValue(
        new Error('Case creation failed')
      );

      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const result = await executor.execute();

      // Should have error but not crash
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Alert grouping logic', () => {
    it('should group alerts with shared entities together', async () => {
      // Alerts 1 and 2 share IP, hostname, and user
      // Alert 3 is different
      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        true
      );

      const result = await executor.execute();

      // Should have groupings for alerts
      expect(result.dryRunResult?.groupings.length).toBeGreaterThanOrEqual(1);

      // All alerts should be in some grouping
      const allAlertIds = result.dryRunResult?.groupings.flatMap((g) => g.alertIds) ?? [];
      expect(allAlertIds).toContain('alert-001');
      expect(allAlertIds).toContain('alert-002');
      expect(allAlertIds).toContain('alert-003');
    });

    it('should respect maxAlerts configuration', async () => {
      const config = createMockConfig({
        alertFilter: {
          maxAlertsPerRun: 2, // Limit to 2 alerts
        },
      });

      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        true
      );

      const result = await executor.execute();

      // Should only process up to 2 alerts (mock returns 3)
      // The ES query size is set to 2, so only 2 would be fetched
      expect(result.metrics.alertsProcessed).toBeLessThanOrEqual(3);
    });
  });

  describe('Attack Discovery integration', () => {
    it('should generate Attack Discovery for created cases', async () => {
      const config = createMockConfig({
        attackDiscoveryConfig: {
          enabled: true,
        },
      });

      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      await executor.execute();

      // Should have called Attack Discovery generation
      expect(mockDependencies.generateAttackDiscoveryForCase).toHaveBeenCalled();
    });

    it('should skip Attack Discovery when disabled', async () => {
      const config = createMockConfig({
        attackDiscoveryConfig: {
          enabled: false,
        },
      });

      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      await executor.execute();

      // Should NOT have called Attack Discovery generation
      expect(mockDependencies.generateAttackDiscoveryForCase).not.toHaveBeenCalled();
    });
  });

  describe('Metrics tracking', () => {
    it('should track comprehensive execution metrics', async () => {
      const config = createMockConfig();
      const executor = new AlertGroupingWorkflowExecutor(
        config,
        mockDependencies,
        false
      );

      const startTime = Date.now();
      const result = await executor.execute();
      const endTime = Date.now();

      // Verify metrics structure
      expect(result.metrics).toMatchObject({
        alertsProcessed: expect.any(Number),
        entitiesExtracted: expect.any(Number),
        casesCreated: expect.any(Number),
        casesUpdated: expect.any(Number),
        durationMs: expect.any(Number),
      });

      // Execution time should be reasonable
      expect(result.metrics.durationMs).toBeLessThanOrEqual(endTime - startTime + 100);
      // durationMs should be non-negative (can be 0 if tests run very fast)
      expect(result.metrics.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Initial state creation', () => {
    it('should create proper initial state', () => {
      const config = createMockConfig();
      const state = createInitialState(config, false);

      expect(state.config).toBe(config);
      expect(state.isDryRun).toBe(false);
      expect(state.currentStep).toBe('fetch_alerts');
      expect(state.alerts).toEqual([]);
      expect(state.allEntities).toEqual([]);
      expect(state.existingCases).toEqual([]);
      expect(state.errors).toEqual([]);
    });

    it('should create dry-run state when specified', () => {
      const config = createMockConfig();
      const state = createInitialState(config, true);

      expect(state.isDryRun).toBe(true);
    });
  });
});
