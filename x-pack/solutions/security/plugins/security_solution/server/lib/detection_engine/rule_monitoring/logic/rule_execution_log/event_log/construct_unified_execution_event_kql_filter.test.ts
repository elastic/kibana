/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constructUnifiedExecutionEventKqlFilter } from './construct_unified_execution_event_kql_filter';

describe('constructUnifiedExecutionEventKqlFilter', () => {
  describe('run type filtering', () => {
    it('no run type filter provided - include both actions', () => {
      const result = constructUnifiedExecutionEventKqlFilter({});

      expect(result).toContain('event.action:(execute or execute-backfill)');
    });

    it('empty run type filter - include both actions', () => {
      const result = constructUnifiedExecutionEventKqlFilter({ runType: [] });

      expect(result).toContain('event.action:(execute or execute-backfill)');
    });

    it('only standard run type - include only "execute" action', () => {
      const result = constructUnifiedExecutionEventKqlFilter({ runType: ['standard'] });

      expect(result).toContain('event.action:(execute)');
      expect(result).not.toContain('execute-backfill');
    });

    it('only backfill run type - include only "execute-backfill" action', () => {
      const result = constructUnifiedExecutionEventKqlFilter({ runType: ['backfill'] });

      expect(result).toContain('event.action:(execute-backfill)');
      expect(result).not.toContain('event.action:(execute)');
    });

    it('both run types - include both actions', () => {
      const result = constructUnifiedExecutionEventKqlFilter({
        runType: ['standard', 'backfill'],
      });

      expect(result).toContain('event.action:(execute or execute-backfill)');
    });
  });

  describe('outcome filtering', () => {
    it('no outcome filter provided - select all executions with an outcome', () => {
      const result = constructUnifiedExecutionEventKqlFilter({});

      expect(result).toContain('kibana.alerting.outcome:*');
    });

    it('empty outcome filter - select all executions with an outcome', () => {
      const result = constructUnifiedExecutionEventKqlFilter({ outcome: [] });

      expect(result).toContain('kibana.alerting.outcome:*');
    });

    it('single outcome', () => {
      const result = constructUnifiedExecutionEventKqlFilter({ outcome: ['failure'] });

      expect(result).toContain('kibana.alerting.outcome:(failure)');
    });

    it('multiple outcomes', () => {
      const result = constructUnifiedExecutionEventKqlFilter({
        outcome: ['success', 'warning'],
      });

      expect(result).toContain('kibana.alerting.outcome:(success or warning)');
    });
  });

  describe('combined filters', () => {
    it('should always include the alerting provider filter', () => {
      const result = constructUnifiedExecutionEventKqlFilter({});

      expect(result).toContain('event.provider:alerting');
    });

    it('should combine all filter clauses together using AND logic', () => {
      const result = constructUnifiedExecutionEventKqlFilter({
        runType: ['standard'],
        outcome: ['failure'],
      });

      expect(result).toBe(
        'event.provider:alerting and event.action:(execute) and kibana.alerting.outcome:(failure)'
      );
    });
  });
});
