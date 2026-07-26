/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { FeedbackButtons, type Feedback } from './feedback_buttons';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockAddSuccess = jest.fn();
const mockIsEnabled = jest.fn();

const POSITIVE_BUTTON_SELECTOR =
  '[data-test-subj="observabilityAgentBuilderFeedbackPositiveButton"]';
const NEGATIVE_BUTTON_SELECTOR =
  '[data-test-subj="observabilityAgentBuilderFeedbackNegativeButton"]';

const renderComponent = (onClickFeedback: jest.Mock) =>
  render(
    <EuiThemeProvider>
      <FeedbackButtons onClickFeedback={onClickFeedback} />
    </EuiThemeProvider>
  );

const getButtons = (container: HTMLElement) => ({
  positiveButton: container.querySelector(POSITIVE_BUTTON_SELECTOR) as HTMLButtonElement,
  negativeButton: container.querySelector(NEGATIVE_BUTTON_SELECTOR) as HTMLButtonElement,
});

describe('FeedbackButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockIsEnabled.mockReturnValue(true);
    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
          },
          feedback: {
            isEnabled: mockIsEnabled,
          },
        },
      },
    });
  });

  it('does not render when feedback is disabled', () => {
    mockIsEnabled.mockReturnValue(false);

    const onClickFeedback = jest.fn();
    const { container, unmount } = renderComponent(onClickFeedback);

    const { positiveButton, negativeButton } = getButtons(container);

    expect(positiveButton).toBeNull();
    expect(negativeButton).toBeNull();

    unmount();
  });

  it('renders the feedback buttons when feedback is enabled', () => {
    const onClickFeedback = jest.fn();
    const { getByText, container, unmount } = renderComponent(onClickFeedback);

    expect(getByText('Was this helpful?')).toBeTruthy();

    const { positiveButton, negativeButton } = getButtons(container);

    expect(positiveButton).toBeTruthy();
    expect(negativeButton).toBeTruthy();
    expect(getByText('Yes')).toBeTruthy();
    expect(getByText('No')).toBeTruthy();

    unmount();
  });

  it.each<{ feedback: Feedback; buttonSelector: string }>([
    { feedback: 'positive', buttonSelector: POSITIVE_BUTTON_SELECTOR },
    { feedback: 'negative', buttonSelector: NEGATIVE_BUTTON_SELECTOR },
  ])('handles $feedback feedback button click correctly', ({ feedback, buttonSelector }) => {
    const onClickFeedback = jest.fn();
    const { container, unmount } = renderComponent(onClickFeedback);

    const { positiveButton, negativeButton } = getButtons(container);
    const clickedButton = container.querySelector(buttonSelector) as HTMLButtonElement;

    // Buttons should be enabled initially
    expect(positiveButton.disabled).toBe(false);
    expect(negativeButton.disabled).toBe(false);

    fireEvent.click(clickedButton);

    // Should invoke callback with correct feedback value
    expect(onClickFeedback).toHaveBeenCalledTimes(1);
    expect(onClickFeedback).toHaveBeenCalledWith(feedback);

    // Should display toast notification
    expect(mockAddSuccess).toHaveBeenCalledTimes(1);
    expect(mockAddSuccess).toHaveBeenCalledWith('Thanks for your feedback');

    // Should disable both buttons after click
    expect(positiveButton.disabled).toBe(true);
    expect(negativeButton.disabled).toBe(true);

    unmount();
  });
});
