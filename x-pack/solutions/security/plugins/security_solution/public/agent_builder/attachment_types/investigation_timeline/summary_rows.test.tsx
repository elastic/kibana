/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { renderInvestigationTimelineSummary } from './summary_rows';

const renderSummary = (data: unknown) =>
  render(<I18nProvider>{renderInvestigationTimelineSummary({ data })}</I18nProvider>);

describe('renderInvestigationTimelineSummary', () => {
  it('renders one read-only row per event, with the host and time on the icon', async () => {
    renderSummary({
      events: [
        {
          timestamp: '2026-09-01T10:00:00.000Z',
          host: 'FIN-DB-02',
          description: 'Archive assembled in temp',
        },
        {
          timestamp: '2026-09-01T10:05:00.000Z',
          host: 'FIN-WS-02',
          description: 'Archive copied over SMB',
        },
      ],
    });

    expect(screen.getByText('Attack timeline')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Archive assembled in temp')).toBeInTheDocument();
    expect(screen.getByText('Archive copied over SMB')).toBeInTheDocument();
    expect(screen.queryByTestId('attachmentSummaryRowButton')).not.toBeInTheDocument();

    const icons = screen.getAllByTestId('attachmentSummaryRowIcon');
    await userEvent.hover(icons[0]);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '2026-09-01T10:00:00.000Z on FIN-DB-02'
    );
    await userEvent.unhover(icons[0]);
    await userEvent.hover(icons[1]);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      '2026-09-01T10:05:00.000Z on FIN-WS-02'
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
