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
  DuplicateDetectionsFlyout,
  type DuplicateDetectionsFlyoutProps,
} from './duplicate_detections_flyout';
import type { DuplicateDetectionEvent } from './duplicate_detections_toast';
import type { DetectorSettings } from './duplicate_detections_settings';

const defaultSettings: DetectorSettings = {
  enabled: true,
  ignoredPathPrefixes: [],
  scopedSources: [],
  scopedTeams: [],
};

const event = (overrides: Partial<DuplicateDetectionEvent> = {}): DuplicateDetectionEvent => ({
  source: 'SLO',
  method: 'GET',
  path: '/api/example',
  count: 2,
  elapsedMs: 250,
  detectedAt: 1,
  ...overrides,
});

const renderFlyout = (
  events$: BehaviorSubject<DuplicateDetectionEvent[]>,
  overrides: Partial<DuplicateDetectionsFlyoutProps> = {}
) => {
  const onClose = jest.fn();
  const onClearAll = jest.fn();
  const onUpdateSettings = jest.fn();
  const onResetSettings = jest.fn();
  const onExcludePath = jest.fn();
  const settings$ = overrides.settings$ ?? new BehaviorSubject<DetectorSettings>(defaultSettings);
  const utils = render(
    <DuplicateDetectionsFlyout
      events$={events$}
      settings$={settings$}
      onClose={onClose}
      onClearAll={onClearAll}
      onUpdateSettings={onUpdateSettings}
      onResetSettings={onResetSettings}
      onExcludePath={onExcludePath}
      {...overrides}
    />
  );
  return {
    ...utils,
    onClose,
    onClearAll,
    onUpdateSettings,
    onResetSettings,
    onExcludePath,
    settings$,
  };
};

