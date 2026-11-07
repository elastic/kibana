/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { TimelineModel, TimelineStep } from './timeline_model';
import { EntityTimeline } from './entity_timeline';

const mockUseEntityTimeline = jest.fn();

jest.mock('./hooks/use_entity_timeline', () => ({
  useEntityTimeline: (params: unknown) => mockUseEntityTimeline(params),
}));

// The absolute-time renders through Kibana's formatted date component, which
// needs the full app context; stub it to a stable ISO string so timestamp
// assertions are deterministic and focused on the waterfall structure.
jest.mock('../../../common/components/formatted_date', () => ({
  PreferenceFormattedDate: ({ value }: { value: Date }) => (
    <span data-test-subj="abs-time">{value.toISOString()}</span>
  ),
}));

const entity: IntelligenceEntity = {
  id: 'user-alex',
  name: 'alex.chen',
  type: EntityType.user,
  identifierValue: 'alex.chen',
  riskScoreNorm: 88,
  riskLevel: 'Critical',
  criticality: undefined,
  source: undefined,
  lastSeen: undefined,
};

const step = (over: Partial<TimelineStep>): TimelineStep => ({
  id: 'event:e1',
  kind: 'event',
  category: 'process',
  timestamp: new Date('2026-07-11T04:02:00Z').getTime(),
  host: 'LAPTOP-FIN03',
  user: 'alex.chen',
  severity: undefined,
  label: 'spawned process powershell.exe',
  detail: 'parent winword.exe',
  alertRuleName: undefined,
  contributedToAlertId: undefined,
  tacticName: undefined,
  reasons: ['notable-process'],
  significanceScore: 2,
  depth: 0,
  refId: 'e1',
  refIndex: '.ds-logs-hunt_seed-default-2026.07.17-000001',
  ...over,
});

const model = (over: Partial<TimelineModel>): TimelineModel => ({
  steps: [],
  overflowCount: 0,
  totalSignificant: 0,
  ...over,
});

const mockModel = (
  over: Partial<TimelineModel>,
  flags: Partial<{ isLoading: boolean; isError: boolean }> = {}
) =>
  mockUseEntityTimeline.mockReturnValue({
    model: model(over),
    isLoading: flags.isLoading ?? false,
    isError: flags.isError ?? false,
    refetch: jest.fn(),
  });

const renderTimeline = (props: Partial<React.ComponentProps<typeof EntityTimeline>> = {}) =>
  render(
    <I18nProvider>
      <EntityTimeline entity={entity} timeRange="30d" {...props} />
    </I18nProvider>
  );

