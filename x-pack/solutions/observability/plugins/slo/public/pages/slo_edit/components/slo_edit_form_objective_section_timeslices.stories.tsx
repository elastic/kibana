/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StoryFn } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import { SloEditFormObjectiveSectionTimeslices as Component } from './objective_section/objective_section_timeslices';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import { SloFormContextProvider } from './slo_form_context';

export default {
  component: Component,
  title: 'app/SLO/EditPage/SloEditFormObjectiveSectionTimeslices',
  decorators: [KibanaReactStorybookDecorator],
};

interface StoryArgs {
  isFlyout?: boolean;
}

const Template: StoryFn<StoryArgs> = ({ isFlyout = false }) => {
  const methods = useForm({ defaultValues: SLO_EDIT_FORM_DEFAULT_VALUES });
  return (
    <FormProvider {...methods}>
      <SloFormContextProvider value={{ isFlyout }}>
        <Component />
      </SloFormContextProvider>
    </FormProvider>
  );
};

export const FullPage = {
  render: Template,
  args: {
    isFlyout: false,
  },
};

export const Flyout = {
  render: Template,
  args: {
    isFlyout: true,
  },
};
