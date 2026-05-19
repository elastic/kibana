/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../../common/mock';
import { insightsTab, notesTab } from './tabs';
import { INSIGHTS_TAB_TEST_ID } from '../constants/test_ids';
import { NOTES_DETAILS_TEST_ID } from '../../../flyout_v2/shared/tools/notes/test_ids';

jest.mock('./tabs/insights_tab', () => ({
  InsightsTab: () => <div data-test-subj="insights-tab-content">{'Insights tab'}</div>,
}));

jest.mock('./tabs/notes_tab', () => ({
  NotesTab: () => <div data-test-subj="notes-tab-content">{'Notes tab'}</div>,
}));

describe('tabs', () => {
  describe('insightsTab', () => {
    it('has id "insights"', () => {
      expect(insightsTab.id).toBe('insights');
    });

    it('has the correct data-test-subj', () => {
      expect(insightsTab['data-test-subj']).toBe(INSIGHTS_TAB_TEST_ID);
    });

    it('renders name as "Insights"', () => {
      render(<TestProviders>{insightsTab.name}</TestProviders>);
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('has content that renders the Insights tab component', () => {
      render(<TestProviders>{insightsTab.content}</TestProviders>);
      expect(screen.getByTestId('insights-tab-content')).toBeInTheDocument();
      expect(screen.getByText('Insights tab')).toBeInTheDocument();
    });
  });

  describe('notesTab', () => {
    it('has id "notes"', () => {
      expect(notesTab.id).toBe('notes');
    });

    it('has the correct data-test-subj', () => {
      expect(notesTab['data-test-subj']).toBe(NOTES_DETAILS_TEST_ID);
    });

    it('renders name as "Notes"', () => {
      render(<TestProviders>{notesTab.name}</TestProviders>);
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('has content that renders the Notes tab component', () => {
      render(<TestProviders>{notesTab.content}</TestProviders>);
      expect(screen.getByTestId('notes-tab-content')).toBeInTheDocument();
      expect(screen.getByText('Notes tab')).toBeInTheDocument();
    });
  });
});
