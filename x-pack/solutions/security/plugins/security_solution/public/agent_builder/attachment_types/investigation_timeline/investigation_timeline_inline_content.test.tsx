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
import type { AttachmentRenderProps } from '@kbn/agent-builder-browser/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import {
  COLLAPSE_AT_EVENT_COUNT,
  INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID,
  InvestigationTimelineInlineContent,
} from './investigation_timeline_inline_content';
import type { InvestigationTimelineAttachment } from './types';

jest.mock('../../../common/lib/kibana');

beforeEach(() => {
  (useDateFormat as jest.Mock).mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');
  (useTimeZone as jest.Mock).mockReturnValue('UTC');
});

const renderContent = (data: InvestigationTimelineAttachment['data']) => {
  const props = {
    attachment: {
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.investigationTimeline,
      data,
    },
    isSidebar: false,
  } as AttachmentRenderProps<InvestigationTimelineAttachment>;
  return render(
    <I18nProvider>
      <InvestigationTimelineInlineContent {...props} />
    </I18nProvider>
  );
};

const TWO_EVENTS = [
  {
    timestamp: '2026-09-11T14:23:32.488Z',
    host: 'WKSTN-RECV01',
    description: 'OUTLOOK.EXE spawned powershell.exe',
  },
  {
    timestamp: '2026-09-11T14:45:32.488Z',
    host: 'SRV-DC01',
    description: 'wmiprvse.exe spawned cmd.exe /c whoami',
  },
];

// Exactly the collapse threshold, so the table starts hidden.
const FIVE_EVENTS = Array.from({ length: COLLAPSE_AT_EVENT_COUNT }, (_, index) => ({
  timestamp: `2026-09-11T14:${String(10 + index * 5).padStart(2, '0')}:00.000Z`,
  host: `HOST-${index}`,
  description: `event ${index}`,
}));

describe('InvestigationTimelineInlineContent', () => {
  it('collapses to a summary of the event count and span at the threshold', () => {
    renderContent({ events: FIVE_EVENTS });

    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 5 events from Sep 11, 2026 @ 14:10:00 to Sep 11, 2026 @ 14:30:00'
    );
    expect(screen.getByTestId('investigationTimelineToggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByRole('table', { hidden: true }).closest('[inert]')).not.toBeNull();
  });

  it('expands a collapsed timeline on click', async () => {
    renderContent({ events: FIVE_EVENTS });

    await userEvent.click(screen.getByTestId('investigationTimelineToggle'));

    expect(screen.getByTestId('investigationTimelineToggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('table').closest('[inert]')).toBeNull();
    expect(screen.getAllByTestId('investigationTimelineTimestamp')).toHaveLength(5);
  });

  it('starts expanded below the threshold', () => {
    renderContent({ events: TWO_EVENTS });

    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 2 events from Sep 11, 2026 @ 14:23:32 to Sep 11, 2026 @ 14:45:32'
    );
    expect(screen.getByTestId('investigationTimelineToggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('table').closest('[inert]')).toBeNull();
  });

  it('spans the earliest to the latest event when the payload is out of order', () => {
    const [early, mid, late] = FIVE_EVENTS;
    renderContent({ events: [mid, late, FIVE_EVENTS[3], FIVE_EVENTS[4], early] });

    // Collapsed, so the table does not show which events set the range.
    expect(screen.getByTestId('investigationTimelineToggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 5 events from Sep 11, 2026 @ 14:10:00 to Sep 11, 2026 @ 14:30:00'
    );
  });

  it('spans a reversed pair of events from earliest to latest', () => {
    renderContent({ events: [...TWO_EVENTS].reverse() });

    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 2 events from Sep 11, 2026 @ 14:23:32 to Sep 11, 2026 @ 14:45:32'
    );
  });

  it('ignores unparseable timestamps when ordering the span', () => {
    renderContent({
      events: [
        { ...TWO_EVENTS[1] },
        { timestamp: 'not a date', host: 'H', description: 'unknown time' },
        { ...TWO_EVENTS[0] },
      ],
    });

    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 3 events from Sep 11, 2026 @ 14:23:32 to Sep 11, 2026 @ 14:45:32'
    );
  });

  it('summarizes a single event by its timestamp', () => {
    renderContent({ events: [TWO_EVENTS[0]] });

    expect(screen.getByTestId('investigationTimelineSummary')).toHaveTextContent(
      'Forensic timeline: 1 event at Sep 11, 2026 @ 14:23:32'
    );
  });

  it('renders timestamp, host, and description for each event', () => {
    renderContent({ events: TWO_EVENTS });

    expect(screen.getByTestId(INVESTIGATION_TIMELINE_ATTACHMENT_TEST_ID)).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('investigationTimelineTimestamp').map((el) => el.textContent)
    ).toEqual(['Sep 11, 2026 @ 14:23:32', 'Sep 11, 2026 @ 14:45:32']);
    expect(screen.getByText('WKSTN-RECV01')).toBeInTheDocument();
    expect(screen.getByText('SRV-DC01')).toBeInTheDocument();
    expect(screen.getByText('OUTLOOK.EXE spawned powershell.exe')).toBeInTheDocument();
    expect(screen.getByText('wmiprvse.exe spawned cmd.exe /c whoami')).toBeInTheDocument();
  });

  it('shows the raw timestamp on hover', async () => {
    renderContent({ events: [TWO_EVENTS[0]] });

    await userEvent.hover(screen.getByTestId('investigationTimelineTimestamp'));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('2026-09-11T14:23:32.488Z');
  });

  it('renders an empty state when there are no events', () => {
    renderContent({ events: [] });
    expect(
      screen.getByText('No events were reconstructed from the available telemetry.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('investigationTimelineWindow')).not.toBeInTheDocument();
  });

  // The window is what tells "nothing in this incident's range" apart from "nothing at all",
  // so it shows outside the accordion and on the empty state alike.
  it('names the searched window above the events and on the empty state', () => {
    const window = { start: '2026-09-11T12:00:00.000Z', end: '2026-09-11T16:00:00.000Z' };

    const { unmount } = renderContent({ events: TWO_EVENTS, window });
    expect(screen.getByTestId('investigationTimelineWindow')).toHaveTextContent(
      'Searched window: Sep 11, 2026 @ 12:00:00 to Sep 11, 2026 @ 16:00:00'
    );
    unmount();

    renderContent({ events: [], window });
    expect(screen.getByTestId('investigationTimelineWindow')).toHaveTextContent(
      'Searched window: Sep 11, 2026 @ 12:00:00 to Sep 11, 2026 @ 16:00:00'
    );
  });
});
