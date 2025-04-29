/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EmptyPrompt } from './empty_prompt';
import { render, screen } from '@testing-library/react';
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

describe('Query Rules Overview Empty Prompt', () => {
  it('renders', () => {
    render(
      <Wrapper>
        <EmptyPrompt getStartedAction={mockGetStartedAction} />
      </Wrapper>
    );
    expect(screen.getByTestId('searchQueryRulesEmptyPromptGetStartedButton')).toBeInTheDocument();
    expect(screen.getByTestId('searchQueryRulesEmptyPromptFooterLink').getAttribute('href')).toBe(
      'documentation-url'
    );
  });
});
