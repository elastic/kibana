/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { useFetchCompositeSloSuggestions } from '../../../../hooks/use_fetch_composite_slo_suggestions';
import { useKibana } from '../../../../hooks/use_kibana';
import { render } from '../../../../utils/test_helper';
import { CompositeSloToolbar } from './composite_slo_toolbar';

jest.mock('../../../../hooks/use_kibana');
jest.mock('../../../../hooks/use_fetch_composite_slo_suggestions');

const useKibanaMock = useKibana as jest.Mock;
const useFetchCompositeSloSuggestionsMock = useFetchCompositeSloSuggestions as jest.Mock;

interface MockSearchBarProps {
  dataTestSubj?: string;
  placeholder?: string;
  query?: { query: string; language: string };
  onQuerySubmit: (payload: { query?: { query: string; language: string } }) => void;
  renderQueryInputAppend?: () => React.ReactNode;
}

function MockSearchBar({
  dataTestSubj,
  placeholder,
  query,
  onQuerySubmit,
  renderQueryInputAppend,
}: MockSearchBarProps) {
  const [value, setValue] = useState(query?.query ?? '');
  return (
    <div>
      <input
        data-test-subj={dataTestSubj}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        data-test-subj="querySubmitButton"
        onClick={() => onQuerySubmit({ query: { query: value, language: 'text' } })}
      />
      {renderQueryInputAppend?.()}
    </div>
  );
}

const defaultProps = {
  search: '',
  isLoading: false,
  selectedTags: [],
  onSearchSubmit: jest.fn(),
  onTagSelectionChange: jest.fn(),
};

describe('CompositeSloToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: { unifiedSearch: { ui: { SearchBar: MockSearchBar } } },
    });
    useFetchCompositeSloSuggestionsMock.mockReturnValue({
      suggestions: { tags: [{ label: 'tag-a', value: 'tag-a', count: 1 }] },
    });
  });

  it('renders the search bar', () => {
    render(<CompositeSloToolbar {...defaultProps} />);
    expect(screen.getByTestId('compositeSloListSearch')).toBeInTheDocument();
    expect(screen.getByTestId('querySubmitButton')).toBeInTheDocument();
  });

  it('renders the status filter before the tags filter', () => {
    render(<CompositeSloToolbar {...defaultProps} />);
    const filterTestSubjs = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('data-test-subj'))
      .filter((testSubj) => testSubj?.endsWith('Filter'));
    expect(filterTestSubjs).toEqual(['compositeSloListStatusFilter', 'compositeSloListTagFilter']);
  });

  it('does not render a clear filters button', () => {
    render(<CompositeSloToolbar {...defaultProps} />);
    expect(screen.queryByTestId('compositeSloListClearFilters')).not.toBeInTheDocument();
  });

  it('does not call onSearchSubmit while typing', () => {
    const onSearchSubmit = jest.fn();
    render(<CompositeSloToolbar {...defaultProps} onSearchSubmit={onSearchSubmit} />);
    fireEvent.change(screen.getByTestId('compositeSloListSearch'), {
      target: { value: 'checkout' },
    });
    expect(onSearchSubmit).not.toHaveBeenCalled();
  });

  it('calls onSearchSubmit with the typed value on submit', () => {
    const onSearchSubmit = jest.fn();
    render(<CompositeSloToolbar {...defaultProps} onSearchSubmit={onSearchSubmit} />);
    fireEvent.change(screen.getByTestId('compositeSloListSearch'), {
      target: { value: 'checkout' },
    });
    fireEvent.click(screen.getByTestId('querySubmitButton'));
    expect(onSearchSubmit).toHaveBeenCalledWith('checkout');
  });

  it('calls onSearchSubmit when submitting an unchanged search', () => {
    const onSearchSubmit = jest.fn();
    render(
      <CompositeSloToolbar {...defaultProps} search="payment" onSearchSubmit={onSearchSubmit} />
    );
    fireEvent.click(screen.getByTestId('querySubmitButton'));
    expect(onSearchSubmit).toHaveBeenCalledWith('payment');
  });

  it('reflects the controlled search value', () => {
    render(<CompositeSloToolbar {...defaultProps} search="payment" />);
    expect(screen.getByTestId('compositeSloListSearch')).toHaveValue('payment');
  });
});
