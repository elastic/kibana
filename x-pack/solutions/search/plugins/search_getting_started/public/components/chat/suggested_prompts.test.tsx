/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { DEFAULT_PROMPTS } from '../../../common/prompts';
import { SuggestedPrompts } from './suggested_prompts';
import { useSuggestedPrompts } from '../../hooks/use_suggested_prompts';
import { useOpenAgentBuilder } from '../../hooks/use_open_agent_builder';

jest.mock('../../hooks/use_suggested_prompts');
jest.mock('../../hooks/use_open_agent_builder');

const mockUseSuggestedPrompts = useSuggestedPrompts as jest.Mock;
const mockUseOpenAgentBuilder = useOpenAgentBuilder as jest.Mock;

const FIXED_PROMPTS = DEFAULT_PROMPTS.slice(0, 4);

const wrap = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>{ui}</EuiThemeProvider>
    </I18nProvider>
  );

describe('SuggestedPrompts', () => {
  const mockOpenAgentBuilder = jest.fn();

  beforeEach(() => {
    mockOpenAgentBuilder.mockClear();
    mockUseSuggestedPrompts.mockReturnValue(FIXED_PROMPTS);
    mockUseOpenAgentBuilder.mockReturnValue(mockOpenAgentBuilder);
  });

  it('renders the wrapper with the correct data-test-subj', () => {
    wrap(<SuggestedPrompts />);
    expect(screen.getByTestId('searchGettingStartedSuggestedPrompts')).toBeInTheDocument();
  });

  it('renders one card per prompt returned by useSuggestedPrompts', () => {
    wrap(<SuggestedPrompts />);
    FIXED_PROMPTS.forEach(({ id }) => {
      expect(screen.getByTestId(`searchGettingStartedSuggestedPrompt-${id}`)).toBeInTheDocument();
    });
  });

  it('calls openAgentBuilder with the prompt text when a card is clicked', () => {
    wrap(<SuggestedPrompts />);
    fireEvent.click(
      screen.getByTestId(`searchGettingStartedSuggestedPrompt-${FIXED_PROMPTS[1].id}`)
    );
    expect(mockOpenAgentBuilder).toHaveBeenCalledWith(FIXED_PROMPTS[1].prompt);
  });
});
