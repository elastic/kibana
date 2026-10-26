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
import { useDateFormat, useTimeZone } from '../../../common/lib/kibana';
import { InvestigationTimelineFlyout } from './timeline_flyout';

jest.mock('../../../common/lib/kibana');

beforeEach(() => {
  (useDateFormat as jest.Mock).mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
  (useTimeZone as jest.Mock).mockReturnValue('UTC');
});

const renderFlyout = (
  events: Array<{ timestamp: string; host: string; description: string }>,
  window?: { start: string; end: string }
) =>
  render(
    <I18nProvider>
      <InvestigationTimelineFlyout events={events} window={window} />
    </I18nProvider>
  );

describe('InvestigationTimelineFlyout', () => {
  it('titles the flyout like its summary row, and renders one vertical event per entry', () => {
    renderFlyout([
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
    ]);

    expect(screen.getByRole('heading', { name: 'Forensic timeline' })).toBeInTheDocument();
    expect(screen.getByTestId('investigationTimelineFlyout')).toHaveClass('euiFlyoutBody');
    expect(
      screen.getAllByTestId('investigationTimelineEventTimestamp').map((el) => el.textContent)
    ).toEqual(['Sep 11, 2026 @ 14:23:32', 'Sep 11, 2026 @ 15:05:32']);
    expect(
      screen.getAllByTestId('investigationTimelineEventHost').map((el) => el.textContent)
    ).toEqual(['WKSTN-RECV01', 'SRV-DC01']);
    expect(screen.getByText('OUTLOOK.EXE spawned powershell.exe')).toBeInTheDocument();
    expect(screen.getByText('svc.exe created a ransom note')).toBeInTheDocument();
  });

  it('shows the raw timestamp on hover', async () => {
    renderFlyout([
      {
        timestamp: '2026-09-11T14:23:32.488Z',
        host: 'WKSTN-RECV01',
        description: 'OUTLOOK.EXE spawned powershell.exe',
      },
    ]);

    await userEvent.hover(screen.getByTestId('investigationTimelineEventTimestamp'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('2026-09-11T14:23:32.488Z');
  });

  it('renders an empty state when there are no events', () => {
    renderFlyout([]);
    expect(
      screen.getByText('No events were reconstructed from the available telemetry.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('investigationTimelineWindow')).not.toBeInTheDocument();
  });

  it('names the searched window under the title when the payload carries one', () => {
    renderFlyout([], { start: '2026-09-11T12:00:00.000Z', end: '2026-09-11T16:00:00.000Z' });

    expect(screen.getByTestId('investigationTimelineWindow')).toHaveTextContent(
      'Searched window: Sep 11, 2026 @ 12:00:00 to Sep 11, 2026 @ 16:00:00'
    );
  });
});
