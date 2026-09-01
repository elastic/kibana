/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { ListsSearchBar } from '.';

describe('ListsSearchBar', () => {
  it('calls onInputChange with the typed value when user types in the search input', () => {
    const onInputChange = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <ListsSearchBar onSearch={jest.fn()} onInputChange={onInputChange} />
      </TestProviders>
    );

    const input = getByTestId('exceptionsHeaderSearchInput');
    fireEvent.input(input, { target: { value: 'foo' } });

    expect(onInputChange).toHaveBeenCalledWith('foo');
  });

  it('calls onInputChange with empty string when user clears the input', () => {
    const onInputChange = jest.fn();

    const { getByTestId } = render(
      <TestProviders>
        <ListsSearchBar onSearch={jest.fn()} onInputChange={onInputChange} />
      </TestProviders>
    );

    const input = getByTestId('exceptionsHeaderSearchInput');
    fireEvent.input(input, { target: { value: 'foo' } });
    fireEvent.input(input, { target: { value: '' } });

    expect(onInputChange).toHaveBeenCalledTimes(2);
    expect(onInputChange).toHaveBeenLastCalledWith('');
  });

  it('does not throw when onInputChange is not provided', () => {
    const { getByTestId } = render(
      <TestProviders>
        <ListsSearchBar onSearch={jest.fn()} />
      </TestProviders>
    );

    const input = getByTestId('exceptionsHeaderSearchInput');
    expect(() => {
      fireEvent.input(input, { target: { value: 'foo' } });
    }).not.toThrow();
  });
});
