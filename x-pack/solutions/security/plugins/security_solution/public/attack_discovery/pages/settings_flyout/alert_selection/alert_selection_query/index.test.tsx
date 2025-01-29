/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { AlertSelectionQuery } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useSourcererDataView } from '../../../../../sourcerer/containers';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;

describe('AlertSelectionQuery', () => {
  const defaultProps = {
    end: 'now',
    filters: [],
    query: { query: '', language: 'kuery' },
    setEnd: jest.fn(),
    setFilters: jest.fn(),
    setQuery: jest.fn(),
    setStart: jest.fn(),
    start: 'now-15m',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);
  });

  it('renders the SearchBar', () => {
    render(
      <TestProviders>
        <AlertSelectionQuery {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('mockSearchBar')).toBeInTheDocument();
  });

  it('renders the date picker', () => {
    render(
      <TestProviders>
        <AlertSelectionQuery {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('alertSelectionDatePicker')).toBeInTheDocument();
  });
});
