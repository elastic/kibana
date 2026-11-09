/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { EuiFilterGroup, EuiProvider } from '@elastic/eui';
import { FILTER_VALUE_CAP } from '../../common/filter_values';
import type { FilterValue } from '../../common/filter_values';
import { facetRows, filterPillText, MultiFacetFilter } from './multi_facet_filter';

const include = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: false }));
const exclude = (...values: string[]): FilterValue[] =>
  values.map((value) => ({ value, exclude: true }));

const BUCKETS = [
  { key: 'Chrome', count: 1200 },
  { key: 'Firefox', count: 333 },
  { key: 'Safari', count: 12 },
];

describe('filterPillText', () => {
  it('names the filter and the value', () => {
    expect(filterPillText('Browser', { value: 'Chrome', exclude: false })).toBe('Browser: Chrome');
  });

  it('puts "not" before the value of an exclusion', () => {
    expect(filterPillText('Browser', { value: 'Chrome', exclude: true })).toBe(
      'Browser: not Chrome'
    );
  });
});

describe('facetRows', () => {
  it('lists the values with their counts', () => {
    expect(facetRows(BUCKETS, [])).toEqual([
      { value: 'Chrome', count: 1200 },
      { value: 'Firefox', count: 333 },
      { value: 'Safari', count: 12 },
    ]);
  });

  it('lists a selected value outside the top values first, without a count', () => {
    expect(facetRows(BUCKETS, [...include('Edge'), ...exclude('Chrome')])).toEqual([
      { value: 'Edge' },
      { value: 'Chrome', count: 1200 },
      { value: 'Firefox', count: 333 },
      { value: 'Safari', count: 12 },
    ]);
  });
});

describe('MultiFacetFilter', () => {
  const formatters = { formatNumber: (value: number) => value.toLocaleString('en-US') };

  const renderFilter = (values: FilterValue[] = [], onChange = jest.fn()) => {
    render(
      <EuiFilterGroup>
        <MultiFacetFilter
          label="Browser"
          buckets={BUCKETS}
          values={values}
          onChange={onChange}
          formatters={formatters}
          isLoading={false}
          ebtElement="test"
          data-test-subj="filter"
        />
      </EuiFilterGroup>,
      { wrapper: EuiProvider }
    );
    fireEvent.click(screen.getByTestId('filter'));
    return onChange;
  };

  it('lists the values with their counts', async () => {
    renderFilter();

    const list = await screen.findByTestId('filterList');
    expect(within(list).getByText('Chrome')).toBeInTheDocument();
    expect(within(list).getByText('1,200')).toBeInTheDocument();
    expect(screen.queryByTestId('filterClear')).not.toBeInTheDocument();
  });

  it('includes a value when its count is clicked, as the count is part of the row', async () => {
    const onChange = renderFilter();

    const list = await screen.findByTestId('filterList');
    fireEvent.click(within(list).getByText('1,200'));

    expect(onChange).toHaveBeenLastCalledWith(include('Chrome'));
  });

  it('includes a value, and excludes another', async () => {
    const onChange = renderFilter(include('Chrome'));

    fireEvent.click(await screen.findByTestId('filterOption-Firefox'));
    expect(onChange).toHaveBeenLastCalledWith(include('Chrome', 'Firefox'));

    fireEvent.click(screen.getByTestId('filterOption-Safari-exclude'));
    expect(onChange).toHaveBeenLastCalledWith([...include('Chrome'), ...exclude('Safari')]);
  });

  it('shows an included value checked and an excluded one pressed', async () => {
    renderFilter([...include('Chrome'), ...exclude('Safari')]);

    expect(await screen.findByTestId('filterOption-Chrome')).toBeChecked();
    expect(screen.getByTestId('filterOption-Firefox')).not.toBeChecked();
    expect(screen.getByTestId('filterOption-Safari-exclude')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('filterOption-Chrome-exclude')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('switches an included value to excluded, and removes a value picked again', async () => {
    const onChange = renderFilter(include('Chrome'));

    fireEvent.click(await screen.findByTestId('filterOption-Chrome-exclude'));
    expect(onChange).toHaveBeenLastCalledWith(exclude('Chrome'));

    fireEvent.click(screen.getByTestId('filterOption-Chrome'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('clears the selection', async () => {
    const onChange = renderFilter(include('Chrome', 'Firefox'));

    fireEvent.click(await screen.findByTestId('filterClear'));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('narrows the list to the values that match the search, in any case', async () => {
    renderFilter();

    fireEvent.change(await screen.findByTestId('filterSearch'), { target: { value: 'FIRE' } });

    expect(screen.getByTestId('filterOption-Firefox')).toBeInTheDocument();
    expect(screen.queryByTestId('filterOption-Chrome')).not.toBeInTheDocument();
  });

  it('says when no value matches the search', async () => {
    renderFilter();

    fireEvent.change(await screen.findByTestId('filterSearch'), { target: { value: 'zzz' } });

    expect(screen.getByText('No values')).toBeInTheDocument();
  });

  it('shows the filter and how many values it selects on the button, not the values', () => {
    renderFilter([...include('Chrome', 'Firefox'), ...exclude('Safari')]);

    expect(screen.getByTestId('filter')).toHaveTextContent('Browser');
    expect(screen.getByTestId('filter')).toHaveTextContent('3');
    expect(screen.getByTestId('filter')).not.toHaveTextContent('Chrome');
  });

  it('shows no count without a selection', () => {
    renderFilter();

    expect(screen.getByTestId('filter')).toHaveTextContent(/^Browser$/);
  });

  it('says why a value cannot be picked once the filter has all the values it takes', async () => {
    const selected = include(
      ...Array.from({ length: FILTER_VALUE_CAP }, (_, index) => `v${index}`)
    );
    renderFilter(selected);

    expect(await screen.findByTestId('filterLimitNote')).toBeInTheDocument();
    // Another value cannot be picked, nor left out; the ones picked can still be undone.
    expect(screen.getByTestId('filterOption-Chrome')).toBeDisabled();
    expect(screen.getByTestId('filterOption-Chrome-exclude')).toBeDisabled();
    expect(screen.getByTestId('filterOption-v0')).toBeEnabled();
    expect(screen.getByTestId('filterOption-v0-exclude')).toBeEnabled();
  });

  it('says nothing about a limit below the cap', async () => {
    renderFilter(include('Chrome'));

    expect(await screen.findByTestId('filterOption-Firefox')).toBeEnabled();
    expect(screen.queryByTestId('filterLimitNote')).not.toBeInTheDocument();
  });
});