describe('DuplicateDetectionsFlyout', () => {
  it('renders an empty-state when there are no events', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
    renderFlyout(events$);
    expect(screen.getByText(/No detections recorded yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('duplicateDetectionsFlyoutTable')).toBeNull();
  });

  it('renders one row per event and selects the initial anchor', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ path: '/api/c', detectedAt: 3 }),
      event({ path: '/api/b', detectedAt: 2 }),
      event({ path: '/api/a', detectedAt: 1 }),
    ]);
    renderFlyout(events$, { initialAnchorDetectedAt: 2 });

    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-3')).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-2')).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-1')).toBeInTheDocument();
    // Details panel reflects the anchored row
    expect(screen.getByText('Endpoint')).toBeInTheDocument();
  });

  it('filters rows by free-text search', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ path: '/api/slo/_find', detectedAt: 2 }),
      event({ path: '/api/synthetics/monitors', detectedAt: 1 }),
    ]);
    renderFlyout(events$);

    fireEvent.change(screen.getByTestId('duplicateDetectionsFlyoutSearch'), {
      target: { value: 'synthetics' },
    });

    expect(screen.queryByTestId('duplicateDetectionsFlyoutRow-2')).toBeNull();
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-1')).toBeInTheDocument();
  });

  it('filters rows by source via the filter button group', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ source: 'SLO', detectedAt: 2 }),
      event({ source: 'Synthetics', detectedAt: 1 }),
    ]);
    renderFlyout(events$);

    fireEvent.click(screen.getByTestId('duplicateDetectionsFlyoutSourceFilter-Synthetics'));

    expect(screen.queryByTestId('duplicateDetectionsFlyoutRow-2')).toBeNull();
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-1')).toBeInTheDocument();
  });

  it('shows a "no matches" callout when filters eliminate every row', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ path: '/api/slo/_find', detectedAt: 1 }),
    ]);
    renderFlyout(events$);

    fireEvent.change(screen.getByTestId('duplicateDetectionsFlyoutSearch'), {
      target: { value: 'nothing-matches' },
    });

    expect(screen.getByText(/No detections match the current filter/i)).toBeInTheDocument();
  });

  it('updates row count live when the events subject pushes new data', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    renderFlyout(events$);
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-1')).toBeInTheDocument();

    act(() => {
      events$.next([event({ detectedAt: 2, path: '/new' }), event({ detectedAt: 1 })]);
    });

    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-2')).toBeInTheDocument();
    expect(screen.getByTestId('duplicateDetectionsFlyoutRow-1')).toBeInTheDocument();
  });

  it('calls onClearAll when the "Clear all detections" button is clicked', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const { onClearAll } = renderFlyout(events$);
    fireEvent.click(screen.getByTestId('duplicateDetectionsFlyoutClearAll'));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('disables the "Clear all detections" button when there is nothing to clear', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([]);
    renderFlyout(events$);
    expect(screen.getByTestId('duplicateDetectionsFlyoutClearAll')).toBeDisabled();
  });

  it('shows the "Active app" row in the details pane only when the active app differs from the source', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({
        source: 'telemetry',
        app: 'synthetics',
        detectedAt: 2,
        path: '/internal/telemetry/config',
      }),
      event({
        source: 'synthetics',
        app: 'synthetics',
        detectedAt: 1,
        path: '/api/synthetics/monitors',
      }),
    ]);
    renderFlyout(events$, { initialAnchorDetectedAt: 2 });

    expect(screen.getByText('Active app')).toBeInTheDocument();

    // Switching to the row where source === app should hide the Active app row.
    fireEvent.click(screen.getByTestId('duplicateDetectionsFlyoutRow-1'));
    expect(screen.queryByText('Active app')).toBeNull();
  });

  it('invokes onExcludePath with the path (no query string) when the row "Mute endpoint" action is clicked', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({
        path: '/internal/data_views/fields?pattern=synthetics-*',
        detectedAt: 1,
      }),
    ]);
    const { onExcludePath } = renderFlyout(events$);

    const muteButtons = screen.getAllByTestId('duplicateDetectionsFlyoutMuteAction');
    expect(muteButtons).toHaveLength(1);
    fireEvent.click(muteButtons[0]);
    expect(onExcludePath).toHaveBeenCalledWith('/internal/data_views/fields');
  });

  it('switches to the Settings tab and forwards onUpdate/onReset to the panel', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({ source: 'synthetics', detectedAt: 1 }),
    ]);
    const settings$ = new BehaviorSubject<DetectorSettings>(defaultSettings);
    const { onUpdateSettings, onResetSettings } = renderFlyout(events$, { settings$ });

    fireEvent.click(screen.getByTestId('duplicateDetectionsFlyoutTab-settings'));
    expect(screen.getByTestId('duplicateDetectionsSettingsPanel')).toBeInTheDocument();
    // Footer's "Clear all" only belongs on the Detections tab.
    expect(screen.queryByTestId('duplicateDetectionsFlyoutClearAll')).toBeNull();

    fireEvent.click(screen.getByTestId('duplicateDetectionsSettingsEnabledSwitch'));
    expect(onUpdateSettings).toHaveBeenCalledWith({ enabled: false });

    fireEvent.click(screen.getByTestId('duplicateDetectionsSettingsResetBtn'));
    expect(onResetSettings).toHaveBeenCalledTimes(1);
  });

  it('renders on the Settings tab when initialTab="settings"', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    renderFlyout(events$, { initialTab: 'settings' });

    expect(screen.getByTestId('duplicateDetectionsSettingsPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('duplicateDetectionsFlyoutTable')).toBeNull();
  });

  it('enables the teams combo box once ownersSnapshot$ pushes a non-empty knownTeams list', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const ownersSnapshot$ = new BehaviorSubject<{
      owners: Record<string, string[]>;
      knownTeams: string[];
    }>({
      owners: { slo: ['@elastic/actionable-obs-team'] },
      knownTeams: ['@elastic/actionable-obs-team', '@elastic/kibana-security'],
    });
    renderFlyout(events$, { initialTab: 'settings', ownersSnapshot$ });

    const teamsCombo = screen.getByTestId('duplicateDetectionsSettingsScopeTeamsCombo');
    expect(teamsCombo).toBeInTheDocument();
    // EuiComboBox renders an inner <input>; when knownTeams is non-empty the
    // combo box is enabled and the input has no `disabled` attribute.
    const input = teamsCombo.querySelector('input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(false);
  });

  it('disables the teams combo box when ownersSnapshot$ is empty (route unavailable in non-dev)', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    renderFlyout(events$, { initialTab: 'settings' });

    const teamsCombo = screen.getByTestId('duplicateDetectionsSettingsScopeTeamsCombo');
    const input = teamsCombo.querySelector('input') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(true);
  });

  it('hides the "Detect my teams" button when no onDetectMyTeams callback is provided', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    renderFlyout(events$, { initialTab: 'settings' });
    expect(screen.queryByTestId('duplicateDetectionsSettingsDetectMyTeamsBtn')).toBeNull();
  });

  it('renders the "Detect my teams" button when onDetectMyTeams is provided', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    renderFlyout(events$, { initialTab: 'settings', onDetectMyTeams: jest.fn() });
    expect(screen.getByTestId('duplicateDetectionsSettingsDetectMyTeamsBtn')).toBeInTheDocument();
  });

  it('shows suggested teams from onDetectMyTeams and forwards the picked team into scopedTeams', async () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const onDetectMyTeams = jest.fn(async () => ({
      detectedEmail: 'shahzad@elastic.co',
      suggestedTeams: [
        { team: '@elastic/actionable-obs-team', evidenceCount: 47 },
        { team: '@elastic/kibana-security', evidenceCount: 3 },
      ],
      matchedFileCount: 50,
      scannedFileCount: 73,
      detectedAt: '2026-05-21T00:00:00.000Z',
    }));

    const { onUpdateSettings } = renderFlyout(events$, {
      initialTab: 'settings',
      onDetectMyTeams,
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('duplicateDetectionsSettingsDetectMyTeamsBtn'));
    });

    expect(onDetectMyTeams).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Detected as shahzad@elastic\.co/)).toBeInTheDocument();
    expect(
      screen.getByTestId('duplicateDetectionsSettingsSuggestion-@elastic/actionable-obs-team')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId('duplicateDetectionsSettingsSuggestion-@elastic/actionable-obs-team')
    );
    expect(onUpdateSettings).toHaveBeenCalledWith({
      scopedTeams: ['@elastic/actionable-obs-team'],
    });
  });

  it('falls back to a "no teams inferred" message when the server returns zero suggestions', async () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const onDetectMyTeams = jest.fn(async () => ({
      detectedEmail: 'shahzad@elastic.co',
      suggestedTeams: [],
      matchedFileCount: 0,
      scannedFileCount: 0,
      detectedAt: '2026-05-21T00:00:00.000Z',
    }));

    renderFlyout(events$, { initialTab: 'settings', onDetectMyTeams });

    await act(async () => {
      fireEvent.click(screen.getByTestId('duplicateDetectionsSettingsDetectMyTeamsBtn'));
    });

    expect(screen.getByTestId('duplicateDetectionsSettingsNoSuggestions')).toBeInTheDocument();
  });

  it('renders a "Report on GitHub" button in the details pane with a pre-filled new-issue URL', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([
      event({
        source: 'telemetry',
        method: 'POST',
        path: '/internal/telemetry/config?env=dev',
        count: 4,
        elapsedMs: 1500,
        detectedAt: 1,
      }),
    ]);
    renderFlyout(events$);

    const githubLink = screen.getByTestId(
      'duplicateDetectionsFlyoutReportGithub'
    ) as HTMLAnchorElement;

    expect(githubLink.href).toContain('https://github.com/elastic/kibana/issues/new');
    expect(githubLink.target).toBe('_blank');

    const parsed = new URL(githubLink.href);
    const title = parsed.searchParams.get('title') ?? '';
    const body = parsed.searchParams.get('body') ?? '';

    // Title carries the source plugin + path (query stripped).
    expect(title).toBe('[telemetry] Duplicate network request to POST /internal/telemetry/config');
    // Body carries the structured detection metadata.
    expect(body).toContain('| Source plugin | `telemetry` |');
    expect(body).toContain('| Method | `POST` |');
    expect(body).toContain('| Path | `/internal/telemetry/config?env=dev` |');
    expect(body).toContain('| Identical requests | 4 |');
    expect(body).toContain('| Burst window | 1.5s |');
  });

  it('calls onClose when the close button is clicked', () => {
    const events$ = new BehaviorSubject<DuplicateDetectionEvent[]>([event({ detectedAt: 1 })]);
    const { onClose } = renderFlyout(events$);
    fireEvent.click(screen.getByTestId('duplicateDetectionsFlyoutClose'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
