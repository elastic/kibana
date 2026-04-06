/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockAppDataView, mockDataView, mockUxSeries, render } from '../rtl_helpers';
import { FilterLabel } from './filter_label';
import * as useSeriesHook from '../hooks/use_series_filters';
import { buildFilterLabel } from '../../filter_value_label/filter_value_label';
import 'jest-canvas-mock';

jest.setTimeout(10 * 1000);

// FLAKY: https://github.com/elastic/kibana/issues/253320
describe.skip('FilterLabel', function () {
  mockAppDataView();

  const invertFilter = jest.fn();
  jest.spyOn(useSeriesHook, 'useSeriesFilters').mockReturnValue({
    invertFilter,
  } as any);

  it('should render properly', async function () {
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={0}
        removeFilter={jest.fn()}
        dataView={mockDataView}
        series={mockUxSeries}
      />
    );

    await waitFor(async () => {
      expect(await screen.findByText('elastic-co')).toBeInTheDocument();
      expect(await screen.findByText('elastic-co')).toBeInTheDocument();
      expect(await screen.findByText(/web application:/i)).toBeInTheDocument();
      expect(await screen.findByTitle('Delete Web Application: elastic-co')).toBeInTheDocument();
    });
  });

  it('should delete filter', async function () {
    const removeFilter = jest.fn();
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={0}
        removeFilter={removeFilter}
        dataView={mockDataView}
        series={mockUxSeries}
      />
    );

    fireEvent.click(await screen.findByLabelText('Filter actions'));

    fireEvent.click(await screen.findByTestId('deleteFilter'));
    expect(removeFilter).toHaveBeenCalledTimes(1);
    expect(removeFilter).toHaveBeenCalledWith('service.name', 'elastic-co', false);
  });

  it('should invert filter', async function () {
    const removeFilter = jest.fn();
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={0}
        removeFilter={removeFilter}
        dataView={mockDataView}
        series={mockUxSeries}
      />
    );

    fireEvent.click(await screen.findByLabelText('Filter actions'));

    fireEvent.click(await screen.findByTestId('negateFilter'));
    expect(invertFilter).toHaveBeenCalledTimes(1);
    expect(invertFilter).toHaveBeenCalledWith({
      field: 'service.name',
      negate: false,
      value: 'elastic-co',
    });
  });

  it('should display invert filter', async function () {
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={true}
        seriesId={0}
        removeFilter={jest.fn()}
        dataView={mockDataView}
        series={mockUxSeries}
      />
    );

    expect(await screen.findByText('elastic-co')).toBeInTheDocument();
    expect(await screen.findByText(/web application:/i)).toBeInTheDocument();
    expect(await screen.findByTitle('Delete NOT Web Application: elastic-co')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: /delete not web application: elastic-co/i,
      })
    ).toBeInTheDocument();
  });

  it('should build filter meta', function () {
    expect(
      buildFilterLabel({
        field: 'user_agent.name',
        label: 'Browser family',
        dataView: mockDataView,
        value: 'Firefox',
        negate: false,
      })
    ).toEqual({
      meta: {
        alias: null,
        disabled: false,
        index: 'apm-*',
        key: 'Browser family',
        negate: false,
        type: 'phrase',
        value: 'Firefox',
      },
      query: {
        match_phrase: {
          'user_agent.name': 'Firefox',
        },
      },
    });
  });
});
