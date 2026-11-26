/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { TruncatableSummary } from './truncatable_summary';

jest.mock('./investigation_formatted_text', () => ({
  InvestigationFormattedText: ({ text }: { text: string }) => (
    <div data-test-subj="formattedText">{text}</div>
  ),
}));

const TAG = '<time datetime="2026-11-24T17:20:00Z"></time>';

const renderSummary = (summary: string, maxLength: number) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <TruncatableSummary summary={summary} maxLength={maxLength} toggleTestSubj="toggle" />
      </EuiProvider>
    </I18nProvider>
  );

describe('TruncatableSummary', () => {
  const prefix = 'Errors began at ';

  it('keeps a time tag whole when the cut falls after it', () => {
    renderSummary(
      `${prefix}${TAG} and kept growing for a long while`,
      prefix.length + TAG.length + 4
    );

    expect(screen.getByTestId('formattedText')).toHaveTextContent(`${prefix}${TAG} and...`);
  });

  it.each([
    ['the tag name', 4],
    ['the datetime attribute', 20],
    ['the end of the opening tag', TAG.length - '</time>'.length],
    ['the closing tag', TAG.length - 2],
  ])('drops back to before a tag cut inside %s', (_, offset) => {
    renderSummary(`${prefix}${TAG} and kept growing for a long while`, prefix.length + offset);

    expect(screen.getByTestId('formattedText')).toHaveTextContent('Errors began at ...');
    expect(screen.getByTestId('formattedText')).not.toHaveTextContent('<time');
  });

  it('drops back to before a self-closed or fallback tag cut in the middle', () => {
    const selfClosed = '<time datetime="2026-11-24T17:20:00Z"/>';
    renderSummary(`${prefix}${selfClosed} and more`, prefix.length + selfClosed.length - 1);

    expect(screen.getByTestId('formattedText')).toHaveTextContent('Errors began at ...');
  });

  it('does not treat other tags that start with "time" as time tags', () => {
    renderSummary('See <timeline> for the details of what happened', 20);

    expect(screen.getByTestId('formattedText')).toHaveTextContent('See <timeline> for t...');
  });

  it('shows the full text, tag included, once expanded', async () => {
    const summary = `${prefix}${TAG} and kept growing for a long while`;
    renderSummary(summary, prefix.length + 10);

    await userEvent.click(screen.getByTestId('toggle'));

    expect(screen.getByTestId('formattedText')).toHaveTextContent(summary);
  });
});
