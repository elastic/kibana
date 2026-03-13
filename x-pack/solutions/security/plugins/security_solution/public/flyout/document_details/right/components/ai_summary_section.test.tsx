/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { TestProviders } from '../../../../common/mock';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useExpandSection } from '../../../../flyout_v2/shared/hooks/use_expand_section';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AiSummarySection } from './ai_summary_section';
import { AI_SUMMARY_SECTION_CONTENT_TEST_ID, AI_SUMMARY_SECTION_HEADER_TEST_ID } from './test_ids';

jest.mock('../../../../flyout_v2/shared/hooks/use_expand_section', () => ({
  useExpandSection: jest.fn(),
}));

jest.mock('../../../../common/hooks/use_space_id', () => ({
  useSpaceId: jest.fn(),
}));

jest.mock('react-use/lib/useLocalStorage', () => jest.fn());

jest.mock('../../../../flyout_v2/document/components/alert_summary_options_menu', () => ({
  AlertSummaryOptionsMenu: () => (
    <div data-test-subj="alert-summary-options-menu">{'AlertSummaryOptionsMenu'}</div>
  ),
}));

jest.mock('../../../../flyout_v2/document/components/ai_summary', () => ({
  AiSummary: ({ eventId }: { eventId: string }) => (
    <div data-test-subj="ai-summary-content">{`AiSummary:${eventId}`}</div>
  ),
}));

const renderAiSummarySection = () =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={mockContextValue}>
        <AiSummarySection />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<AiSummarySection />', () => {
  const mockUseExpandSection = jest.mocked(useExpandSection);
  const mockUseSpaceId = jest.mocked(useSpaceId);
  const mockUseLocalStorage = jest.mocked(useLocalStorage);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandSection.mockReturnValue(true);
    mockUseSpaceId.mockReturnValue('default');
    mockUseLocalStorage.mockReturnValue([false, jest.fn(), jest.fn()]);
  });

  it('should render AI summary section header and content', async () => {
    renderAiSummarySection();

    await act(async () => {
      expect(screen.getByTestId(AI_SUMMARY_SECTION_HEADER_TEST_ID)).toHaveTextContent('AI summary');
      expect(screen.getByTestId(AI_SUMMARY_SECTION_CONTENT_TEST_ID)).toBeInTheDocument();
      expect(screen.getByTestId('alert-summary-options-menu')).toBeInTheDocument();
      expect(screen.getByTestId('ai-summary-content')).toHaveTextContent('AiSummary:eventId');
    });
  });

  it('should render the component collapsed if value is false in local storage', async () => {
    mockUseExpandSection.mockReturnValue(false);

    renderAiSummarySection();

    await act(async () => {
      expect(screen.getByTestId(AI_SUMMARY_SECTION_CONTENT_TEST_ID)).not.toBeVisible();
    });
  });

  it('should render the component expanded if value is true in local storage', async () => {
    renderAiSummarySection();

    await act(async () => {
      expect(screen.getByTestId(AI_SUMMARY_SECTION_CONTENT_TEST_ID)).toBeVisible();
    });
  });
});
