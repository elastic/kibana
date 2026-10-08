/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationState } from '@kbn/significant-events-schema';
import type { GetInvestigationResponse } from '../../common';
import type { InvestigationVisualiserFlyoutProps } from './decision_tree/investigation_visualiser_flyout';
import { InvestigationDetailFlyout } from './investigation_detail_flyout';

jest.mock('./decision_tree/investigation_visualiser_flyout', () => ({
  InvestigationVisualiserFlyout: ({ trigger, state }: InvestigationVisualiserFlyoutProps) => (
    <div data-test-subj="mockInvestigationVisualiserFlyout">
      {`${state.hypotheses.length} hypotheses for ${trigger.name}`}
    </div>
  ),
}));

const investigation = (
  overrides: Partial<GetInvestigationResponse> = {}
): GetInvestigationResponse => ({
  investigation_id: 'exec-1',
  title: 'Checkout latency spike',
  subject: { type: 'manual', id: 'manual' },
  status: 'running',
  created_at: '2026-09-15T12:00:00.000Z',
  started_at: '2026-09-15T12:00:01.000Z',
  ...overrides,
});

const renderFlyout = ({
  inv,
  progress,
}: {
  inv: GetInvestigationResponse;
  progress?: InvestigationState;
}) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <InvestigationDetailFlyout
          investigation={inv}
          isLoading={false}
          error={null}
          onClose={jest.fn()}
          progress={progress}
        />
      </I18nProvider>
    </EuiProvider>
  );

