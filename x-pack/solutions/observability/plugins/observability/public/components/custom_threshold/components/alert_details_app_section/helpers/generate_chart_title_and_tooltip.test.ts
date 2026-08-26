/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AggType } from '../../../../../../common/custom_threshold_rule/types';
import { Aggregators } from '../../../../../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../../../types';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { generateChartTitleAndTooltip } from './generate_chart_title_and_tooltip';

describe('generateChartTitleAndTooltip', () => {
  describe('alerts based on custom threshold rule', () => {
    const buildCriterion = (criterion: Partial<MetricExpression> = {}): MetricExpression => ({
      metrics: [
        { name: 'A', field: 'response_time', aggType: Aggregators.COUNT as unknown as AggType },
      ],
      threshold: [100],
      comparator: COMPARATORS.GREATER_THAN,
      equation: 'A > 100',
      ...criterion,
    });

    it('should generate correct title and tooltip when using COUNT aggregation without equation and without filter', () => {
      const criterion = buildCriterion({
        metrics: [{ name: 'A', aggType: Aggregators.COUNT as unknown as AggType }],
        equation: undefined,
      });

      const { title, tooltip } = generateChartTitleAndTooltip(criterion);

      expect(title).toBe('Equation result for count (all documents)');
      expect(tooltip).toBe('Equation result for count (all documents)');
    });

    it('should generate correct title and tooltip when using COUNT aggregation with equation and without filter', () => {
      const criterion = buildCriterion({
        metrics: [{ name: 'A', aggType: Aggregators.COUNT as unknown as AggType }],
      });

      const { title, tooltip } = generateChartTitleAndTooltip(criterion);

      expect(title).toBe('Equation result for count (all documents) > 100');
      expect(tooltip).toBe('Equation result for count (all documents) > 100');
    });

    it('should generate correct title and tooltip when using COUNT aggregation with equation and filter', () => {
      const criterion = buildCriterion({
        metrics: [
          {
            name: 'A',
            aggType: Aggregators.COUNT as unknown as AggType,
            filter: 'status_code:500',
          },
        ],
      });

      const { title, tooltip } = generateChartTitleAndTooltip(criterion);

      expect(title).toBe('Equation result for count (status_code:500) > 100');
      expect(tooltip).toBe('Equation result for count (status_code:500) > 100');
    });

    it('should generate correct title and tooltip when using SUM aggregation with equation and wihout filter', () => {
      const criterion = buildCriterion({
        metrics: [{ name: 'A', aggType: Aggregators.SUM as unknown as AggType, field: 'bytes' }],
      });

      const { title, tooltip } = generateChartTitleAndTooltip(criterion);

      expect(title).toBe('Equation result for sum (bytes) > 100');
      expect(tooltip).toBe('Equation result for sum (bytes) > 100');
    });

    it('should generate correct title and tooltip when using SUM aggregation with equation and filter', () => {
      const criterion = buildCriterion({
        metrics: [
          {
            name: 'A',
            aggType: Aggregators.SUM as unknown as AggType,
            field: 'bytes',
            filter: 'status_code:200',
          },
        ],
      });

      const { title, tooltip } = generateChartTitleAndTooltip(criterion);

      expect(title).toBe('Equation result for sum (bytes, status_code:200) > 100');
      expect(tooltip).toBe('Equation result for sum (bytes, status_code:200) > 100');
    });
  });
});
