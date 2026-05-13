/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { SECURITY_EVENT_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { EventTabContent } from './event_tab_content';
import type { Event } from './table';

jest.mock('./table', () => ({
  EventsTableForCases: ({ events }: { events: Event[] }) => (
    <div data-test-subj="events-table-mock">
      {events.length} {'events'}
      {events.map((e) => (
        <span key={String(e.eventId)} data-test-subj={`event-${String(e.eventId)}`}>
          {e.eventId}
          {':'}
          {e.index}
        </span>
      ))}
    </div>
  ),
}));

describe('EventTabContent', () => {
  it('renders events table with unified event attachments', () => {
    const caseData = {
      id: 'case-1',
      title: 'Test Case',
      comments: [
        {
          type: SECURITY_EVENT_ATTACHMENT_TYPE,
          attachmentId: 'event-1',
          metadata: { index: 'logs-*' },
        },
      ],
    } as unknown as CaseUI;

    render(<EventTabContent caseData={caseData} />);

    expect(screen.getByTestId('case-view-events')).toBeInTheDocument();
    expect(screen.getByTestId('events-table-mock')).toHaveTextContent('1 events');
    expect(screen.getByTestId('event-event-1')).toHaveTextContent('event-1:logs-*');
  });

  it('expands attachmentId and index arrays into one row per event', () => {
    const caseData = {
      id: 'case-1',
      title: 'Test Case',
      comments: [
        {
          type: SECURITY_EVENT_ATTACHMENT_TYPE,
          attachmentId: ['event-1', 'event-2'],
          metadata: { index: ['logs-1', 'logs-2'] },
        },
      ],
    } as unknown as CaseUI;

    render(<EventTabContent caseData={caseData} />);

    expect(screen.getByTestId('events-table-mock')).toHaveTextContent('1 events');
    expect(screen.getByTestId('event-event-1,event-2')).toHaveTextContent(
      'event-1event-2:logs-1logs-2'
    );
  });

  it('filters out non-event comments', () => {
    const caseData = {
      id: 'case-1',
      title: 'Test Case',
      comments: [
        { type: 'user', comment: 'A comment' },
        { type: SECURITY_EVENT_ATTACHMENT_TYPE, attachmentId: 'ev-1', metadata: { index: 'idx' } },
      ],
    } as unknown as CaseUI;

    render(<EventTabContent caseData={caseData} />);

    expect(screen.getByTestId('events-table-mock')).toHaveTextContent('1 events');
  });
});
