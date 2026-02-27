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
    synonymsApi: 'documentation-url',
  },
}));
const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

describe('Synonyms Overview Empty Prompt', () => {
  it('renders', () => {
    render(
      <Wrapper>
        <EmptyPrompt getStartedAction={() => {}} />
      </Wrapper>
    );
    expect(screen.getByTestId('searchSynonymsEmptyPromptGetStartedButton')).toBeInTheDocument();
    expect(screen.getByTestId('searchSynonymsEmptyPromptFooterLink').getAttribute('href')).toBe(
      'documentation-url'
    );
  });
});
