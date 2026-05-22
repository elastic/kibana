/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import {
  DuplicateDetectionsToastBody,
  type DuplicateDetectionEvent,
} from './duplicate_detections_toast';

const event = (overrides: Partial<DuplicateDetectionEvent> = {}): DuplicateDetectionEvent => ({
  source: 'SLO',
  method: 'GET',
  path: '/api/example',
  count: 2,
  elapsedMs: 250,
  detectedAt: 0,
  ...overrides,
});

describe('DuplicateDetectionsToastBody', () => {
  it('renders nothing while the event stream is empty', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
    const { container } = render(<DuplicateDetectionsToastBody events$={events$} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the newest event by default and updates in-place when new events arrive', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ source: 'SLO', path: '/api/slo', detectedAt: 1 }),
    ]);
    render(<DuplicateDetectionsToastBody events$={events$} />);

    expect(screen.getByText('SLO')).toBeInTheDocument();
    expect(screen.getByText(/\/api\/slo/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent(
      '1 / 1 (1 endpoint)'
    );

    act(() => {
      events$.next([
        event({ source: 'Synthetics', path: '/api/synthetics', detectedAt: 2 }),
        event({ source: 'SLO', path: '/api/slo', detectedAt: 1 }),
      ]);
    });

    expect(screen.getByText('Synthetics')).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent(
      '2 / 2 (2 endpoints)'
    );
  });

  it('navigates back and forward through the event list with prev/next buttons', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ source: 'Synthetics', path: '/api/c', detectedAt: 3 }),
      event({ source: 'SLO', path: '/api/b', detectedAt: 2 }),
      event({ source: 'SLO', path: '/api/a', detectedAt: 1 }),
    ]);
    render(<DuplicateDetectionsToastBody events$={events$} />);

    expect(screen.getByText(/\/api\/c/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent('3 / 3');

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastPrev'));
    expect(screen.getByText(/\/api\/b/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent('2 / 3');

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastPrev'));
    expect(screen.getByText(/\/api\/a/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent('1 / 3');

    expect(screen.getByTestId('duplicateDetectionsToastPrev')).toBeDisabled();

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastNext'));
    expect(screen.getByText(/\/api\/b/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastNext'));
    expect(screen.getByText(/\/api\/c/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastNext')).toBeDisabled();
  });

  it('invokes onShowDetails with the currently-viewed event when "View details" is clicked', () => {
    const onShowDetails = jest.fn();
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ path: '/api/x', detectedAt: 2 }),
      event({ path: '/api/y', detectedAt: 1 }),
    ]);
    render(<DuplicateDetectionsToastBody events$={events$} onShowDetails={onShowDetails} />);

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastShowDetails'));
    expect(onShowDetails).toHaveBeenLastCalledWith(2);

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastPrev'));
    fireEvent.click(screen.getByTestId('duplicateDetectionsToastShowDetails'));
    expect(onShowDetails).toHaveBeenLastCalledWith(1);
  });

  it('omits the "View details" button when no onShowDetails callback is provided', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    render(<DuplicateDetectionsToastBody events$={events$} />);
    expect(screen.queryByTestId('duplicateDetectionsToastShowDetails')).toBeNull();
  });

  it('renders the Pause and Settings icon buttons only when their callbacks are provided', () => {
    const onPause = jest.fn();
    const onOpenSettings = jest.fn();
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const { rerender } = render(<DuplicateDetectionsToastBody events$={events$} />);

    expect(screen.queryByTestId('duplicateDetectionsToastPause')).toBeNull();
    expect(screen.queryByTestId('duplicateDetectionsToastSettings')).toBeNull();

    rerender(
      <DuplicateDetectionsToastBody
        events$={events$}
        onPause={onPause}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastPause'));
    fireEvent.click(screen.getByTestId('duplicateDetectionsToastSettings'));
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps the user anchored on the same event even when new events arrive on top', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ path: '/api/b', detectedAt: 2 }),
      event({ path: '/api/a', detectedAt: 1 }),
    ]);
    render(<DuplicateDetectionsToastBody events$={events$} />);

    fireEvent.click(screen.getByTestId('duplicateDetectionsToastPrev'));
    expect(screen.getByText(/\/api\/a/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent('1 / 2');

    act(() => {
      events$.next([
        event({ path: '/api/c', detectedAt: 3 }),
        event({ path: '/api/b', detectedAt: 2 }),
        event({ path: '/api/a', detectedAt: 1 }),
      ]);
    });

    expect(screen.getByText(/\/api\/a/)).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsToastPosition')).toHaveTextContent('1 / 3');
  });
});
