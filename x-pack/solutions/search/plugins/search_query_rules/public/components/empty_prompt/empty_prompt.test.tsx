/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EmptyPrompt } from './empty_prompt';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../../common/doc_links', () => ({
  docLinks: {
    queryRulesApi: 'documentation-url',
  },
}));
const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);
const mockGetStartedAction = jest.fn();

const TEST_IDS = {
  getStartedButton: 'searchQueryRulesEmptyPromptGetStartedButton',
  footerLink: 'searchQueryRulesEmptyPromptFooterLink',
};

const ACTIONS = {
  getStarted: () => {
    act(() => {
      fireEvent.click(screen.getByTestId(TEST_IDS.getStartedButton));
    });
  },
};

describe('Query Rules Overview Empty Prompt', () => {
  it('renders correctly', () => {
    render(<EmptyPrompt getStartedAction={mockGetStartedAction} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId(TEST_IDS.getStartedButton)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.footerLink).getAttribute('href')).toBe('documentation-url');
  });

  it('calls getStartedAction when button is clicked', () => {
    render(<EmptyPrompt getStartedAction={mockGetStartedAction} />, { wrapper: Wrapper });
    ACTIONS.getStarted();
    expect(mockGetStartedAction).toHaveBeenCalled();
  });
});
