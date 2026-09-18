/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { ListInvestigationItem } from '@kbn/nightshift-investigations-plugin/common';
import { InvestigationSection } from './investigation_section';

const investigation: ListInvestigationItem = {
  investigation_id: 'investigation-1',
  title: 'Checkout errors',
  status: 'completed',
  created_at: '2026-09-11T09:00:00.000Z',
  subject: { type: 'significant_event', id: 'event-1', summary: 'Investigate checkout errors' },
  summary: 'Checkout errors are elevated',
  severity: '80-critical',
};

const renderSection = ({
  isInitialLoading = false,
  investigations = [],
  total = 0,
  hasMore = false,
  error = null,
  onShowMore = jest.fn(),
  onRetry = jest.fn(),
}: {
  isInitialLoading?: boolean;
  investigations?: ListInvestigationItem[];
  total?: number;
  hasMore?: boolean;
  error?: Error | null;
  onShowMore?: () => void;
  onRetry?: () => void;
} = {}) =>
  render(
    <I18nProvider>
      <InvestigationSection
        id="80-critical"
        investigations={investigations}
        total={total}
        hasMore={hasMore}
        isInitialLoading={isInitialLoading}
        error={error}
        onShowMore={onShowMore}
        onRetry={onRetry}
      />
    </I18nProvider>
  );

describe('InvestigationSection', () => {
  it('shows a skeleton, and no count, while the section is still loading', () => {
    renderSection({ isInitialLoading: true });

    expect(
      screen.getByTestId('nightshiftInvestigationSectionSkeleton-80-critical')
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('nightshiftInvestigationSectionCount-80-critical')
    ).not.toBeInTheDocument();
  });

  it('renders nothing once a section resolves empty, so the list can drop it', () => {
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
  });

  it('shows Show more only when more investigations are available', () => {
    const { rerender } = render(
      <I18nProvider>
        <InvestigationSection
          id="80-critical"
          investigations={[investigation]}
          total={1}
          hasMore={false}
          onShowMore={jest.fn()}
          onRetry={jest.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.queryByTestId('nightshiftInvestigationSectionShowMore-80-critical')
    ).not.toBeInTheDocument();

    rerender(
      <I18nProvider>
        <InvestigationSection
          id="80-critical"
          investigations={[investigation]}
          total={11}
          hasMore={true}
          onShowMore={jest.fn()}
          onRetry={jest.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.getByTestId('nightshiftInvestigationSectionShowMore-80-critical')
    ).toBeInTheDocument();
  });

  it('loads more investigations for this section only', () => {
    const onShowMore = jest.fn();
    renderSection({ investigations: [investigation], total: 11, hasMore: true, onShowMore });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionShowMore-80-critical'));
    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it('retries a failed section load', () => {
    const onRetry = jest.fn();
    renderSection({ error: new Error('Network unavailable'), onRetry });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionRetry-80-critical'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No investigations found')).not.toBeInTheDocument();
  });
});
