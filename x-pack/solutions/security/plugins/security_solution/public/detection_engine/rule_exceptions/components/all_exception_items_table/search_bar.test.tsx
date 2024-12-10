/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionsViewerSearchBar } from './search_bar';

describe('ExceptionsViewerSearchBar', () => {
  it('it does not display add exception button if user is read only', () => {
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        isEndpoint={false}
        onSearch={jest.fn()}
        onAddExceptionClick={jest.fn()}
        isSearching={false}
        canAddException
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').exists()).toBeFalsy();
  });

  it('it invokes "onAddExceptionClick" when user selects to add an exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        canAddException={false}
        isEndpoint={false}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
      />
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').at(0).text()).toEqual(
      'Add rule exception'
    );
    expect(mockOnAddExceptionClick).toHaveBeenCalled();
  });

  it('it invokes "onAddExceptionClick" when user selects to add an endpoint exception item', () => {
    const mockOnAddExceptionClick = jest.fn();
    const wrapper = mount(
      <ExceptionsViewerSearchBar
        canAddException={false}
        isEndpoint={true}
        isSearching={false}
        onSearch={jest.fn()}
        onAddExceptionClick={mockOnAddExceptionClick}
      />
    );

    wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"] button').simulate('click');

    expect(wrapper.find('[data-test-subj="exceptionsHeaderAddExceptionBtn"]').at(0).text()).toEqual(
      'Add endpoint exception'
    );
    expect(mockOnAddExceptionClick).toHaveBeenCalled();
  });
});
