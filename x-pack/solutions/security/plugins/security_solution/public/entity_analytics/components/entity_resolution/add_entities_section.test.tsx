/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { AddEntitiesSection } from './add_entities_section';
import {
  ADD_ENTITIES_ACCORDION_TEST_ID,
  ADD_ENTITIES_SECTION_TEST_ID,
  ADD_ENTITIES_SEARCH_TEST_ID,
  ADD_ENTITIES_TABLE_TEST_ID,
  ADD_ENTITIES_SHOWING_TEST_ID,
} from './test_ids';
import { useSearchEntities } from './hooks/use_search_entities';

jest.mock('./hooks/use_search_entities');

const mockUseSearchEntities = useSearchEntities as jest.Mock;

const mockRecords = [
  {
    'entity.name': 'bob',
    'entity.id': 'bob-id',
    'entity.source': 'logs-azure',
    'entity.lifecycle.last_seen': '2026-04-09T10:00:00.000Z',
    'entity.risk.calculated_score_norm': 85.5,
  },
  {
    'entity.name': 'charlie',
    'entity.id': 'charlie-id',
    'entity.source': 'logs-okta',
    'entity.lifecycle.last_seen': '2026-04-08T15:30:00.000Z',
  },
];

describe('AddEntitiesSection', () => {
  const defaultProps = {
    entityType: 'user' as const,
    excludeEntityIds: ['alice-id'],
    onAddEntity: jest.fn(),
    onEntityNameClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchEntities.mockReturnValue({
      data: { records: mockRecords, total: 2 },
      isLoading: false,
    });
  });

  it('renders collapsed accordion by default', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID)).toBeInTheDocument();
    const accordionButton = getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button');
    expect(accordionButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders search input and table when expanded', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    // Click to expand
    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    expect(getByTestId(ADD_ENTITIES_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ADD_ENTITIES_SEARCH_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ADD_ENTITIES_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('renders entity rows with all columns when expanded', () => {
    const { getByTestId, getByText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    expect(getByText('bob')).toBeInTheDocument();
    expect(getByText('charlie')).toBeInTheDocument();
    // Column headers
    expect(getByText('Actions')).toBeInTheDocument();
    expect(getByText('Last seen')).toBeInTheDocument();
    expect(getByText('Data source')).toBeInTheDocument();
  });

  it('shows "Showing X-Y of N entities" text', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    expect(getByTestId(ADD_ENTITIES_SHOWING_TEST_ID)).toHaveTextContent(
      'Showing 1-2 of 2 entities'
    );
  });

  it('calls onAddEntity when add button is clicked', () => {
    const { getByTestId, getAllByLabelText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    expect(defaultProps.onAddEntity).toHaveBeenCalledWith(mockRecords[0]);
  });

  it('calls onEntityNameClick when expand button is clicked', () => {
    const { getByTestId, getAllByLabelText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    const expandButtons = getAllByLabelText(/open entity details/i);
    fireEvent.click(expandButtons[0]);

    expect(defaultProps.onEntityNameClick).toHaveBeenCalledWith(mockRecords[0]);
  });

  it('debounces search input', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByRole } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    const searchInput = getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    expect(mockUseSearchEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ searchQuery: '' })
    );

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(mockUseSearchEntities).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchQuery: 'test' })
      );
    });

    jest.useRealTimers();
  });

  it('shows empty table when no results', () => {
    mockUseSearchEntities.mockReturnValue({
      data: { records: [], total: 0 },
      isLoading: false,
    });

    const { getByTestId, getByText, queryByText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    fireEvent.click(getByTestId(ADD_ENTITIES_ACCORDION_TEST_ID).querySelector('button')!);

    expect(getByText(/no items found/i)).toBeInTheDocument();
    expect(queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
