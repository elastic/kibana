/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GAP_AUTO_FILL_STATUS } from '@kbn/alerting-plugin/common';
import type { GapAutoFillSchedulerLogsResponseBodyV1 } from '@kbn/alerting-plugin/common/routes/gaps/apis/gap_auto_fill_scheduler';
import * as i18n from './translations';
import { getStatusTooltip } from '.';

describe('getStatusTooltip', () => {
  describe('NO_GAPS status', () => {
    it('returns NO_GAPS_TOOLTIP for NO_GAPS status', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.NO_GAPS,
        message: 'Skipped execution: no rules with gaps',
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_NO_GAPS_TOOLTIP);
    });
  });

  describe('SUCCESS status', () => {
    it('with "All rules successfully scheduled gap fills"', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SUCCESS,
        message: 'All rules successfully scheduled gap fills',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SUCCESS_TOOLTIP);
    });

    it('with capacity limit message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SUCCESS,
        message:
          'Stopped early: gap auto-fill capacity limit reached. This task can schedule at most 10 gap backfills at a time, and existing backfills must finish before new ones can be scheduled. | processed 5 gaps across 2 rules',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SUCCESS_TOOLTIP);
    });

    it('with timeout cancellation message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SUCCESS,
        message:
          'Gap Auto Fill Scheduler cancelled by timeout | Results: processed 3 gaps across 1 rule',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SUCCESS_TOOLTIP);
    });
  });

  describe('ERROR status', () => {
    it('with "Error during execution" message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.ERROR,
        message: 'Error during execution: Some error message',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_ERROR_TASK_CRASH_TOOLTIP);
    });

    it('with "All rules failed to schedule" message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.ERROR,
        message: 'All rules failed to schedule gap fills',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_ERROR_ALL_FAILED_TOOLTIP);
    });

    it('with "At least one rule successfully scheduled gap fills, but others failed to schedule" message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.ERROR,
        message:
          'At least one rule successfully scheduled gap fills, but others failed to schedule | processed 5 gaps across 2 rules',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_ERROR_SOME_FAILED_TOOLTIP);
    });

    it('returns general error tooltip for unknown message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.ERROR,
        message: 'Some unknown error message',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_ERROR_TOOLTIP);
    });
  });

  describe('SKIPPED status', () => {
    it('with "capacity limit reached" message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SKIPPED,
        message:
          'Skipped execution: gap auto-fill capacity limit reached. This task can schedule at most 10 gap backfills at a time, and existing backfills must finish before new ones can be scheduled.',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SKIPPED_NO_CAPACITY_TOOLTIP);
    });

    it('with "can\'t schedule gap fills for any enabled rule" message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SKIPPED,
        message: "Skipped execution: can't schedule gap fills for any enabled rule",
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SKIPPED_RULES_DISABLED_TOOLTIP);
    });

    it('returns general skipped execution tooltip for unknown message', () => {
      const logEntry: GapAutoFillSchedulerLogsResponseBodyV1['data'][number] = {
        id: '1',
        timestamp: '2024-01-01T00:00:00Z',
        status: GAP_AUTO_FILL_STATUS.SKIPPED,
        message: 'Skipped execution: some other reason',
        results: [],
      };

      const tooltip = getStatusTooltip(logEntry);
      expect(tooltip).toBe(i18n.GAP_AUTO_FILL_STATUS_SKIPPED_TOOLTIP);
    });
  });
});
