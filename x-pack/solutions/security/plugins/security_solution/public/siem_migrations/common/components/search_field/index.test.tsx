/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SearchField } from '.';

describe('SearchField', () => {
  const onSearch = jest.fn();

  it('renders the component', () => {
    const { getByTestId } = render(<SearchField onSearch={onSearch} />);
    expect(getByTestId('searchField')).toBeInTheDocument();
  });

  it('calls onSearch when the search button is clicked', () => {
    const { getByTestId } = render(<SearchField onSearch={onSearch} initialValue="" />);
    fireEvent.change(getByTestId('searchField'), { target: { value: 'test' } });
    fireEvent.keyDown(getByTestId('searchField'), { key: 'Enter', code: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('test');
  });
});
