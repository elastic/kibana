/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { SessionTimelineEvent } from '../../../../common/sessions';
import type { MobileCrash } from '../../../../common/types/mobile';
import { CrashTimeline, formatBefore } from './crash_timeline';

const CRASH: MobileCrash = {
  time: '2021-01-18T12:30:00.000Z',
  reportedAt: '2021-01-18T12:30:00.000Z',
  type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  stacktrace: null,
  release: '4.2.0',
  osVersion: '15',
  deviceModel: 'Pixel 8',
  sessionId: 'session',
};

const event = (fields: Partial<SessionTimelineEvent>): SessionTimelineEvent => ({
  kind: 'tap',
  name: 'Start recording',
  timestamp: '2021-01-18T12:29:50.000Z',
  offsetMs: 0,
  page: 'Map',
  detail: null,
  clickCount: null,
  stacktrace: null,
  traceId: null,
  spanId: null,
  statusCode: null,
  durationMs: null,
  ...fields,
});

const rows = () =>
  within(screen.getByTestId('digitalExperienceMobileCrashTimeline')).getAllByRole('row').slice(1);

describe('formatBefore', () => {
  it('says how long before the crash, at the precision that matters at that distance', () => {
    expect(formatBefore(420)).toBe('420 ms before');
    expect(formatBefore(45_000)).toBe('45 s before');
    expect(formatBefore(255_000)).toBe('4 min 15 s before');
    expect(formatBefore(7_500_000)).toBe('2 h 5 min before');
  });
});

describe('CrashTimeline', () => {
  it("names a screen once, and a tap's page apart from it, the full name as its title", () => {
    render(
      <CrashTimeline
        events={[
          event({
            kind: 'screen',
            name: 'Map',
            page: 'Map',
            timestamp: '2021-01-18T12:25:45.000Z',
          }),
          event({ kind: 'tap', name: 'Map', page: 'Map' }),
          event({ kind: 'tap', name: 'Start recording', page: 'Map' }),
        ]}
        crash={CRASH}
      />,
      {
        wrapper: ({ children }) => (
          <I18nProvider>
            <EuiProvider>{children}</EuiProvider>
          </I18nProvider>
        ),
      }
    );

    const [screenRow, screenTapRow, widgetTapRow] = rows();
    expect(within(screenRow).getAllByText('Map')).toHaveLength(1);
    expect(screenRow).toHaveTextContent('4 min 15 s before');
    expect(within(screenTapRow).getAllByText('Map')).toHaveLength(1);
    expect(within(widgetTapRow).getByText('Start recording')).toHaveAttribute(
      'title',
      'Start recording'
    );
    expect(widgetTapRow).toHaveTextContent('Map');
  });
});
