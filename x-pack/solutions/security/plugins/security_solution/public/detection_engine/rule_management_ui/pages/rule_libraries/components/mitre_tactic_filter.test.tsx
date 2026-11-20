/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MitreTacticFilter } from './mitre_tactic_filter';

describe('MitreTacticFilter', () => {
  const openFilter = () => fireEvent.click(screen.getByTestId('ruleLibraryTacticFilter'));

  it('lists the ATT&CK tactics in the order of the matrix', () => {
    render(<MitreTacticFilter selected={[]} onChange={jest.fn()} />);
    openFilter();

    const labels = within(screen.getByTestId('ruleLibraryTacticOptions'))
      .getAllByRole('option')
      .map((option) => option.textContent ?? '');

    expect(labels.indexOf('Initial Access')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Execution')).toBeGreaterThan(labels.indexOf('Initial Access'));
    expect(labels.indexOf('Persistence')).toBeGreaterThan(labels.indexOf('Execution'));
  });

  it('reports the ids of the tactics that are picked', () => {
    const onChange = jest.fn();
    render(<MitreTacticFilter selected={[]} onChange={onChange} />);
    openFilter();

    fireEvent.click(screen.getByRole('option', { name: /^Execution/ }));

    expect(onChange).toHaveBeenCalledWith(['TA0002']);
  });

  it('shows how many tactics are selected and keeps them selected', () => {
    render(<MitreTacticFilter selected={['TA0002', 'TA0003']} onChange={jest.fn()} />);

    expect(screen.getByTestId('ruleLibraryTacticFilter')).toHaveTextContent('2');

    openFilter();
    expect(screen.getByRole('option', { name: /^Execution/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('option', { name: /^Initial Access/ })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('removes a tactic that is unpicked', () => {
    const onChange = jest.fn();
    render(<MitreTacticFilter selected={['TA0002', 'TA0003']} onChange={onChange} />);
    openFilter();

    fireEvent.click(screen.getByRole('option', { name: /^Execution/ }));

    expect(onChange).toHaveBeenCalledWith(['TA0003']);
  });
});
