/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AddDataSearchBar } from './search_bar';

describe('AddDataSearchBar', () => {
  it('renders the host-provided placeholder and value without any context providers', () => {
    render(
      <AddDataSearchBar
        value="redis"
        onChange={jest.fn()}
        placeholder="Search integrations"
        data-test-subj="searchBar"
      />
    );
    const field = screen.getByTestId('searchBar');
    expect(field).toHaveValue('redis');
    expect(field).toHaveAttribute('placeholder', 'Search integrations');
  });

  it('reports changes through onChange', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <AddDataSearchBar
        value=""
        onChange={onChange}
        placeholder="Search integrations"
        data-test-subj="searchBar"
      />
    );
    await user.type(screen.getByTestId('searchBar'), 'n');
    expect(onChange).toHaveBeenCalledWith('n');
  });
});
