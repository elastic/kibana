/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import { RuleSearchField } from './rule_search_field';

describe('RuleSearchField', () => {
  it('renders without initial value', () => {
    render(<RuleSearchField onSearch={jest.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('renders with initial value', () => {
    render(<RuleSearchField initialValue="some initial value" onSearch={jest.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('some initial value');
  });

  it('renders with an updated initial value', () => {
    const { rerender } = render(
      <RuleSearchField initialValue="some initial value" onSearch={jest.fn()} />
    );

    rerender(<RuleSearchField initialValue="some updated initial value" onSearch={jest.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('some updated initial value');
  });

  it('updates the initial value after editing the value', () => {
    const { rerender } = render(
      <RuleSearchField initialValue="some initial value" onSearch={jest.fn()} />
    );
    const input = screen.getByRole<HTMLInputElement>('searchbox');

    fireEvent.change(input, { target: { value: 'custom value' } });

    rerender(<RuleSearchField initialValue="some updated initial value" onSearch={jest.fn()} />);

    expect(screen.getByRole('searchbox')).toHaveValue('some updated initial value');
  });

  it('fires onSearch', () => {
    const searchHandler = jest.fn();

    render(<RuleSearchField initialValue="some initial value" onSearch={searchHandler} />);
    const input = screen.getByRole<HTMLInputElement>('searchbox');

    fireEvent.change(input, { target: { value: 'input text' } });

    expect(searchHandler).toHaveBeenCalledWith('input text');
  });
});
