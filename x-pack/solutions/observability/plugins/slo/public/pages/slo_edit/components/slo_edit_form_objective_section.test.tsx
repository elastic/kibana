/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { TimeWindowType } from '@kbn/slo-schema';
import { render } from '../../../utils/test_helper';
import { SLO_EDIT_FORM_DEFAULT_VALUES } from '../constants';
import type { CreateSLOForm } from '../types';
import { SloEditFormObjectiveSection } from './slo_edit_form_objective_section';

// The sync field selector resolves a data view from the indicator, irrelevant to the time window.
jest.mock('./indicator_section/custom_common/use_indicator_data_view', () => ({
  useIndicatorDataView: () => ({ dataView: undefined, loading: false }),
}));

const renderSection = (defaultValues: CreateSLOForm) => {
  function Wrapper() {
    const methods = useForm<CreateSLOForm>({ defaultValues, mode: 'all' });
    return (
      <FormProvider {...methods}>
        <SloEditFormObjectiveSection />
      </FormProvider>
    );
  }

  render(<Wrapper />);
};

const selectTimeWindowType = (value: TimeWindowType) =>
  fireEvent.change(screen.getByTestId('sloFormTimeWindowTypeSelect'), { target: { value } });

const getDurationSelect = () => screen.getByTestId('sloFormTimeWindowDurationSelect');

describe('<SloEditFormObjectiveSection /> time window', () => {
  it('picks the default duration of the selected time window type on create', () => {
    renderSection(SLO_EDIT_FORM_DEFAULT_VALUES);

    selectTimeWindowType('calendarAligned');
    expect(getDurationSelect()).toHaveValue('1M');

    selectTimeWindowType('rolling');
    expect(getDurationSelect()).toHaveValue('30d');
  });

  it('falls back to the initial duration when it is valid for the selected type on edit', () => {
    renderSection({
      ...SLO_EDIT_FORM_DEFAULT_VALUES,
      timeWindow: { type: 'calendarAligned', duration: '1w' },
    });

    selectTimeWindowType('rolling');
    expect(getDurationSelect()).toHaveValue('30d');

    selectTimeWindowType('calendarAligned');
    expect(getDurationSelect()).toHaveValue('1w');
  });
});
