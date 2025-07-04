/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, StoryFn } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { decorateWithGlobalStorybookThemeProviders } from '../../../../test_utils/use_global_storybook_theme';
import {
  Aggregators,
  CustomMetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';
import { TimeUnitChar } from '../../../../../common';

import { CustomEquationEditor, CustomEquationEditorProps } from './custom_equation_editor';
import { aggregationType } from '../expression_row';
import { MetricExpression } from '../../types';
import { validateCustomThreshold } from '../validation';

const BASE_ARGS: Partial<CustomEquationEditorProps> = {
  expression: {
    metrics: [
      {
        name: 'A',
        aggType: Aggregators.COUNT,
      },
    ],
    timeSize: 1,
    timeUnit: 'm' as TimeUnitChar,
    threshold: [1],
    comparator: COMPARATORS.GREATER_THAN,
  },
  fields: [
    { name: 'system.cpu.user.pct', normalizedType: 'number' },
    { name: 'system.cpu.system.pct', normalizedType: 'number' },
    { name: 'system.cpu.cores', normalizedType: 'number' },
  ],
  aggregationTypes: aggregationType,
};

export default {
  title: 'app/Alerts/CustomEquationEditor',
  decorators: [
    (wrappedStory) => <div style={{ width: 550 }}>{wrappedStory()}</div>,
    decorateWithGlobalStorybookThemeProviders,
  ],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onChange: { action: 'changed' },
  },
} as Meta;

const fakeDataView = {
  title: 'metricbeat-*',
  fields: [
    {
      name: 'system.cpu.user.pct',
      type: 'number',
    },
    {
      name: 'system.cpu.system.pct',
      type: 'number',
    },
    {
      name: 'system.cpu.cores',
      type: 'number',
    },
  ],
};

const CustomEquationEditorTemplate: StoryFn<CustomEquationEditorProps> = (args) => {
  const [expression, setExpression] = useState<MetricExpression>(args.expression);
  const [errors, setErrors] = useState<IErrorObject>(args.errors);

  const handleExpressionChange = useCallback(
    (exp: MetricExpression) => {
      setExpression(exp);
      args.onChange(exp);
      return exp;
    },
    [args]
  );

  useEffect(() => {
    const validationObject = validateCustomThreshold({
      criteria: [expression as CustomMetricExpressionParams],
      searchConfiguration: {},
      uiSettings: {} as IUiSettingsClient,
    });
    setErrors(validationObject.errors[0]);
  }, [expression]);

  return (
    <CustomEquationEditor
      {...args}
      errors={errors}
      expression={expression}
      onChange={handleExpressionChange}
      dataView={fakeDataView}
    />
  );
};

export const CustomEquationEditorDefault = {
  render: CustomEquationEditorTemplate,

  args: {
    ...BASE_ARGS,
    errors: {},
  },
};

export const CustomEquationEditorWithEquationErrors = {
  render: CustomEquationEditorTemplate,

  args: {
    ...BASE_ARGS,
    expression: {
      equation: 'Math.round(A / B)',
      metrics: [
        { name: 'A', aggType: Aggregators.AVERAGE, field: 'system.cpu.user.pct' },
        { name: 'B', aggType: Aggregators.MAX, field: 'system.cpu.cores' },
      ],
      timeSize: 1,
      timeUnit: 'm' as TimeUnitChar,
      threshold: [1],
      comparator: COMPARATORS.GREATER_THAN,
    },
    errors: {
      equation:
        'The equation field only supports the following characters: A-Z, +, -, /, *, (, ), ?, !, &, :, |, >, <, =',
    },
  },
};

export const CustomEquationEditorWithFieldError = {
  render: CustomEquationEditorTemplate,
};
