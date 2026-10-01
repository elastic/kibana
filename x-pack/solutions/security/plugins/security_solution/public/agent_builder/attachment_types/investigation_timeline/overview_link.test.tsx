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
import { renderInvestigationTimelineDetails } from './overview_link';

const mockOpener = jest.fn((_props: unknown) => null);
jest.mock('./open_timeline_flyout_on_mount', () => ({
  InvestigationTimelineFlyoutOpener: (props: unknown) => mockOpener(props),
}));

const resolveSecurityCanvasContext = jest.fn();

const events = [
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
];

const renderDetails = (data: unknown) =>
  render(
    <I18nProvider>
      {renderInvestigationTimelineDetails({ data }, resolveSecurityCanvasContext)}
    </I18nProvider>
  );

describe('renderInvestigationTimelineDetails', () => {
  beforeEach(() => {
    mockOpener.mockClear();
  });

  it('renders one Timeline link that opens the timeline flyout', async () => {
    renderDetails({ events });

    expect(screen.getByTestId('investigationTimelineOverviewLink')).toHaveAccessibleName(
      'Timeline'
    );
    expect(screen.queryByText('OUTLOOK.EXE spawned powershell.exe')).not.toBeInTheDocument();
    expect(screen.queryByText('WKSTN-RECV01')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('investigationTimelineOverviewLink'));

    await waitFor(() => expect(mockOpener).toHaveBeenCalled());
    expect(mockOpener).toHaveBeenCalledWith(
      expect.objectContaining({
        events: [
          expect.objectContaining({ host: 'WKSTN-RECV01' }),
          expect.objectContaining({ host: 'SRV-DC01' }),
        ],
        resolveSecurityCanvasContext,
      })
    );
  });

  it.each([
    ['no events', { events: [] }],
    ['malformed events', { events: [{ timestamp: 't' }] }],
    ['missing data', undefined],
  ])('renders nothing for %s', (_name, data) => {
    const { container } = renderDetails(data);
    expect(container).toBeEmptyDOMElement();
  });
});
