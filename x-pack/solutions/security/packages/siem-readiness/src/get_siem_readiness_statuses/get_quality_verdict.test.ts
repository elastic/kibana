/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQualityVerdict } from './get_quality_verdict';

describe('getQualityVerdict', () => {
  describe('status', () => {
    it('is noData when nothing is in scope (no checked indices, no missing fields)', () => {
      expect(
        getQualityVerdict({
          checkedCount: 0,
          incompatibleCount: 0,
          missingFieldCount: 0,
          rulesPartial: false,
        }).status
      ).toBe('noData');
    });

    it('is healthy when indices are checked and nothing is incompatible or missing', () => {
      expect(
        getQualityVerdict({
          checkedCount: 5,
          incompatibleCount: 0,
          missingFieldCount: 0,
          rulesPartial: false,
        }).status
      ).toBe('healthy');
    });

    it('is actionsRequired when any index is incompatible', () => {
      expect(
        getQualityVerdict({
          checkedCount: 5,
          incompatibleCount: 2,
          missingFieldCount: 0,
          rulesPartial: false,
        }).status
      ).toBe('actionsRequired');
    });

    it('is actionsRequired when only missing fields exist (no checked indices)', () => {
      expect(
        getQualityVerdict({
          checkedCount: 0,
          incompatibleCount: 0,
          missingFieldCount: 3,
          rulesPartial: false,
        }).status
      ).toBe('actionsRequired');
    });
  });

  describe('summary', () => {
    it('reports the noData guidance when nothing is in scope', () => {
      const { summary } = getQualityVerdict({
        checkedCount: 0,
        incompatibleCount: 0,
        missingFieldCount: 0,
        rulesPartial: false,
      });
      expect(summary).toBe(
        'No quality check results available. Run the Data Quality dashboard to see results.'
      );
    });

    it('appends the incomplete-list note to the noData summary when rulesPartial is true', () => {
      const { summary } = getQualityVerdict({
        checkedCount: 0,
        incompatibleCount: 0,
        missingFieldCount: 0,
        rulesPartial: true,
      });
      expect(summary).toContain('Run the Data Quality dashboard');
      expect(summary).toContain('may be incomplete');
    });

    it('reports all-compatible when healthy', () => {
      const { summary } = getQualityVerdict({
        checkedCount: 4,
        incompatibleCount: 0,
        missingFieldCount: 0,
        rulesPartial: false,
      });
      expect(summary).toBe('All 4 checked indices have compatible ECS field mappings.');
    });

    it('combines incompatible and missing-field counts', () => {
      const { summary } = getQualityVerdict({
        checkedCount: 10,
        incompatibleCount: 3,
        missingFieldCount: 2,
        rulesPartial: false,
      });
      expect(summary).toBe(
        '3 of 10 indices have incompatible ECS field mappings; 2 rule(s) have required fields not fully mapped in their queried indices.'
      );
    });

    it('appends the caveat as a summary part when rulesPartial is true alongside findings', () => {
      const { summary } = getQualityVerdict({
        checkedCount: 10,
        incompatibleCount: 1,
        missingFieldCount: 0,
        rulesPartial: true,
      });
      expect(summary).toContain('1 of 10 indices have incompatible ECS field mappings');
      expect(summary).toContain('may be incomplete');
    });
  });
});
