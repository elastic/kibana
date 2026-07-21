/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO, createSLOWithTimeslicesBudgetingMethod } from '../fixtures/slo';
import { monthlyCalendarAligned, sevenDaysRolling } from '../fixtures/time_window';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator';

describe('DefaultSummaryTransformGenerator', () => {
  describe('project_routing', () => {
    it('adds project_routing to the source when isServerless and isCpsEnabled (occurrences)', () => {
      const slo = createSLO({ id: 'irrelevant', budgetingMethod: 'occurrences' });
      const generator = new DefaultSummaryTransformGenerator(true, true);
      expect(generator.generate(slo).source.project_routing).toBe('_alias:_origin');
    });

    it('omits project_routing from the source when isServerless is false (occurrences)', () => {
      const slo = createSLO({ id: 'irrelevant', budgetingMethod: 'occurrences' });
      const generator = new DefaultSummaryTransformGenerator(false);
      expect(generator.generate(slo).source.project_routing).toBeUndefined();
    });

    it('omits project_routing from the source when isCpsEnabled is false (occurrences)', () => {
      const slo = createSLO({ id: 'irrelevant', budgetingMethod: 'occurrences' });
      const generator = new DefaultSummaryTransformGenerator(true, false);
      expect(generator.generate(slo).source.project_routing).toBeUndefined();
    });

    it('adds project_routing to the source when isServerless and isCpsEnabled (timeslices rolling)', () => {
      const slo = createSLOWithTimeslicesBudgetingMethod({
        id: 'irrelevant',
        timeWindow: sevenDaysRolling(),
      });
      const generator = new DefaultSummaryTransformGenerator(true, true);
      expect(generator.generate(slo).source.project_routing).toBe('_alias:_origin');
    });

    it('adds project_routing to the source when isServerless and isCpsEnabled (timeslices calendar-aligned)', () => {
      const slo = createSLOWithTimeslicesBudgetingMethod({
        id: 'irrelevant',
        timeWindow: monthlyCalendarAligned(),
      });
      const generator = new DefaultSummaryTransformGenerator(true, true);
      expect(generator.generate(slo).source.project_routing).toBe('_alias:_origin');
    });
  });
});
