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
import { InvestigationSection } from './investigation_section';

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      agenticInvestigations: {
        // Like the real card, the actions sit beside the button that opens the investigation.
        InvestigationCard: ({
          investigation: item,
          onClick,
          actions,
        }: {
          investigation: InvestigationSummary;
          onClick?: (investigation: InvestigationSummary) => void;
          actions?: React.ReactNode;
        }) => (
          <div data-test-subj="investigationCard">
            <button type="button" onClick={() => onClick?.(item)}>
              {item.title}
            </button>
            {actions}
          </div>
        ),
      },
    },
  }),
}));

jest.mock('./investigation_card_actions', () => ({
  InvestigationCardActions: ({ assignees }: { assignees?: React.ReactNode }) => (
    <div>{assignees}</div>
  ),
}));

const mockUseInvestigationAssignees = jest.fn(
  (_investigations: InvestigationSummary[]) => (item: InvestigationSummary) =>
    (
      <button type="button" data-test-subj={`assignees-${item.id}`}>
        {(item.metadata.assignees ?? []).join(',')}
      </button>
    )
);

jest.mock('./use_investigation_assignees', () => ({
  useInvestigationAssignees: (investigations: InvestigationSummary[]) =>
    mockUseInvestigationAssignees(investigations),
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
  isInitialLoading = false,
  investigations = [],
  total = 0,
  hasMore = false,
  error = null,
  onShowMore = jest.fn(),
  onRetry = jest.fn(),
}: {
  isInitialLoading?: boolean;
  investigations?: InvestigationSummary[];
  total?: number;
  hasMore?: boolean;
  error?: Error | null;
  onShowMore?: () => void;
  onRetry?: () => void;
} = {}) =>
  render(
    <I18nProvider>
      <InvestigationSection
        id="critical"
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
    const { rerender } = render(
      <I18nProvider>
        <InvestigationSection
          id="critical"
          investigations={[investigation]}
          total={1}
          hasMore={false}
          onShowMore={jest.fn()}
          onRetry={jest.fn()}
        />
      </I18nProvider>
    );

    expect(
      screen.queryByTestId('nightshiftInvestigationSectionShowMore-critical')
    ).not.toBeInTheDocument();

    rerender(
      <I18nProvider>
        <InvestigationSection
          id="critical"
          investigations={[investigation]}
          total={11}
          hasMore={true}
          onShowMore={jest.fn()}
          onRetry={jest.fn()}
        />
      </I18nProvider>
    );

    const showMore = screen.getByTestId('nightshiftInvestigationSectionShowMore-critical');
    expect(showMore).toBeInTheDocument();
    expect(showMore).toHaveTextContent('Show 3 more');
  });

  it('loads more investigations for this section only', () => {
    const onShowMore = jest.fn();
    renderSection({ investigations: [investigation], total: 11, hasMore: true, onShowMore });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionShowMore-critical'));
    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it("shows each card's assignees, resolved once for the whole section", () => {
    const assigned: InvestigationSummary = {
      ...investigation,
      id: 'investigation-2',
      metadata: { ...investigation.metadata, assignees: ['uid-1', 'uid-2'] },
    };
    mockUseInvestigationAssignees.mockClear();

    renderSection({ investigations: [investigation, assigned], total: 2 });

    expect(mockUseInvestigationAssignees).toHaveBeenLastCalledWith([investigation, assigned]);
    expect(screen.getByTestId('assignees-investigation-1')).toHaveTextContent('');
    expect(screen.getByTestId('assignees-investigation-2')).toHaveTextContent('uid-1,uid-2');
  });

  it('does not open the investigation when its assignees are clicked', () => {
    const onInvestigationClick = jest.fn();
    render(
      <I18nProvider>
        <InvestigationSection
          id="critical"
          investigations={[investigation]}
          total={1}
          hasMore={false}
          onShowMore={jest.fn()}
          onRetry={jest.fn()}
          onInvestigationClick={onInvestigationClick}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('assignees-investigation-1'));
    expect(onInvestigationClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Checkout errors'));
    expect(onInvestigationClick).toHaveBeenCalledWith(investigation);
  });

  it('retries a failed section load', () => {
    const onRetry = jest.fn();
    renderSection({ error: new Error('Network unavailable'), onRetry });

    fireEvent.click(screen.getByTestId('nightshiftInvestigationSectionRetry-critical'));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No investigations found')).not.toBeInTheDocument();
  });
});
