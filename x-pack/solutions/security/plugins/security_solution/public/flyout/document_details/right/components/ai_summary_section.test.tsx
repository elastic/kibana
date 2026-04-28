/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DocumentDetailsContext } from '../../shared/context';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { AISummarySection } from './ai_summary_section';
import { AI_SUMMARY_TEST_ID } from './test_ids';
import { getRawData } from '../../../../assistant/helpers';

const MOCK_ALERT_SUMMARY_SECTION_STUB_TEST_ID = 'alert-summary-section-stub';

const mockAlertSummarySection = jest.fn();

jest.mock('../../../shared/alert_summary', () => ({
  AlertSummarySection: (props: Record<string, unknown>) => {
    mockAlertSummarySection(props);
    return (
      <div
        data-test-subj={
          (props['data-test-subj'] as string) ?? MOCK_ALERT_SUMMARY_SECTION_STUB_TEST_ID
        }
      />
    );
  },
}));

const renderAISummarySection = () =>
  render(
    <DocumentDetailsContext.Provider value={mockContextValue}>
      <AISummarySection />
    </DocumentDetailsContext.Provider>
  );

describe('<AISummarySection />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the shared AlertSummarySection with the wrapper data-test-subj', () => {
    const { getByTestId } = renderAISummarySection();

    expect(getByTestId(AI_SUMMARY_TEST_ID)).toBeInTheDocument();
  });

  it('forwards the alert id and prompt context derived from the document details context', async () => {
    renderAISummarySection();

    expect(mockAlertSummarySection).toHaveBeenCalledTimes(1);
    const props = mockAlertSummarySection.mock.calls[0][0];

    expect(props.alertId).toBe(mockContextValue.eventId);
    expect(props['data-test-subj']).toBe(AI_SUMMARY_TEST_ID);
    expect(typeof props.getPromptContext).toBe('function');

    await expect(props.getPromptContext()).resolves.toEqual(
      getRawData(mockContextValue.dataFormattedForFieldBrowser)
    );
  });
});
