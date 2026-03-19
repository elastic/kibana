/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CaseUI } from '@kbn/cases-plugin/common';
import { EventTabContent } from './event_tab_content';

jest.mock('../../components/case_events/table', () => ({
  EventsTableForCases: ({ events }: { events: Array<{ eventId: string; index: string }> }) => (
    <div data-test-subj="events-table-mock">
      {events.length} {'events'}
      {events.map((e) => (
        <span key={e.eventId} data-test-subj={`event-${e.eventId}`}>
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
          type: 'securityEvent',
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

  it('filters out non-event comments', () => {
    const caseData = {
      id: 'case-1',
      title: 'Test Case',
      comments: [
        { type: 'user', comment: 'A comment' },
        { type: 'securityEvent', attachmentId: 'ev-1', metadata: { index: 'idx' } },
      ],
    } as unknown as CaseUI;

    render(<EventTabContent caseData={caseData} />);

    expect(screen.getByTestId('events-table-mock')).toHaveTextContent('1 events');
  });
});
