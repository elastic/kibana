/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AlertSelectionQuery } from '.';
import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';

jest.mock('../../../../../common/lib/kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

describe('AlertSelectionQuery', () => {
  const defaultProps = {
    filterManager: jest.fn() as unknown as FilterManager,
    settings: {
      end: 'now',
      filters: [],
      query: { query: '', language: 'kuery' },
      size: 100,
      start: 'now-15m',
    },
    onSettingsChanged: jest.fn(),
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
