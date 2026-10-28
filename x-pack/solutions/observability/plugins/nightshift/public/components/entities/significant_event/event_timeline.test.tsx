/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type {
  EventLifecycleResponse,
  SignificantEventResponse,
} from '@kbn/significant-events-schema';
import { EventTimeline, getStatusTransitions } from './event_timeline';

const event: SignificantEventResponse = {
  event_id: 'event-1',
  '@timestamp': '2026-07-10T13:00:00Z',
  created_at: '2026-07-10T11:00:00Z',
  status: 'active',
  source_ids: [],
  title: 'Latency increased',
  summary: 'Latency increased after deployment.',
  severity: 'high',
  confidence: 0.8,
};

const lifecycle: EventLifecycleResponse = {
  detections: [
    {
      detection_id: 'later',
      rule_name: 'Later detection',
      change_point_type: 'dip',
      '@timestamp': '2026-07-10T12:00:00Z',
    },
    {
      detection_id: 'earlier',
      rule_name: 'Earlier detection',
      change_point_type: 'spike',
      '@timestamp': '2026-07-10T10:00:00Z',
    },
  ],
  events: [],
};

const renderTimeline = (onDetectionClick = jest.fn()) =>
  render(
    <EventTimeline
      event={event}
      lifecycleQuery={{ data: lifecycle, isLoading: false, isError: false }}
      onDetectionClick={onDetectionClick}
      onEventClick={jest.fn()}
    />
  );

describe('EventTimeline', () => {
  it('puts detections up to the raised time first, then the raised entry, then later detections', () => {
    renderTimeline();

    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => within(item).getByRole('button').textContent)).toEqual([
      'Earlier detection',
      event.title,
      'Later detection',
    ]);
    expect(items[1].querySelector('time')).toHaveAttribute('dateTime', event.created_at);
  });

  const renderWithLifecycle = (data: EventLifecycleResponse, onEventClick = jest.fn()) =>
    render(
      <EventTimeline
        event={event}
        lifecycleQuery={{ data, isLoading: false, isError: false }}
        onDetectionClick={jest.fn()}
        onEventClick={onEventClick}
      />
    );

  const detectionAt = (
    id: string,
    timestamp: string
  ): EventLifecycleResponse['detections'][number] => ({
    detection_id: id,
    rule_name: id,
    change_point_type: 'spike',
    '@timestamp': timestamp,
  });

  it('merges detections after the raised time with status changes in time order', () => {
    renderWithLifecycle({
      detections: [
        detectionAt('after-reopen', '2026-07-10T15:00:00Z'),
        detectionAt('before-raised', '2026-07-10T10:00:00Z'),
        detectionAt('between', '2026-07-10T12:30:00Z'),
      ],
      events: [
        version('2026-07-10T11:00:00Z', 'active'),
        version('2026-07-10T12:00:00Z', 'inactive', { title: 'Closed title' }),
        version('2026-07-10T14:00:00Z', 'active', {
          title: 'Reopened title',
          episode_id: 'episode-2',
        }),
      ],
      deactivations: [{ episode_id: 'episode-1', reason: 'Known noise.' }],
    });

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent('before-raised');
    expect(items[1]).toHaveTextContent('Significant event raised');
    expect(items[2]).toHaveTextContent('Closed title');
    expect(items[3]).toHaveTextContent('between');
    expect(items[4]).toHaveTextContent('Reopened title');
    expect(items[5]).toHaveTextContent('after-reopen');
  });

  it('keeps entries with the same time in their original order', () => {
    renderWithLifecycle({
      detections: [
        detectionAt('tie-first', '2026-07-10T12:00:00Z'),
        detectionAt('tie-second', '2026-07-10T12:00:00Z'),
      ],
      events: [
        version('2026-07-10T11:00:00Z', 'active'),
        version('2026-07-10T12:00:00Z', 'inactive', { title: 'Closed title' }),
      ],
    });

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Significant event raised');
    expect(items[1]).toHaveTextContent('tie-first');
    expect(items[2]).toHaveTextContent('tie-second');
    expect(items[3]).toHaveTextContent('Closed title');
  });

  it('opens a detection through its click handler', () => {
    const onDetectionClick = jest.fn();
    renderTimeline(onDetectionClick);

    fireEvent.click(screen.getByRole('button', { name: 'Earlier detection' }));
    expect(onDetectionClick).toHaveBeenCalledWith('earlier');
  });
});

