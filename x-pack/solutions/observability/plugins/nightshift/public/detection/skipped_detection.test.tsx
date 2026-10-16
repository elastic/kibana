/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { getSkipReasonLabel, SkippedDetectionBadge } from './skipped_detection';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: () => 'YYYY-MM-DD HH:mm',
}));

const renderBadge = (skip: Parameters<typeof SkippedDetectionBadge>[0]['skip']) =>
  render(
    <I18nProvider>
      <SkippedDetectionBadge skip={skip} />
    </I18nProvider>
  );

describe('getSkipReasonLabel', () => {
  it.each(['still_breaching', 'still_healthy'])('explains %s in words', (reason) => {
    expect(getSkipReasonLabel({ reason })).not.toBe(reason);
    expect(getSkipReasonLabel({ reason })).toContain('nothing changed');
  });

  it('shows a reason it does not know as stored', () => {
    expect(getSkipReasonLabel({ reason: 'some_new_reason' })).toBe('some_new_reason');
  });
});

describe('SkippedDetectionBadge', () => {
  it('shows a Skipped badge', () => {
    renderBadge({ reason: 'still_breaching' });

    expect(screen.getByTestId('nightshiftSkippedDetectionBadge')).toHaveTextContent('Skipped');
  });

  it('explains why on hover, and when it was checked', async () => {
    renderBadge({ reason: 'still_breaching', checked_at: '2026-10-16T09:30:00.000Z' });

    fireEvent.mouseOver(screen.getByTestId('nightshiftSkippedDetectionBadge'));

    expect(await screen.findByText('Skipped: no new analysis needed')).toBeInTheDocument();
    expect(screen.getByText(/still matches in the current window/)).toBeInTheDocument();
    expect(screen.getByText(/^Checked 2026-10-16/)).toBeInTheDocument();
  });

  it('leaves out the check time when the marker carries none', async () => {
    renderBadge({ reason: 'still_healthy' });

    fireEvent.mouseOver(screen.getByTestId('nightshiftSkippedDetectionBadge'));

    expect(await screen.findByText(/returns nothing in the current window/)).toBeInTheDocument();
    expect(screen.queryByText(/^Checked/)).not.toBeInTheDocument();
  });
});
