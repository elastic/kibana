/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';
import { InvestigationSection, type InvestigationSectionProps } from './investigation_section';

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      agenticInvestigations: {
        InvestigationCard: ({ investigation: item }: { investigation: InvestigationSummary }) => (
          <div data-test-subj="investigationCard">{item.title}</div>
        ),
      },
    },
  }),
}));

const investigation: InvestigationSummary = {
  id: 'investigation-1',
  title: 'Checkout errors',
  title_pending: false,
  created_at: '2026-09-11T09:00:00.000Z',
  updated_at: '2026-09-11T09:00:00.000Z',
  agent_id: 'nightshift.investigation',
  metadata: { status: 'open', severity: 'critical', summary: 'Checkout errors are elevated' },
  in_progress: false,
  subjects: [],
};

const renderSection = ({
  id = 'critical',
  isInitialLoading = false,
  investigations = [],
  total = 0,
  hasMore = false,
  error = null,
  isExpanded = true,
  onToggle = jest.fn(),
  onShowMore = jest.fn(),
  onRetry = jest.fn(),
}: Partial<InvestigationSectionProps> = {}) =>
  render(
    <I18nProvider>
      <InvestigationSection
        id={id}
        investigations={investigations}
        total={total}
        hasMore={hasMore}
        isInitialLoading={isInitialLoading}
        error={error}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onShowMore={onShowMore}
        onRetry={onRetry}
      />
    </I18nProvider>
  );

/** EUI makes the accordion arrow the keyboard control; it carries the expanded state. */
const getToggleControl = (id: string): HTMLElement => {
  const control = document.querySelector<HTMLElement>(
    `[aria-controls="nightshiftInvestigationSection-${id}-accordion"][aria-expanded]`
  );
  if (control == null) {
    throw new Error(`No toggle control for section ${id}`);
  }
  return control;
};

describe('InvestigationSection', () => {
  it('shows a skeleton, and no count, while the section is still loading', () => {
    renderSection({ isInitialLoading: true });

    expect(
      screen.getByTestId('nightshiftInvestigationSectionSkeleton-critical')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftInvestigationSectionCount-critical')
    ).not.toBeInTheDocument();
  });

  it('renders nothing once a section resolves empty, so the list can drop it', () => {
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  it('shows Show more only when more investigations are available', () => {
    const { unmount } = renderSection({ investigations: [investigation], total: 1 });

    expect(
      screen.queryByTestId('nightshiftInvestigationSectionShowMore-critical')
    ).not.toBeInTheDocument();
    unmount();

    renderSection({ investigations: [investigation], total: 11, hasMore: true });

    expect(
      screen.getByTestId('nightshiftInvestigationSectionShowMore-critical')
    ).toBeInTheDocument();
  });

  it('says how many rows the next page brings out of those not loaded yet', () => {
    const { unmount } = renderSection({
      investigations: [investigation],
      total: 23,
      hasMore: true,
    });

    expect(screen.getByTestId('nightshiftInvestigationSectionShowMore-critical')).toHaveTextContent(
      'Show 10 more of 22'
    );
    unmount();

    renderSection({ investigations: [investigation], total: 5, hasMore: true });

    expect(screen.getByTestId('nightshiftInvestigationSectionShowMore-critical')).toHaveTextContent(
      'Show 4 more of 4'
    );
  });

  it('keeps the heading and count while collapsed, and hides the rows from assistive tech', () => {
    renderSection({ investigations: [investigation], total: 1, isExpanded: false });

    expect(screen.getByRole('heading', { name: 'Critical' })).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationSectionCount-critical')).toHaveTextContent(
      '1'
    );
    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('investigationCard').closest('[inert]')).not.toBeNull();
  });

  it('exposes the rows while expanded', () => {
    renderSection({ investigations: [investigation], total: 1, isExpanded: true });

    expect(getToggleControl('critical')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('investigationCard').closest('[inert]')).toBeNull();
  });

  it('toggles from the whole header and from the arrow', () => {
    const onToggle = jest.fn();
    renderSection({ investigations: [investigation], total: 1, onToggle });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionToggle-critical'));
    fireEvent.click(getToggleControl('critical'));

    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('titles the closed section', () => {
    renderSection({ id: 'closed', investigations: [investigation], total: 1 });

    expect(screen.getByRole('heading', { name: 'Closed' })).toBeInTheDocument();
    expect(screen.getByTestId('nightshiftInvestigationSection-closed')).toBeInTheDocument();
  });

  it('loads more investigations for this section only', () => {
    const onShowMore = jest.fn();
    renderSection({ investigations: [investigation], total: 11, hasMore: true, onShowMore });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionShowMore-critical'));
    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it('retries a failed section load', () => {
    const onRetry = jest.fn();
    renderSection({ error: new Error('Network unavailable'), onRetry });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionRetry-critical'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No investigations found')).not.toBeInTheDocument();
  });
});
