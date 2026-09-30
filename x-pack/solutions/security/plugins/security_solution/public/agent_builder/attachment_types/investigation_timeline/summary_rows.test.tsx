/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { renderInvestigationTimelineSummary } from './summary_rows';

const mockOpener = jest.fn((_props: unknown) => null);
jest.mock('./open_timeline_flyout_on_mount', () => ({
  InvestigationTimelineFlyoutOpener: (props: unknown) => mockOpener(props),
}));

const resolveSecurityCanvasContext = jest.fn();

const renderSummary = (data: unknown) =>
  render(
    <I18nProvider>
      {renderInvestigationTimelineSummary({ data }, resolveSecurityCanvasContext)}
    </I18nProvider>
  );

describe('renderInvestigationTimelineSummary', () => {
  beforeEach(() => {
    mockOpener.mockClear();
  });

  it('renders a single row titled with the host, not a row per event', async () => {
    renderSummary({
      attachmentLabel: 'Investigation timeline',
      events: [
        {
          timestamp: '2026-09-11T14:23:32.488Z',
          host: 'WKSTN-RECV01',
          description: 'OUTLOOK.EXE spawned powershell.exe',
        },
        {
          timestamp: '2026-09-11T15:05:32.488Z',
          host: 'SRV-DC01',
          description: 'svc.exe created a ransom note',
        },
      ],
    });

    expect(screen.getByText('Attack timeline')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('attachmentSummaryRowButton')).toHaveAccessibleName(
      'Timeline: WKSTN-RECV01'
    );
    expect(screen.queryByText('OUTLOOK.EXE spawned powershell.exe')).not.toBeInTheDocument();
    expect(screen.queryByText('svc.exe created a ransom note')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('attachmentSummaryRowButton'));

    await waitFor(() => expect(mockOpener).toHaveBeenCalled());
    expect(mockOpener).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'WKSTN-RECV01',
        events: [
          expect.objectContaining({ host: 'WKSTN-RECV01' }),
          expect.objectContaining({ host: 'SRV-DC01' }),
        ],
        resolveSecurityCanvasContext,
      })
    );
  });

  it('titles the row with the host the timeline starts on', () => {
    renderSummary({
      events: [
        {
          timestamp: '2026-09-11T14:23:32.488Z',
          host: 'WKSTN-RECV01',
          description: 'A process started',
        },
      ],
    });

    expect(screen.getByTestId('attachmentSummaryRowButton')).toHaveAccessibleName(
      'Timeline: WKSTN-RECV01'
    );
  });

  it.each([
    ['no events', { events: [] }],
    ['malformed events', { events: [{ timestamp: 't' }] }],
    ['missing data', undefined],
  ])('renders nothing for %s', (_name, data) => {
    const { container } = renderSummary(data);
    expect(container).toBeEmptyDOMElement();
  });
});
