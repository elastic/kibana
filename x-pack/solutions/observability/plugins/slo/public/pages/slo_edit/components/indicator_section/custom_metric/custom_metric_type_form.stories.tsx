/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';

import { KibanaReactStorybookDecorator } from '../../../../../utils/kibana_react.storybook_decorator';
import { CustomMetricIndicatorTypeForm as Component } from './custom_metric_type_form';
import { SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC } from '../../../constants';

export default {
  component: Component,
  title: 'app/SLO/EditPage/CustomMetric/Form',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: StoryFn<typeof Component> = () => {
  const methods = useForm({ defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES_CUSTOM_METRIC });
  return (
    <FormProvider {...methods}>
      <Component />
    </FormProvider>
  );
};

const defaultProps = {};

export const Form = {
  render: Template,
  args: defaultProps,
};
