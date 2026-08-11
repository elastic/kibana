/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { ScriptLibrarySearchTermFilter } from './script_library_search_term_filter';
import { useScriptLibraryUrlParams as _useScriptLibraryUrlParams } from '../script_library_url_params';

jest.mock('../script_library_url_params');
const useScriptLibraryUrlParamsMock = _useScriptLibraryUrlParams as jest.Mock;

describe('ScriptLibrarySearchTermFilter', () => {
  let render: (
    props?: React.ComponentProps<typeof ScriptLibrarySearchTermFilter>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;
  let mockOnChangeSearch: jest.Mock;
  let mockSetUrlSearchTermsFilter: jest.Mock;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockOnChangeSearch = jest.fn();
    mockSetUrlSearchTermsFilter = jest.fn();

    useScriptLibraryUrlParamsMock.mockReturnValue({
      searchTerms: [],
      setUrlSearchTermsFilter: mockSetUrlSearchTermsFilter,
    });

    render = (props?: React.ComponentProps<typeof ScriptLibrarySearchTermFilter>) => {
      renderResult = mockedContext.render(
        <ScriptLibrarySearchTermFilter
          onChangeSearch={mockOnChangeSearch}
          {...props}
          data-test-subj="test"
        />
      );
      return renderResult;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the search field with proper default test subject', () => {
      render();

      const { getByTestId } = renderResult;
      expect(getByTestId('test-search-terms-filter-search')).toBeInTheDocument();
    });

    it('should render with correct placeholder text', () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;
      expect(searchField.placeholder).toContain(
        'Search by script name, description, created by, updated by, file name or file SHA256 hash'
      );
    });
  });

  describe('Input Change Handling', () => {
    it('should clear search terms and call callbacks when input is cleared', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'test-term');
      await userEvent.clear(searchField);

      expect(mockOnChangeSearch).toHaveBeenCalledWith([]);
      expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('');
    });

    it('should not call onChangeSearch when clearing empty search field', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      mockOnChangeSearch.mockClear();
      await userEvent.clear(searchField);

      expect(mockOnChangeSearch).not.toHaveBeenCalled();
      expect(mockSetUrlSearchTermsFilter).not.toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should parse comma-separated terms on search', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'term1,term2,term3');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term1', 'term2', 'term3']);
      expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('term1,term2,term3');
    });

    it('should trim whitespace from search terms', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, '  term1  ,  term2  ,  term3  ');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term1', 'term2', 'term3']);
      expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('term1,term2,term3');
    });

    it('should not include empty strings in parsed terms', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'term1,,term2,,,term3');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term1', 'term2', 'term3']);
      expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('term1,term2,term3');
    });

    it('should update URL params with joined search terms', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'term1,term2');
      await userEvent.keyboard('{Enter}');

      expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('term1,term2');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear search field and call callbacks on clear button click', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'test-term');
      expect(searchField.value).toBe('test-term');

      const clearButton = getByTestId('clearSearchButton');
      expect(clearButton).toBeInTheDocument();
      await userEvent.click(clearButton);

      await waitFor(() => {
        expect(mockOnChangeSearch).toHaveBeenCalledWith([]);
      });
    });

    it('should update search when last character is removed via backspace', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'test-term');
      expect(searchField.value).toBe('test-term');

      // Simulate backspace key presses to remove all characters
      for (let i = 0; i < 'test-term'.length; i++) {
        await userEvent.keyboard('{Backspace}');
      }

      await waitFor(() => {
        expect(mockOnChangeSearch).toHaveBeenCalledWith([]);
        expect(mockSetUrlSearchTermsFilter).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single search term without comma', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'singleTerm');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['singleTerm']);
    });

    it('should handle trailing commas', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'term1,term2,');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term1', 'term2']);
    });

    it('should handle leading commas', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, ',term1,term2');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term1', 'term2']);
    });

    it('should handle special characters in search terms', async () => {
      render();

      const { getByTestId } = renderResult;
      const searchField = getByTestId('test-search-terms-filter-search') as HTMLInputElement;

      await userEvent.type(searchField, 'term-1,term_2,term.3');
      await userEvent.keyboard('{Enter}');

      expect(mockOnChangeSearch).toHaveBeenCalledWith(['term-1', 'term_2', 'term.3']);
    });
  });
});
