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
  ADD_ENTITIES_SECTION_TEST_ID,
  ADD_ENTITIES_SEARCH_TEST_ID,
  ADD_ENTITIES_TABLE_TEST_ID,
} from './test_ids';
import { useSearchEntities } from './hooks/use_search_entities';

jest.mock('./hooks/use_search_entities');

const mockUseSearchEntities = useSearchEntities as jest.Mock;

const mockRecords = [
  { 'entity.name': 'bob', 'entity.id': 'bob-id', 'entity.source': 'logs-azure' },
  { 'entity.name': 'charlie', 'entity.id': 'charlie-id', 'entity.source': 'logs-okta' },
];

describe('AddEntitiesSection', () => {
  const defaultProps = {
    entityType: 'user' as const,
    excludeEntityIds: ['alice-id'],
    onAddEntity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSearchEntities.mockReturnValue({
      data: { records: mockRecords, total: 2 },
      isLoading: false,
    });
  });

  it('renders search input and results table', () => {
    const { getByTestId } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByTestId(ADD_ENTITIES_SECTION_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ADD_ENTITIES_SEARCH_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ADD_ENTITIES_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('renders entity rows', () => {
    const { getByText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByText('bob')).toBeInTheDocument();
    expect(getByText('charlie')).toBeInTheDocument();
  });

  it('calls onAddEntity when add button is clicked', () => {
    const { getAllByLabelText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    const addButtons = getAllByLabelText(/add to resolution group/i);
    fireEvent.click(addButtons[0]);

    expect(defaultProps.onAddEntity).toHaveBeenCalledWith(mockRecords[0]);
  });

  it('debounces search input', async () => {
    jest.useFakeTimers();
    const { getByRole } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    const searchInput = getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Before debounce fires, searchQuery should still be empty
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

    const { getByText } = render(
      <TestProviders>
        <AddEntitiesSection {...defaultProps} />
      </TestProviders>
    );

    expect(getByText(/no items found/i)).toBeInTheDocument();
  });
});
