/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { OverviewTab } from './overview_tab';

jest.mock('../components/ai_summary_section', () => ({
  AISummarySection: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mock-ai-summary-section" data-hit-id={(hit as { id: string }).id} />
  ),
}));

jest.mock('../components/visualizations_section', () => ({
  VisualizationsSection: ({ hit }: { hit: DataTableRecord }) => (
    <div data-test-subj="mock-visualizations-section" data-hit-id={(hit as { id: string }).id} />
  ),
}));

jest.mock('../components/insights_section', () => ({
  InsightsSection: jest.fn(
    ({
      hit,
      onShowCorrelations,
      onShowEntities,
    }: {
      hit: DataTableRecord;
      onShowCorrelations?: () => void;
      onShowEntities?: () => void;
    }) => (
      <>
        <button
          type="button"
          data-test-subj="mock-insights-section"
          data-hit-id={(hit as { id: string }).id}
          data-has-on-show-correlations={String(onShowCorrelations != null)}
          onClick={onShowCorrelations}
        />
        <button
          type="button"
          data-test-subj="mock-insights-section-entities"
          data-has-on-show-entities={String(onShowEntities != null)}
          onClick={onShowEntities}
        />
      </>
    )
  ),
}));

const buildHit = (extra: Record<string, unknown> = {}): DataTableRecord =>
  ({
    id: 'attack-1',
    raw: { _id: 'attack-1', _index: '.alerts-security.attack-discovery.alerts-default' },
    flattened: {
      _id: 'attack-1',
      _index: '.alerts-security.attack-discovery.alerts-default',
      'kibana.alert.attack_discovery.summary_markdown_with_replacements': 'Summary text',
      ...extra,
    },
    isAnchor: false,
  } as unknown as DataTableRecord);

describe('<OverviewTab />', () => {
  it('renders without errors', () => {
    const { container } = render(<OverviewTab hit={buildHit()} />);
    expect(container).toBeTruthy();
  });

  it('renders AISummarySection', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-ai-summary-section')).toBeInTheDocument();
  });

  it('renders the overview tab container', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('attack-flyout-overview-tab')).toBeInTheDocument();
  });

  it('passes hit to AISummarySection', () => {
    const hit = buildHit();
    render(<OverviewTab hit={hit} />);
    expect(screen.getByTestId('mock-ai-summary-section')).toHaveAttribute(
      'data-hit-id',
      'attack-1'
    );
  });

  it('renders VisualizationsSection', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-visualizations-section')).toBeInTheDocument();
  });

  it('renders both AISummarySection and VisualizationsSection', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-ai-summary-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-visualizations-section')).toBeInTheDocument();
  });

  it('renders InsightsSection', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-insights-section')).toBeInTheDocument();
  });

  it('renders all three sections: summary, visualizations, and insights', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-ai-summary-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-visualizations-section')).toBeInTheDocument();
    expect(screen.getByTestId('mock-insights-section')).toBeInTheDocument();
  });

  it('passes hit to VisualizationsSection', () => {
    const hit = buildHit();
    render(<OverviewTab hit={hit} />);
    expect(screen.getByTestId('mock-visualizations-section')).toHaveAttribute(
      'data-hit-id',
      'attack-1'
    );
  });

  it('forwards onShowCorrelations to InsightsSection', () => {
    const onShowCorrelations = jest.fn();
    render(<OverviewTab hit={buildHit()} onShowCorrelations={onShowCorrelations} />);

    expect(screen.getByTestId('mock-insights-section')).toHaveAttribute(
      'data-has-on-show-correlations',
      'true'
    );
    fireEvent.click(screen.getByTestId('mock-insights-section'));
    expect(onShowCorrelations).toHaveBeenCalledTimes(1);
  });

  it('does not pass onShowCorrelations when it is omitted', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-insights-section')).toHaveAttribute(
      'data-has-on-show-correlations',
      'false'
    );
  });

  it('forwards onShowEntities to InsightsSection', () => {
    const onShowEntities = jest.fn();
    render(<OverviewTab hit={buildHit()} onShowEntities={onShowEntities} />);

    expect(screen.getByTestId('mock-insights-section-entities')).toHaveAttribute(
      'data-has-on-show-entities',
      'true'
    );
    fireEvent.click(screen.getByTestId('mock-insights-section-entities'));
    expect(onShowEntities).toHaveBeenCalledTimes(1);
  });

  it('does not pass onShowEntities when it is omitted', () => {
    render(<OverviewTab hit={buildHit()} />);
    expect(screen.getByTestId('mock-insights-section-entities')).toHaveAttribute(
      'data-has-on-show-entities',
      'false'
    );
  });
});
