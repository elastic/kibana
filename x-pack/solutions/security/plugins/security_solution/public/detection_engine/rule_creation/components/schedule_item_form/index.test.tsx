/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { ScheduleItem } from '.';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';

describe('ScheduleItem', () => {
  it('renders correctly', () => {
    const mockField = useFormFieldMock<string>();
    const wrapper = shallow(
      <ScheduleItem
        dataTestSubj="schedule-item"
        idAria="idAria"
        isDisabled={false}
        field={mockField}
      />
    );

    expect(wrapper.find('[data-test-subj="schedule-item"]')).toHaveLength(1);
  });

  it('accepts a large number via user input', () => {
    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItem
          dataTestSubj="schedule-item"
          idAria="idAria"
          isDisabled={false}
          field={mockField}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: '5000000' } });

    expect(mockField.setValue).toHaveBeenCalledWith('5000000s');
  });

  it('clamps a number value greater than MAX_SAFE_INTEGER to MAX_SAFE_INTEGER', () => {
    const unsafeInput = '99999999999999999999999';

    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItem
          dataTestSubj="schedule-item"
          idAria="idAria"
          isDisabled={false}
          field={mockField}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: unsafeInput } });

    const expectedValue = `${Number.MAX_SAFE_INTEGER}s`;
    expect(mockField.setValue).toHaveBeenCalledWith(expectedValue);
  });

  it('converts a non-numeric value to 0', () => {
    const unsafeInput = 'this is not a number';

    const mockField = useFormFieldMock<string>();
    const wrapper = mount(
      <TestProviders>
        <ScheduleItem
          dataTestSubj="schedule-item"
          idAria="idAria"
          isDisabled={false}
          field={mockField}
        />
      </TestProviders>
    );

    wrapper
      .find('[data-test-subj="interval"]')
      .last()
      .simulate('change', { target: { value: unsafeInput } });

    expect(mockField.setValue).toHaveBeenCalledWith('0s');
  });
});
