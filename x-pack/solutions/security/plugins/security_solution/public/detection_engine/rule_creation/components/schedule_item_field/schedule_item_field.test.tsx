/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { ScheduleItemField } from './schedule_item_field';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';

describe('ScheduleItemField', () => {
  it('renders correctly', () => {
    const mockField = useFormFieldMock<string>();
    const wrapper = shallow(
      <ScheduleItemField field={mockField} dataTestSubj="schedule-item" idAria="idAria" />
    );

    expect(wrapper.find('[data-test-subj="schedule-item"]')).toHaveLength(1);
  });

  it('accepts user input', () => {
    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItemField field={mockField} dataTestSubj="schedule-item" idAria="idAria" />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: '5000000' } });

    expect(mockField.setValue).toHaveBeenCalledWith('5000000s');
  });

  it(`uses the "units" prop when it's passed`, async () => {
    const mockField = useFormFieldMock<string>({ value: '7d' });
    const wrapper = mount(
      <TestProviders>
        <ScheduleItemField
          field={mockField}
          units={['m', 'h', 'd']}
          dataTestSubj="schedule-item"
          idAria="idAria"
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="interval"]').last().prop('value')).toEqual(7);
    expect(wrapper.find('[data-test-subj="timeType"]').last().prop('value')).toEqual('d');

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: '8' } });

    expect(mockField.setValue).toHaveBeenCalledWith('8d');
  });

  it.each([
    [-10, -5],
    [-5, 0],
    [5, 10],
    [60, 90],
  ])('saturates a value "%s" lower than minValue', (unsafeInput, expected) => {
    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItemField
          field={mockField}
          minValue={expected}
          dataTestSubj="schedule-item"
          idAria="idAria"
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: unsafeInput } });

    expect(mockField.setValue).toHaveBeenCalledWith(`${expected}s`);
  });

  it.each([
    [-5, -10],
    [5, 0],
    [10, 5],
    [90, 60],
  ])('saturates a value "%s" greater than maxValue', (unsafeInput, expected) => {
    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItemField
          field={mockField}
          maxValue={expected}
          dataTestSubj="schedule-item"
          idAria="idAria"
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: unsafeInput } });

    expect(mockField.setValue).toHaveBeenCalledWith(`${expected}s`);
  });

  it('skips updating a non-numeric values', () => {
    const unsafeInput = 'this is not a number';

    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItemField field={mockField} dataTestSubj="schedule-item" idAria="idAria" />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: unsafeInput } });

    expect(mockField.setValue).not.toHaveBeenCalled();
  });
});
