/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { InvestigationTimelineFlyout } from './timeline_flyout';

const renderFlyout = (
  title: string,
  events: Array<{ timestamp: string; host: string; description: string }>
) =>
  render(
    <I18nProvider>
      <InvestigationTimelineFlyout title={title} events={events} />
    </I18nProvider>
  );

describe('InvestigationTimelineFlyout', () => {
  it('renders the host as the title, and one vertical event per timeline entry', () => {
    renderFlyout('WKSTN-RECV01', [
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

    expect(screen.getByRole('heading', { name: 'WKSTN-RECV01' })).toBeInTheDocument();
    expect(
      screen.getAllByTestId('investigationTimelineEventTimestamp').map((el) => el.textContent)
    ).toEqual(['2026-09-11 14:23:32.488Z', '2026-09-11 15:05:32.488Z']);
    expect(
      screen.getAllByTestId('investigationTimelineEventHost').map((el) => el.textContent)
    ).toEqual(['WKSTN-RECV01', 'SRV-DC01']);
    expect(screen.getByText('OUTLOOK.EXE spawned powershell.exe')).toBeInTheDocument();
    expect(screen.getByText('svc.exe created a ransom note')).toBeInTheDocument();
  });

  it('renders an empty state when there are no events', () => {
    renderFlyout('Investigation timeline', []);
    expect(
      screen.getByText('No events were reconstructed from the available telemetry.')
    ).toBeInTheDocument();
  });
});
