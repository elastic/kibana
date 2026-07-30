/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import React from 'react';
import { act } from 'react-dom/test-utils';

import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import type { MetricExpression } from '../types';
import { ExpressionRow } from './expression_row';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type { KqlPluginStart } from '@kbn/kql/public';

describe('ExpressionRow', () => {
  async function setup(
    expression: MetricExpression,
    setRuleParams: (id: number, params: MetricExpression) => void = () => {}
  ) {
    const wrapper = mountWithIntl(
      <ExpressionRow
        title={<>Condition</>}
        canDelete={false}
        fields={[
          {
            name: 'system.cpu.user.pct',
            type: 'test',
          },
          {
            name: 'system.load.1',
            type: 'test',
          },
        ]}
        remove={() => {}}
        addExpression={() => {}}
        kql={{} as KqlPluginStart}
        key={1}
        expressionId={1}
        setRuleParams={setRuleParams}
        errors={{
          aggField: [],
          timeSizeUnit: [],
          timeWindowSize: [],
        }}
        expression={expression}
        dataView={{ fields: [], title: 'metricbeat-*' }}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update };
  }

  it('should display thresholds as a percentage for pct metrics', async () => {
    const expression: MetricExpression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.cpu.user.pct',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };
    const { wrapper, update } = await setup(expression);
    await update();
    const [valueMatch] =
      wrapper
        .html()
        .match(
          '<span class="euiExpression__value css-uocz3u-euiExpression__value-columns">50%</span>'
        ) ?? [];
    expect(valueMatch).toBeTruthy();
  });

  it('should display thresholds as a decimal for all other metrics', async () => {
    const expression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.load.1',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };
    const { wrapper } = await setup(expression as MetricExpression);
    const [valueMatch] =
      wrapper
        .html()
        .match(
          '<span class="euiExpression__value css-uocz3u-euiExpression__value-columns">0.5</span>'
        ) ?? [];
    expect(valueMatch).toBeTruthy();
  });

  it('should display "(severity: critical)" on the alert threshold when a warning threshold is set', async () => {
    const { wrapper } = await setup({
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [{ name: 'A', aggType: Aggregators.COUNT, field: 'system.load.1' }],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
      warningComparator: COMPARATORS.GREATER_THAN,
      warningThreshold: [0.25],
    });
    expect(wrapper.text()).toContain('(severity: critical)');
  });

  it('should include inclusive range comparators in threshold options', async () => {
    const expression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.load.1',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };
    const { wrapper, update } = await setup(expression as MetricExpression);
    wrapper.find('button[data-test-subj="thresholdPopover"]').simulate('click');
    await update();

    const comparatorOptionValues = wrapper
      .find('select[data-test-subj="comparatorOptionsComboBox"] option')
      .map((option) => option.prop('value'));

    expect(comparatorOptionValues).toContain(COMPARATORS.BETWEEN_INCLUSIVE);
    expect(comparatorOptionValues).toContain(COMPARATORS.NOT_BETWEEN_INCLUSIVE);
  });

  describe('warning threshold', () => {
    const baseExpression: MetricExpression = {
      comparator: COMPARATORS.GREATER_THAN,
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
          field: 'system.load.1',
        },
      ],
      threshold: [0.5],
      timeSize: 1,
      timeUnit: 'm',
    };

    it('shows an "Add warning threshold" button when no warning threshold is set', async () => {
      const { wrapper } = await setup(baseExpression);
      expect(
        wrapper.find('button[data-test-subj="o11yExpressionRowAddWarningThresholdButton"]').exists()
      ).toBe(true);
      expect(
        wrapper
          .find('button[data-test-subj="o11yExpressionRowRemoveWarningThresholdButton"]')
          .exists()
      ).toBe(false);
    });

    it('adds an empty warning threshold when the toggle is clicked', async () => {
      const setRuleParams = jest.fn();
      const { wrapper, update } = await setup(baseExpression, setRuleParams);

      wrapper
        .find('button[data-test-subj="o11yExpressionRowAddWarningThresholdButton"]')
        .simulate('click');
      await update();

      expect(setRuleParams).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          warningComparator: baseExpression.comparator,
          warningThreshold: [],
        })
      );
    });

    it('opens the warning threshold value popover immediately after the toggle is clicked', async () => {
      const { wrapper, update } = await setup(baseExpression);

      expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]').exists()).toBe(false);

      wrapper
        .find('button[data-test-subj="o11yExpressionRowAddWarningThresholdButton"]')
        .simulate('click');
      await update();

      expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]').exists()).toBe(true);
    });

    it('renders both threshold rows with Alert/Warning badges once a warning threshold exists', async () => {
      const { wrapper } = await setup({
        ...baseExpression,
        warningComparator: COMPARATORS.GREATER_THAN,
        warningThreshold: [0.25],
      });

      expect(
        wrapper
          .find('button[data-test-subj="o11yExpressionRowRemoveWarningThresholdButton"]')
          .exists()
      ).toBe(true);
      expect(wrapper.text()).toContain('Alert');
      expect(wrapper.text()).toContain('Warning');
    });

    it('does not auto-open the popover when mounting with an already-configured warning threshold', async () => {
      // e.g. opening the edit flyout for an existing rule that already has a
      // warning threshold — only a fresh click on "Add warning threshold"
      // should force the popover open, not every render of an existing one.
      const { wrapper } = await setup({
        ...baseExpression,
        warningComparator: COMPARATORS.GREATER_THAN,
        warningThreshold: [0.25],
      });

      expect(wrapper.find('[data-test-subj="comparatorOptionsComboBox"]').exists()).toBe(false);
    });
  });
});