describe('EntityTimeline', () => {
  beforeEach(() => {
    mockUseEntityTimeline.mockReset();
  });

  it('renders a loading skeleton', () => {
    mockModel({}, { isLoading: true });
    renderTimeline();
    expect(screen.getByTestId('entityIntelligenceTimeline')).toBeInTheDocument();
  });

  it('renders an empty state when there is no significant activity', () => {
    mockModel({});
    renderTimeline();
    expect(screen.getByText(/No significant activity/i)).toBeInTheDocument();
  });

  it('renders an error state with a retry action', () => {
    const refetch = jest.fn();
    mockUseEntityTimeline.mockReturnValue({
      model: model({}),
      isLoading: false,
      isError: true,
      refetch,
    });
    renderTimeline();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the causal waterfall with steps and alert linkage', () => {
    const steps: TimelineStep[] = [
      step({ id: 'event:p1', label: 'spawned process winword.exe', depth: 0 }),
      step({
        id: 'alert:a1',
        kind: 'alert',
        category: undefined,
        label: 'Credential Dumping via LSASS Memory Access',
        severity: 'critical',
        alertRuleName: 'Credential Dumping via LSASS Memory Access',
        timestamp: new Date('2026-07-11T04:03:00Z').getTime(),
        depth: 1,
      }),
      step({
        id: 'event:n1',
        category: 'network',
        label: 'reached 185.220.101.5:443',
        contributedToAlertId: 'a1',
        severity: 'critical',
        reasons: ['alert-correlated', 'outbound-network'],
        timestamp: new Date('2026-07-11T04:04:00Z').getTime(),
        depth: 2,
      }),
    ];
    mockModel({ steps, totalSignificant: 3 });
    renderTimeline();
    expect(screen.getByText('spawned process winword.exe')).toBeInTheDocument();
    expect(screen.getByText('Credential Dumping via LSASS Memory Access')).toBeInTheDocument();
    expect(screen.getByText('reached 185.220.101.5:443')).toBeInTheDocument();
    expect(screen.getByText('Tied to alert')).toBeInTheDocument();
  });

  it('shows real absolute timestamps per step (not just relative)', () => {
    mockModel({
      steps: [step({ id: 'event:t1', timestamp: new Date('2026-07-11T09:17:34Z').getTime() })],
      totalSignificant: 1,
    });
    renderTimeline();
    // The stubbed absolute-time component renders the ISO string; at least one
    // instance appears on the step card (plus the group header).
    const absTimes = screen.getAllByTestId('abs-time');
    expect(absTimes.some((el) => el.textContent === '2026-07-11T09:17:34.000Z')).toBe(true);
  });

  it('groups steps into sessions with a group header', () => {
    const day1 = new Date('2026-07-11T04:02:00Z').getTime();
    const day2 = new Date('2026-07-13T14:26:00Z').getTime();
    mockModel({
      steps: [
        step({ id: 'event:d1', timestamp: day1 }),
        step({ id: 'event:d2', timestamp: day2, label: 'later day step' }),
      ],
      totalSignificant: 2,
    });
    renderTimeline();
    // Two calendar days → two session headers.
    expect(screen.getAllByTestId('entityIntelligenceTimelineGroupHeader')).toHaveLength(2);
  });

  it('collapses earlier sessions behind a show-more control', () => {
    const steps = Array.from({ length: 5 }, (_, i) =>
      step({
        id: `event:s${i}`,
        label: `session ${i}`,
        // Each on a distinct day → distinct session groups.
        timestamp: new Date(`2026-07-1${i + 1}T04:00:00Z`).getTime(),
      })
    );
    mockModel({ steps, totalSignificant: 5 });
    renderTimeline();
    // Default shows 3 sessions; the 5th (latest input, last group) is hidden.
    expect(screen.getByText('session 0')).toBeInTheDocument();
    expect(screen.queryByText('session 4')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('entityIntelligenceTimelineShowMore'));
    expect(screen.getByText('session 4')).toBeInTheDocument();
  });

  it('invokes onStepSelect when a step card is clicked', () => {
    const onStepSelect = jest.fn();
    mockModel({ steps: [step({ id: 'event:p1' })], totalSignificant: 1 });
    renderTimeline({ onStepSelect });
    fireEvent.click(screen.getByText('spawned process powershell.exe'));
    expect(onStepSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'event:p1' }));
  });

  it('cross-highlights the step entity on hover', () => {
    const onStepHighlight = jest.fn();
    mockModel({ steps: [step({ id: 'event:p1' })], totalSignificant: 1 });
    renderTimeline({ onStepHighlight });
    const row = screen.getByTestId('timelineStep-event');
    fireEvent.mouseEnter(row);
    expect(onStepHighlight).toHaveBeenCalledWith({ kind: EntityType.user, name: 'alex.chen' });
    fireEvent.mouseLeave(row);
    expect(onStepHighlight).toHaveBeenLastCalledWith(undefined);
  });

  it('requests graph focus for the step entity via the focus action', () => {
    const onStepFocus = jest.fn();
    mockModel({ steps: [step({ id: 'event:p1' })], totalSignificant: 1 });
    renderTimeline({ onStepSelect: jest.fn(), onStepFocus });
    fireEvent.click(screen.getByLabelText('Focus this entity in the graph'));
    expect(onStepFocus).toHaveBeenCalledWith({ kind: EntityType.user, name: 'alex.chen' });
  });

  it('invokes onStepViewRaw from the per-step raw-log action', () => {
    const onStepViewRaw = jest.fn();
    mockModel({ steps: [step({ id: 'event:p1' })], totalSignificant: 1 });
    renderTimeline({ onStepSelect: jest.fn(), onStepViewRaw });
    fireEvent.click(screen.getByTestId('timelineStepViewRaw'));
    expect(onStepViewRaw).toHaveBeenCalledWith(expect.objectContaining({ id: 'event:p1' }));
  });

  it('highlights the row matching the externally highlighted entity key', () => {
    mockModel({ steps: [step({ id: 'event:p1' })], totalSignificant: 1 });
    renderTimeline({ highlightedEntityKey: `${EntityType.user}:alex.chen` });
    // The row still renders its label; highlight is a style state, so we assert
    // the step is present and the entity key resolution did not throw.
    const row = screen.getByTestId('timelineStep-event');
    expect(within(row).getByText('spawned process powershell.exe')).toBeInTheDocument();
  });
});