const version = (
  timestamp: string,
  status: SignificantEventResponse['status'],
  overrides: Partial<SignificantEventResponse> = {}
): SignificantEventResponse => ({
  ...event,
  '@timestamp': timestamp,
  status,
  episode_id: 'episode-1',
  ...overrides,
});

describe('getStatusTransitions', () => {
  it('reports when the event went inactive and when it was reopened, with the version titles', () => {
    const transitions = getStatusTransitions({
      versions: [
        version('2026-07-10T14:00:00Z', 'active', { title: 'Back again', episode_id: 'episode-2' }),
        version('2026-07-10T11:00:00Z', 'active'),
        version('2026-07-10T12:00:00Z', 'inactive', { title: 'Closed one' }),
      ],
    });

    expect(transitions).toEqual([
      expect.objectContaining({
        kind: 'inactive',
        at: '2026-07-10T12:00:00Z',
        title: 'Closed one',
      }),
      expect.objectContaining({
        kind: 'reopened',
        at: '2026-07-10T14:00:00Z',
        title: 'Back again',
      }),
    ]);
  });

  it("uses the operator's reason for the episode that was deactivated", () => {
    const [inactive] = getStatusTransitions({
      versions: [
        version('2026-07-10T11:00:00Z', 'active', { assessment_note: 'Original analysis.' }),
        version('2026-07-10T12:00:00Z', 'inactive', { assessment_note: 'Original analysis.' }),
      ],
      deactivations: [
        { episode_id: 'episode-1', reason: 'Known noise.' },
        { episode_id: 'episode-9', reason: 'Another episode.' },
      ],
    });

    expect(inactive).toEqual(expect.objectContaining({ byOperator: true, note: 'Known noise.' }));
  });

  it('shows no note for a deactivation with an empty reason, even when the version note differs', () => {
    const [inactive] = getStatusTransitions({
      versions: [
        version('2026-07-10T11:00:00Z', 'active', { assessment_note: 'Original analysis.' }),
        version('2026-07-10T12:00:00Z', 'inactive', { assessment_note: 'Something else.' }),
      ],
      deactivations: [{ episode_id: 'episode-1', reason: '' }],
    });

    expect(inactive).toEqual(expect.objectContaining({ byOperator: true, note: undefined }));
  });

  it("keeps the closing version's own note when no deactivation matches and it differs", () => {
    const [inactive] = getStatusTransitions({
      versions: [
        version('2026-07-10T11:00:00Z', 'active', { assessment_note: 'Original analysis.' }),
        version('2026-07-10T12:00:00Z', 'inactive', { assessment_note: 'Recovered on its own.' }),
      ],
    });

    expect(inactive).toEqual(
      expect.objectContaining({ byOperator: false, note: 'Recovered on its own.' })
    );
  });

  it('shows no note when the closing version only copies the previous one', () => {
    const [inactive] = getStatusTransitions({
      versions: [
        version('2026-07-10T11:00:00Z', 'active', { assessment_note: 'Original analysis.' }),
        version('2026-07-10T12:00:00Z', 'inactive', { assessment_note: 'Original analysis.' }),
      ],
    });

    expect(inactive.note).toBeUndefined();
  });

  it('reads active and recovering as the same side of a transition', () => {
    expect(
      getStatusTransitions({
        versions: [
          version('2026-07-10T11:00:00Z', 'active'),
          version('2026-07-10T12:00:00Z', 'recovering'),
          version('2026-07-10T13:00:00Z', 'active'),
        ],
      })
    ).toEqual([]);
  });

  it('reports nothing for a single version, no versions, or a first version already inactive', () => {
    expect(getStatusTransitions({ versions: [version('2026-07-10T11:00:00Z', 'active')] })).toEqual(
      []
    );
    expect(getStatusTransitions({ versions: [] })).toEqual([]);
    expect(
      getStatusTransitions({ versions: [version('2026-07-10T11:00:00Z', 'inactive')] })
    ).toEqual([]);
  });
});

