/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DuplicateDetectionsToolbarButton } from './duplicate_detections_toolbar_button';
import type { DuplicateDetectionEvent } from './duplicate_detections_toast';
import type { DetectorSettings } from './duplicate_detections_settings';

const baseEvent = (overrides: Partial<DuplicateDetectionEvent> = {}): DuplicateDetectionEvent => ({
  source: 'slo',
  path: '/api/slo/_find',
  method: 'GET',
  detectedAt: 1,
  count: 3,
  elapsedMs: 120,
  ...overrides,
});

const baseSettings = (overrides: Partial<DetectorSettings> = {}): DetectorSettings => ({
  enabled: true,
  ignoredPathPrefixes: [],
  scopedSources: [],
  scopedTeams: [],
  ...overrides,
});

describe('DuplicateDetectionsToolbarButton', () => {
  it('renders the icon button with no badge when there are no events', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
    const settings$ = new BehaviorSubject<DetectorSettings>(baseSettings());

    render(
      <DuplicateDetectionsToolbarButton
        events$={events$}
        settings$={settings$}
        onOpenFlyout={jest.fn()}
      />
    );

    expect(screen.getByTestId('duplicateDetectionsToolbarButtonIcon')).toBeInTheDocument();
    expect(screen.queryByTestId('duplicateDetectionsToolbarButtonBadge')).toBeNull();
  });

  it('shows the count badge once events arrive and updates live', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([baseEvent({ detectedAt: 1 })]);
    const settings$ = new BehaviorSubject<DetectorSettings>(baseSettings());

    render(
      <DuplicateDetectionsToolbarButton
        events$={events$}
        settings$={settings$}
        onOpenFlyout={jest.fn()}
      />
    );

    expect(screen.getByTestId('duplicateDetectionsToolbarButtonBadge')).toHaveTextContent('1');

    act(() => {
      events$.next([
        baseEvent({ detectedAt: 1 }),
        baseEvent({ detectedAt: 2 }),
        baseEvent({ detectedAt: 3 }),
      ]);
    });

    expect(screen.getByTestId('duplicateDetectionsToolbarButtonBadge')).toHaveTextContent('3');
  });

  it('caps the badge text at "99+" when there are 100+ events', () => {
    const many = Array.from({ length: 150 }, (_, i) => baseEvent({ detectedAt: i }));
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>(many);
    const settings$ = new BehaviorSubject<DetectorSettings>(baseSettings());

    render(
      <DuplicateDetectionsToolbarButton
        events$={events$}
        settings$={settings$}
        onOpenFlyout={jest.fn()}
      />
    );

    expect(screen.getByTestId('duplicateDetectionsToolbarButtonBadge')).toHaveTextContent('99+');
  });

  it('hides the badge and swaps the icon when detection is paused, even with events', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([baseEvent({ detectedAt: 1 })]);
    const settings$ = new BehaviorSubject<DetectorSettings>(baseSettings({ enabled: false }));

    render(
      <DuplicateDetectionsToolbarButton
        events$={events$}
        settings$={settings$}
        onOpenFlyout={jest.fn()}
      />
    );

    expect(screen.queryByTestId('duplicateDetectionsToolbarButtonBadge')).toBeNull();
    const icon = screen.getByTestId('duplicateDetectionsToolbarButtonIcon');
    // EuiButtonIcon renders the iconType via data-* / svg classes; the
    // aria-label is the most stable way to assert "paused" state.
    expect(icon).toHaveAttribute('aria-label', expect.stringMatching(/paused/i));
  });

  it('invokes onOpenFlyout when clicked', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
    const settings$ = new BehaviorSubject<DetectorSettings>(baseSettings());
    const onOpenFlyout = jest.fn();

    render(
      <DuplicateDetectionsToolbarButton
        events$={events$}
        settings$={settings$}
        onOpenFlyout={onOpenFlyout}
      />
    );

    fireEvent.click(screen.getByTestId('duplicateDetectionsToolbarButtonIcon'));
    expect(onOpenFlyout).toHaveBeenCalledTimes(1);
  });
});
