/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationFormattedText } from './investigation_formatted_text';

const renderText = (text: string) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <InvestigationFormattedText text={text} />
      </EuiProvider>
    </I18nProvider>
  );

describe('InvestigationFormattedText', () => {
  it('renders a time tag as a time element, not as raw markup', () => {
    const { container } = renderText('Began at <time datetime="2020-11-24T17:20:00Z"></time>.');

    expect(screen.getByTestId('agenticInvestigationsMarkdownTime')).toHaveAttribute(
      'datetime',
      '2020-11-24T17:20:00Z'
    );
    expect(container).not.toHaveTextContent('<time');
  });

  it('renders prose without a time tag as markdown', () => {
    renderText('**bold** and `code`');

    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.getByText('code').tagName).toBe('CODE');
  });
});
