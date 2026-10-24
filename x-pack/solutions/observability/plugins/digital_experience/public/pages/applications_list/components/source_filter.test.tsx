/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SourceFilter } from './source_filter';

const renderFilter = (selected?: 'otel' | 'classic') => {
  const onChange = jest.fn();
  render(<SourceFilter selected={selected} onChange={onChange} />);
  fireEvent.click(screen.getByTestId('digitalExperienceSourceFilter'));
  return { onChange };
};

const option = (value: string) =>
  screen.getByTestId(`digitalExperienceSourceFilterOption-${value}`);

describe('SourceFilter', () => {
  it('lists every source and both together', () => {
    renderFilter();

    // Not the accessible names: EUI adds screen-reader instructions to them.
    expect(screen.getAllByRole('option').map((element) => element.getAttribute('value'))).toEqual([
      'all',
      'otel',
      'classic',
    ]);
    expect(screen.getByText('EDOT Browser')).toBeInTheDocument();
    expect(screen.getByText('Classic RUM')).toBeInTheDocument();
  });

  it('checks "All sources" when no source is selected', () => {
    renderFilter();

    expect(option('all')).toHaveAttribute('aria-selected', 'true');
  });

  it('selects a source', () => {
    const { onChange } = renderFilter();

    fireEvent.click(option('classic'));

    expect(onChange).toHaveBeenCalledWith('classic');
  });

  it('selects both sources as `undefined`', () => {
    const { onChange } = renderFilter('otel');

    fireEvent.click(option('all'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows the selection on the button', () => {
    renderFilter('classic');

    expect(screen.getByTestId('digitalExperienceSourceFilter')).toHaveTextContent(
      'Source: Classic RUM'
    );
  });

  it('reports opening the filter and picking an option as different clicks', () => {
    renderFilter();

    expect(screen.getByTestId('digitalExperienceSourceFilter')).toHaveAttribute(
      'data-ebt-action',
      'openFilter'
    );
    expect(option('classic')).toHaveAttribute('data-ebt-action', 'setFilter');
    expect(option('classic')).toHaveAttribute('data-ebt-element', 'digitalExperienceSourceFilter');
  });

  it('shows only the label without a selection', () => {
    renderFilter();

    expect(screen.getByTestId('digitalExperienceSourceFilter')).toHaveTextContent(/^Source$/);
  });
});