describe('EventTimeline status changes', () => {
  const renderWithVersions = (onEventClick = jest.fn()) =>
    render(
      <EventTimeline
        event={event}
        lifecycleQuery={{
          data: {
            detections: [],
            events: [
              version('2026-07-10T11:00:00Z', 'active'),
              version('2026-07-10T12:00:00Z', 'inactive', { title: 'Closed title' }),
              version('2026-07-10T13:00:00Z', 'active', {
                title: 'Reopened title',
                episode_id: 'episode-2',
              }),
            ],
            deactivations: [{ episode_id: 'episode-1', reason: 'Known noise.' }],
          },
          isLoading: false,
          isError: false,
        }}
        onDetectionClick={jest.fn()}
        onEventClick={onEventClick}
      />
    );

  it('shows the deactivation with its reason, then the reopen, after the raised entry', () => {
    renderWithVersions();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Significant event raised');
    expect(items[1]).toHaveTextContent('Closed title');
    expect(items[1]).toHaveTextContent('Significant event deactivated');
    expect(items[1]).toHaveTextContent('Known noise.');
    expect(items[2]).toHaveTextContent('Reopened title');
    expect(items[2]).toHaveTextContent('Significant event reopened');
  });

  it('cuts a long note and shows the rest on demand', () => {
    const longReason = `${'The operator explained this at length. '.repeat(10)}End.`;
    render(
      <EventTimeline
        event={event}
        lifecycleQuery={{
          data: {
            detections: [],
            events: [
              version('2026-07-10T11:00:00Z', 'active'),
              version('2026-07-10T12:00:00Z', 'inactive'),
            ],
            deactivations: [{ episode_id: 'episode-1', reason: longReason }],
          },
          isLoading: false,
          isError: false,
        }}
        onDetectionClick={jest.fn()}
        onEventClick={jest.fn()}
      />
    );

    const note = screen.getByTestId('nightshiftEventTimelineNote-inactive-0');
    expect(note).not.toHaveTextContent('End.');

    fireEvent.click(screen.getByTestId('nightshiftEventTimelineNoteToggle-inactive-0'));

    expect(screen.getByTestId('nightshiftEventTimelineNote-inactive-0')).toHaveTextContent('End.');
  });

  it('shows a short note in full, with no toggle', () => {
    renderWithVersions();

    expect(screen.getByTestId('nightshiftEventTimelineNote-inactive-0')).toHaveTextContent(
      'Known noise.'
    );
    expect(
      screen.queryByTestId('nightshiftEventTimelineNoteToggle-inactive-0')
    ).not.toBeInTheDocument();
  });

  it('links the reopened title to the event, and leaves the deactivated title plain', () => {
    const onEventClick = jest.fn();
    renderWithVersions(onEventClick);

    fireEvent.click(screen.getByTestId('nightshiftEventTimelineReopenedLink-1'));

    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect(
      within(screen.getByTestId('nightshiftEventTimeline-inactive-0')).queryByRole('button')
    ).not.toBeInTheDocument();
  });

  it('shows a closure without a deactivation record as closed, with its own note', () => {
    render(
      <EventTimeline
        event={event}
        lifecycleQuery={{
          data: {
            detections: [],
            events: [
              version('2026-07-10T11:00:00Z', 'active', { assessment_note: 'Original analysis.' }),
              version('2026-07-10T12:00:00Z', 'inactive', {
                assessment_note: 'Recovered on its own.',
              }),
            ],
            deactivations: [],
          },
          isLoading: false,
          isError: false,
        }}
        onDetectionClick={jest.fn()}
        onEventClick={jest.fn()}
      />
    );

    const closed = screen.getByTestId('nightshiftEventTimeline-inactive-0');
    expect(closed).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Significant event closed');
    expect(items[1]).not.toHaveTextContent('Significant event deactivated');
    expect(screen.getByTestId('nightshiftEventTimelineNote-inactive-0')).toHaveTextContent(
      'Recovered on its own.'
    );
  });

  it('renders two deactivate and reopen cycles with a clickable link for each reopen', () => {
    const onEventClick = jest.fn();
    render(
      <EventTimeline
        event={event}
        lifecycleQuery={{
          data: {
            detections: [],
            events: [
              version('2026-07-10T11:00:00Z', 'active'),
              version('2026-07-10T12:00:00Z', 'inactive', { title: 'Closed one' }),
              version('2026-07-10T13:00:00Z', 'active', {
                title: 'Reopened one',
                episode_id: 'episode-2',
              }),
              version('2026-07-10T14:00:00Z', 'inactive', {
                title: 'Closed two',
                episode_id: 'episode-2',
              }),
              version('2026-07-10T15:00:00Z', 'active', {
                title: 'Reopened two',
                episode_id: 'episode-3',
              }),
            ],
            deactivations: [
              { episode_id: 'episode-1', reason: 'First reason.' },
              { episode_id: 'episode-2', reason: 'Second reason.' },
            ],
          },
          isLoading: false,
          isError: false,
        }}
        onDetectionClick={jest.fn()}
        onEventClick={onEventClick}
      />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByTestId('nightshiftEventTimeline-inactive-0')).toHaveTextContent(
      'Closed one'
    );
    expect(screen.getByTestId('nightshiftEventTimeline-reopened-1')).toHaveTextContent(
      'Reopened one'
    );
    expect(screen.getByTestId('nightshiftEventTimeline-inactive-2')).toHaveTextContent(
      'Closed two'
    );
    expect(screen.getByTestId('nightshiftEventTimeline-reopened-3')).toHaveTextContent(
      'Reopened two'
    );
    expect(screen.getByTestId('nightshiftEventTimelineNote-inactive-0')).toHaveTextContent(
      'First reason.'
    );
    expect(screen.getByTestId('nightshiftEventTimelineNote-inactive-2')).toHaveTextContent(
      'Second reason.'
    );

    fireEvent.click(screen.getByTestId('nightshiftEventTimelineReopenedLink-1'));
    fireEvent.click(screen.getByTestId('nightshiftEventTimelineReopenedLink-3'));
    expect(onEventClick).toHaveBeenCalledTimes(2);
  });

  it('shows the raised entry under the title the event was first raised with', () => {
    render(
      <EventTimeline
        event={{ ...event, title: 'Latest title' }}
        lifecycleQuery={{
          data: {
            detections: [],
            events: [
              version('2026-07-10T11:00:00Z', 'active', { title: 'Original title' }),
              version('2026-07-10T12:00:00Z', 'inactive', { title: 'Original title' }),
              version('2026-07-10T13:00:00Z', 'active', {
                title: 'Latest title',
                episode_id: 'episode-2',
              }),
            ],
            deactivations: [],
          },
          isLoading: false,
          isError: false,
        }}
        onDetectionClick={jest.fn()}
        onEventClick={jest.fn()}
      />
    );

    expect(screen.getByTestId('nightshiftEventTimelineLink')).toHaveTextContent('Original title');
  });

  it('adds nothing for an event whose status never changed', () => {
    renderTimeline();

    expect(screen.queryByTestId('nightshiftEventTimeline-inactive-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nightshiftEventTimeline-reopened-1')).not.toBeInTheDocument();
  });
});
