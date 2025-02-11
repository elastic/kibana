/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { EuiFieldText } from '@elastic/eui';

import { ExceptionsFlyoutMeta } from '.';
import { TestProviders } from '../../../../../common/mock';

describe('ExceptionsFlyoutMeta', () => {
  it('it renders component', () => {
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsFlyoutMeta exceptionItemName={'Test name'} onChange={jest.fn()} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionFlyoutName"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="exceptionFlyoutNameInput"]').at(1).props().value).toEqual(
      'Test name'
    );
  });

  it('it calls onChange on name change', () => {
    const mockOnChange = jest.fn();
    const wrapper = mountWithIntl(
      <TestProviders>
        <ExceptionsFlyoutMeta exceptionItemName={''} onChange={mockOnChange} />
      </TestProviders>
    );

    (
      wrapper.find(EuiFieldText).at(0).props() as unknown as {
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      }
    ).onChange({ target: { value: 'Name change' } } as React.ChangeEvent<HTMLInputElement>);

    expect(mockOnChange).toHaveBeenCalledWith(['name', 'Name change']);
  });
});
