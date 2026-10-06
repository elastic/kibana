/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import { NoteManagementPage } from './note_management_page';
import { TestProviders } from '../../common/mock';
import { useSuggestUsers } from '../../common/components/user_profiles/use_suggest_users';

jest.mock('../../common/components/user_profiles/use_suggest_users');
jest.mock('../components/search_row', () => ({
  SearchRow: () => <div data-test-subj="notes-search-row" />,
}));
jest.mock('../components/utility_bar', () => ({
  NotesUtilityBar: () => <div data-test-subj="notes-utility-bar" />,
}));

const mockDispatch = jest.fn();
jest.mock('react-redux-v7', () => {
  const original = jest.requireActual('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

const renderPage = () =>
  render(
    <TestProviders>
      <MemoryRouter>
        <NoteManagementPage />
      </MemoryRouter>
    </TestProviders>
  );

describe('NoteManagementPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSuggestUsers as jest.Mock).mockReturnValue({ isLoading: false, data: [] });
  });

  it('should render the app header with the page title', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Notes');
  });

  it('should render the search row, utility bar and fetch notes on mount', () => {
    renderPage();

    expect(screen.getByTestId('notes-search-row')).toBeInTheDocument();
    expect(screen.getByTestId('notes-utility-bar')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalled();
  });
});
