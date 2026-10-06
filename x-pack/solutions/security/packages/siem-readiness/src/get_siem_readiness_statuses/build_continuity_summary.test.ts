/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionableFinding, ContinuityFindingType } from '../types';
import { buildContinuitySummary, CONTINUITY_NO_DATA_SUMMARY } from './build_continuity_summary';

const makeFinding = (type: ContinuityFindingType): ActionableFinding => ({
  severity: 'CRITICAL',
  message: `finding of type ${type}`,
  resource: 'logs-test-default',
  type,
});

describe('buildContinuitySummary', () => {
  describe('noData status', () => {
    it('returns the default noData message when none is provided', () => {
      expect(buildContinuitySummary('noData', 0, [])).toBe(CONTINUITY_NO_DATA_SUMMARY);
    });

    it('returns the caller-provided noData message', () => {
      const custom = 'No ingest pipeline statistics available for categorized indices.';
      expect(buildContinuitySummary('noData', 0, [], custom)).toBe(custom);
    });
  });

  describe('healthy status', () => {
    it('reports all pipelines healthy when there are no findings', () => {
      expect(buildContinuitySummary('healthy', 5, [])).toBe(
        'All 5 active ingest pipelines are healthy.'
      );
    });
  });

  describe('actionsRequired status', () => {
    it('summarizes a single silent finding', () => {
      expect(buildContinuitySummary('actionsRequired', 10, [makeFinding('silence')])).toBe(
        '1 silent across 10 active pipelines.'
      );
    });

    it('summarizes and orders every finding type consistently', () => {
      const findings = [
        makeFinding('pipeline_failure'),
        makeFinding('volume_drop_warning'),
        makeFinding('silence'),
        makeFinding('volume_drop_critical'),
      ];

      // Order is fixed: silent, critical volume drop, volume drop warning, pipeline failure.
      expect(buildContinuitySummary('actionsRequired', 12, findings)).toBe(
        '1 silent, 1 critical volume drop, 1 volume drop warning, 1 pipeline failure across 12 active pipelines.'
      );
    });

    it('counts multiples of the same finding type', () => {
      const findings = [makeFinding('silence'), makeFinding('silence'), makeFinding('silence')];
      expect(buildContinuitySummary('actionsRequired', 8, findings)).toBe(
        '3 silent across 8 active pipelines.'
      );
    });
  });
});
