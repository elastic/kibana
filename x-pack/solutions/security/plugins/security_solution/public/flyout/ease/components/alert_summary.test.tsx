/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ALERT_SUMMARY_TEST_ID,
  AlertSummary,
  GENERATE_INSIGHTS_BUTTON_TEST_ID,
  REGENERATE_INSIGHTS_BUTTON_TEST_ID,
} from './alert_summary';
import type { PromptContext } from '@kbn/elastic-assistant';
import { useAlertSummary } from '../hooks/use_alert_summary';
import { MESSAGE_TEXT_TEST_ID } from './message_text';

jest.mock('../hooks/use_alert_summary');

const promptContext: PromptContext = {
  category: 'alert',
  description: 'Alert summary',
  getPromptContext: jest
    .fn()
    .mockResolvedValue('{ host.name: "test-host", more.data: 123, "user.name": "test-user"}'),
  id: '_promptContextId',
  suggestedUserPrompt: '_suggestedUserPrompt',
  tooltip: '_tooltip',
  replacements: { 'host.name': '12345' },
};
const defaultProps = {
  alertId: 'test-alert-id',
  canSeeAdvancedSettings: true,
  defaultConnectorId: 'test-connector-id',
  isContextReady: true,
  promptContext,
  setHasAlertSummary: jest.fn(),
  showAnonymizedValues: false,
};

describe('AlertSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: false,
      fetchAISummary: jest.fn(),
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });
  });

  it('should render the loading state when `isLoading` is true', () => {
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: true,
      fetchAISummary: jest.fn(),
      isLoading: true,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });

    render(<AlertSummary {...defaultProps} />);

    expect(screen.getByTestId(ALERT_SUMMARY_TEST_ID)).toBeInTheDocument();
  });

  it('should render the alert summary when `hasAlertSummary` is true and `isLoading` is false', () => {
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: 'Test alert summary',
      recommendedActions: 'Test recommended actions',
      hasAlertSummary: true,
      fetchAISummary: jest.fn(),
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });

    render(<AlertSummary {...defaultProps} />);

    expect(screen.getAllByTestId(MESSAGE_TEXT_TEST_ID)[0]).toHaveTextContent('Test alert summary');
    expect(screen.getAllByTestId(MESSAGE_TEXT_TEST_ID)[1]).toHaveTextContent(
      'Test recommended actions'
    );
  });

  it('should render the generate button when `hasAlertSummary` is false', () => {
    const fetchAISummary = jest.fn();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: '',
      recommendedActions: '',
      hasAlertSummary: false,
      fetchAISummary,
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });

    render(<AlertSummary {...defaultProps} />);

    fireEvent.click(screen.getByTestId(GENERATE_INSIGHTS_BUTTON_TEST_ID));

    expect(fetchAISummary).toHaveBeenCalled();
  });

  it('should render the regenerate button when `hasAlertSummary` is true', () => {
    const fetchAISummary = jest.fn();
    (useAlertSummary as jest.Mock).mockReturnValue({
      alertSummary: 'Test alert summary',
      recommendedActions: 'Test recommended actions',
      hasAlertSummary: true,
      fetchAISummary,
      isLoading: false,
      messageAndReplacements: {
        message: '',
        replacements: {},
      },
    });

    render(<AlertSummary {...defaultProps} />);

    fireEvent.click(screen.getByTestId(REGENERATE_INSIGHTS_BUTTON_TEST_ID));

    expect(fetchAISummary).toHaveBeenCalled();
  });
});
