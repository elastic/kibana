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
import { SuggestedPromptCard } from './suggested_prompt_card';

const PROMPT = {
  id: 'chatbot_my_data',
  prompt: 'I want to build a chatbot that answers questions from my data',
};

const wrap = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiThemeProvider>{ui}</EuiThemeProvider>
    </I18nProvider>
  );

describe('SuggestedPromptCard', () => {
  it('renders with the data-test-subj derived from the prompt id', () => {
    wrap(<SuggestedPromptCard prompt={PROMPT} onClick={jest.fn()} />);
    expect(
      screen.getByTestId(`searchGettingStartedSuggestedPrompt-${PROMPT.id}`)
    ).toBeInTheDocument();
  });

  it('displays the prompt text', () => {
    wrap(<SuggestedPromptCard prompt={PROMPT} onClick={jest.fn()} />);
    expect(screen.getByText(PROMPT.prompt)).toBeInTheDocument();
  });

  it('calls onClick with the full prompt object when clicked', () => {
    const onClick = jest.fn();
    wrap(<SuggestedPromptCard prompt={PROMPT} onClick={onClick} />);
    fireEvent.click(screen.getByTestId(`searchGettingStartedSuggestedPrompt-${PROMPT.id}`));
    expect(onClick).toHaveBeenCalledWith(PROMPT);
  });
});
