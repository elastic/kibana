/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen } from '@testing-library/react';
import type { PndProposalRow } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import React from 'react';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import { RESOLVED_PREVIEW_COUNT, ResolvedSection } from '.';

const answeredProposal: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  decision: 'approve',
  gateId: 'open_investigation',
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  rationale: 'Confirmed lateral movement from the same account.',
  reasoning: 'Three alerts on host-1 chain to a credential access technique.',
  recommendedAction: 'investigate',
  respondedAt: '2026-08-03T13:00:00.000Z',
  respondedBy: 'sarah',
  reversible: true,
  sourceId: 'system-security-watch-deep:run-1:step-exec-1',
  stepExecutionId: 'step-exec-1',
  stepId: 'await_open_investigation',
  threadConversationId: 'thread-1',
  threadTitle: 'Credential dumping on host-1',
  title: 'Open an investigation into the credential-dumping attack on host-1?',
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: 'run-1',
};

/** `count` distinct answered gates, so a row per proposal is countable. */
const answeredRows = (count: number): PndProposalRow[] =>
  Array.from({ length: count }, (_, index) => ({
    ...answeredProposal,
    sourceId: `system-security-watch-deep:run-1:step-exec-${index}`,
    threadTitle: `Resolved gate ${index}`,
  }));

const defaultProps = {
  onViewLifecycle: jest.fn(),
  rows: answeredRows(3),
};

describe('ResolvedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the section', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} />);

    expect(screen.getByTestId('pndBriefResolvedSection')).toBeInTheDocument();
  });

  it('counts everything the queue has answered', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} />);

    expect(screen.getByTestId('pndBriefResolvedCount')).toHaveTextContent('3');
  });

  it('draws a row per answered gate', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} />);

    expect(screen.getAllByTestId('pndResolvedRow')).toHaveLength(3);
  });

  it('is expanded on arrival, so the record is readable without a click', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} />);

    expect(screen.getByTestId('pndBriefResolvedToggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('is absent when nothing has been answered, rather than an empty section', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} rows={[]} />);

    expect(screen.queryByTestId('pndBriefResolvedSection')).not.toBeInTheDocument();
  });

  it('opens the lifecycle for the discovery the clicked row was correlated to', () => {
    renderWithPndProviders(<ResolvedSection {...defaultProps} />);

    fireEvent.click(screen.getAllByTestId('pndResolvedRow')[0]);

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith('alert-1');
  });

  describe('the preview', () => {
    it('caps the rows it draws, so the record cannot push the queue off the page', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT + 5)} />
      );

      expect(screen.getAllByTestId('pndResolvedRow')).toHaveLength(RESOLVED_PREVIEW_COUNT);
    });

    it('still counts everything, not just what it drew', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT + 5)} />
      );

      expect(screen.getByTestId('pndBriefResolvedCount')).toHaveTextContent(
        `${RESOLVED_PREVIEW_COUNT + 5}`
      );
    });

    it('names how many rows are left, so the count is known before the click', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT + 5)} />
      );

      expect(screen.getByTestId('pndBriefResolvedShowMore')).toHaveTextContent('Show more (5)');
    });

    it('asks for nothing more when the whole record already fits', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT)} />
      );

      expect(screen.queryByTestId('pndBriefResolvedShowMore')).not.toBeInTheDocument();
    });

    it('reveals another page of rows when asked for more', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT * 2)} />
      );

      fireEvent.click(screen.getByTestId('pndBriefResolvedShowMore'));

      expect(screen.getAllByTestId('pndResolvedRow')).toHaveLength(RESOLVED_PREVIEW_COUNT * 2);
    });

    it('stops asking once the last row is drawn', () => {
      renderWithPndProviders(
        <ResolvedSection {...defaultProps} rows={answeredRows(RESOLVED_PREVIEW_COUNT + 5)} />
      );

      fireEvent.click(screen.getByTestId('pndBriefResolvedShowMore'));

      expect(screen.queryByTestId('pndBriefResolvedShowMore')).not.toBeInTheDocument();
    });
  });
});