describe('InvestigationDetailFlyout', () => {
  it('shows the live snapshot while the run has nothing persisted yet', () => {
    renderFlyout({
      inv: investigation(),
      progress: {
        summary: 'Checking the checkout latency spike',
        hypotheses: [
          { candidate: 'Connection pool exhaustion', confidence: 0.6, status: 'investigating' },
        ],
      },
    });

    expect(screen.getByText('Checking the checkout latency spike')).toBeInTheDocument();
    expect(screen.getByText('1 hypothesis analyzed')).toBeInTheDocument();
  });

  it('holds back a mid-run conclusion, which is still a draft', () => {
    renderFlyout({
      inv: investigation(),
      progress: {
        summary: 'Still narrowing it down',
        hypotheses: [],
        conclusion: 'Probably the pool size change',
      },
    });

    expect(screen.queryByText('Probably the pool size change')).not.toBeInTheDocument();
  });

  it('shows the conclusion once the run has ended', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        summary: 'Pool size change caused the spike',
        hypotheses: [],
        conclusion: 'The pool size change caused the spike',
      }),
    });

    expect(screen.getByText('The pool size change caused the spike')).toBeInTheDocument();
  });

  it('does not show a chart under the conclusion', () => {
    const chart = {
      type: 'line' as const,
      title: 'Active connections',
      x_axis: { type: 'time' as const },
      y_axis: {},
      series: [{ name: 'checkout', points: [{ x: '2026-09-15T12:00:00.000Z', y: 10 }] }],
    };
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        hypotheses: [
          { candidate: 'DNS failure', confidence: 0.2, status: 'dismissed' },
          {
            candidate: 'Pool exhaustion',
            confidence: 0.9,
            status: 'confirmed',
            evidence: [{ description: 'Pool saturated at 12:02', chart }],
          },
        ],
        conclusion: 'The pool size change caused the spike',
      }),
    });

    expect(screen.queryByTestId('investigationOutputConclusionChart')).not.toBeInTheDocument();
  });

  it('offers all hypotheses between the conclusion and the proposed actions', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        hypotheses: [{ candidate: 'Pool exhaustion', confidence: 0.9, status: 'confirmed' }],
        conclusion: 'The pool size change caused the spike',
        recommendations: [{ title: 'Raise the pool size', confidence: 0.8 }],
      }),
    });

    const conclusion = screen.getByTestId('investigationOutputConclusion');
    const card = screen.getByTestId('nightshiftInvestigationDecisionTreeButton');
    const actions = screen.getByTestId('investigationOutputRecommendations');
    expect(conclusion.compareDocumentPosition(card)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(card.compareDocumentPosition(actions)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('keeps the persisted result when a late snapshot arrives after completion', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        summary: 'Pool size change caused the spike',
        hypotheses: [],
      }),
      progress: { summary: 'Still narrowing it down', hypotheses: [] },
    });

    expect(screen.getByText('Pool size change caused the spike')).toBeInTheDocument();
    expect(screen.queryByText('Still narrowing it down')).not.toBeInTheDocument();
  });

  it('tells the user it is working when a live run has produced nothing yet', () => {
    renderFlyout({ inv: investigation() });

    expect(
      screen.getByTestId('nightshiftInvestigationDetailFlyoutProgressPending')
    ).toBeInTheDocument();
  });

  it('hides the subject of a manual run, which points at no entity', () => {
    renderFlyout({ inv: investigation({ subject: { type: 'manual', id: 'manual' } }) });

    expect(screen.queryByText('Subject')).not.toBeInTheDocument();
  });

  it('keeps the subject when the caller named one', () => {
    renderFlyout({
      inv: investigation({ subject: { type: 'manual', id: 'checkout-latency' } }),
    });

    expect(screen.getByText('Subject')).toBeInTheDocument();
    // Also the headline, which falls back to the subject id, hence more than one match.
    expect(screen.getAllByTitle('checkout-latency').length).toBeGreaterThan(0);
  });

  it('keeps the subject for a run that does point at an entity', () => {
    renderFlyout({ inv: investigation({ subject: { type: 'alert', id: 'alert-42' } }) });

    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getAllByTitle('alert-42').length).toBeGreaterThan(0);
  });

  it('does not claim to be working once the run has ended', () => {
    renderFlyout({
      inv: investigation({ status: 'completed', completed_at: '2026-09-15T12:10:00.000Z' }),
    });

    expect(
      screen.queryByTestId('nightshiftInvestigationDetailFlyoutProgressPending')
    ).not.toBeInTheDocument();
  });

  it('renders the investigation template sections of a completed run', () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        severity: 'high',
        summary: 'Checkout **failed** for 30% of requests.',
        conclusion: 'The 12:02 deploy shrank the connection pool.',
        impact: {
          summary: 'Order placement failed for 40 minutes in all regions.',
          evidence: { description: 'Failed order placements per 5 minutes.' },
        },
        hypotheses: [
          {
            candidate: 'Connection pool exhaustion',
            confidence: 0.9,
            status: 'confirmed',
            evidence: [{ description: 'Pool at 100%.' }],
          },
        ],
      }),
    });

    expect(screen.getByText('What happened')).toBeInTheDocument();
    expect(screen.getByText('failed').tagName).toBe('STRONG');
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(
      screen.getByText('Order placement failed for 40 minutes in all regions.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('investigationOutputImpactEvidence')).toHaveTextContent(
      'Failed order placements per 5 minutes.'
    );
    expect(screen.getByText('Conclusion')).toBeInTheDocument();
    expect(screen.getByText('View Hypothesis Tree')).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationDetailFlyoutSeverity')).toHaveTextContent(
      'High'
    );
  });

  it('replaces the hypothesis list with a card that opens the visualiser', async () => {
    renderFlyout({
      inv: investigation({
        status: 'completed',
        completed_at: '2026-09-15T12:10:00.000Z',
        hypotheses: [
          { candidate: 'Connection pool exhaustion', confidence: 0.9, status: 'confirmed' },
          { candidate: 'DNS failure', confidence: 0.1, status: 'dismissed' },
        ],
      }),
    });

    expect(screen.queryByTestId('investigationOutputHypothesis')).not.toBeInTheDocument();
    expect(screen.getByText('2 hypotheses analyzed')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nightshiftInvestigationDecisionTreeButton'));

    expect(await screen.findByTestId('mockInvestigationVisualiserFlyout')).toHaveTextContent(
      '2 hypotheses for Checkout latency spike'
    );
  });

  it('does not offer the visualiser before any hypothesis exists', () => {
    renderFlyout({ inv: investigation() });

    expect(
      screen.queryByTestId('nightshiftInvestigationDecisionTreeButton')
    ).not.toBeInTheDocument();
  });
});
