/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { PndProposalRow } from '@kbn/pnd-common';
import { PND_AUTO_RESPOND_RATIONALE_PREFIX, SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../../components/test_utils/render_with_pnd_providers';
import { ResolvedRow } from '.';

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

const defaultProps = {
  onViewLifecycle: jest.fn(),
  proposal: answeredProposal,
};

const row = (): HTMLElement => screen.getByTestId('pndResolvedRow');

describe('ResolvedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leads with the thread conversation title', () => {
    renderWithPndProviders(<ResolvedRow {...defaultProps} />);

    expect(screen.getByTestId('pndResolvedRowTitle')).toHaveTextContent(
      'Credential dumping on host-1'
    );
  });

  it('falls back to the gate prompt when the thread never materialised', () => {
    renderWithPndProviders(
      <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, threadTitle: undefined }} />
    );

    expect(screen.getByTestId('pndResolvedRowTitle')).toHaveTextContent(
      'Open an investigation into the credential-dumping attack on host-1?'
    );
  });

  it('renders the rationale as the row note', () => {
    renderWithPndProviders(<ResolvedRow {...defaultProps} />);

    expect(screen.getByTestId('pndResolvedRowNote')).toHaveTextContent(
      'Confirmed lateral movement from the same account.'
    );
  });

  it('renders no note at all when the rationale is blank rather than an empty one', () => {
    renderWithPndProviders(
      <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, rationale: '   ' }} />
    );

    expect(screen.queryByTestId('pndResolvedRowNote')).not.toBeInTheDocument();
  });

  it('stamps the machine-readable answer time', () => {
    renderWithPndProviders(<ResolvedRow {...defaultProps} />);

    expect(screen.getByTestId('pndResolvedRowRespondedAt')).toHaveAttribute(
      'dateTime',
      '2026-08-03T13:00:00.000Z'
    );
  });

  it('renders no time when nothing stamped one, rather than an invalid date', () => {
    renderWithPndProviders(
      <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, respondedAt: undefined }} />
    );

    expect(screen.queryByTestId('pndResolvedRowRespondedAt')).not.toBeInTheDocument();
  });

  describe('the outcome', () => {
    it('names the decision and who answered it', () => {
      renderWithPndProviders(<ResolvedRow {...defaultProps} />);

      expect(screen.getByTestId('pndResolvedRowOutcome')).toHaveTextContent('Approved · by sarah');
    });

    it('says dismissed on a dismissal, matching the queue’s own decision badge', () => {
      renderWithPndProviders(
        <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, decision: 'dismiss' }} />
      );

      expect(screen.getByTestId('pndResolvedRowOutcome')).toHaveTextContent('Dismissed');
    });

    /**
     * D12 — `_auto_respond` resumes a gate through the same call a person's approval uses and stamps
     * the acting user, so a row read by `respondedBy` alone would render as somebody's decision.
     */
    it('attributes a machine auto-respond to autonomy rather than to the user it stamped', () => {
      renderWithPndProviders(
        <ResolvedRow
          {...defaultProps}
          proposal={{
            ...answeredProposal,
            rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (auto)`,
          }}
        />
      );

      expect(screen.getByTestId('pndResolvedRowOutcome')).toHaveTextContent(
        'automatically by AlertZero autonomy'
      );
      expect(
        screen.getByTestId('pndResolvedRow').querySelector('[data-answered-by]')
      ).toHaveAttribute('data-answered-by', 'autonomy_auto');
    });

    it('attributes a dial auto-respond to the dial origin rather than to the user it stamped', () => {
      renderWithPndProviders(
        <ResolvedRow
          {...defaultProps}
          proposal={{
            ...answeredProposal,
            rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (dial)`,
          }}
        />
      );

      expect(screen.getByTestId('pndResolvedRowOutcome')).toHaveTextContent(
        'automatically after the autonomy level was raised'
      );
      expect(
        screen.getByTestId('pndResolvedRow').querySelector('[data-answered-by]')
      ).toHaveAttribute('data-answered-by', 'autonomy_dial');
    });

    it('marks a gate nothing stamped a principal on as unrecorded', () => {
      renderWithPndProviders(
        <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, respondedBy: undefined }} />
      );

      expect(
        screen.getByTestId('pndResolvedRow').querySelector('[data-answered-by]')
      ).toHaveAttribute('data-answered-by', 'unrecorded');
    });

    it('treats a blank actor as none at all, so it can never render as accountable', () => {
      renderWithPndProviders(
        <ResolvedRow {...defaultProps} proposal={{ ...answeredProposal, respondedBy: '  ' }} />
      );

      expect(
        screen.getByTestId('pndResolvedRow').querySelector('[data-answered-by]')
      ).toHaveAttribute('data-answered-by', 'unrecorded');
    });
  });

  describe('opening the lifecycle', () => {
    it('opens the lifecycle for the row’s discovery when clicked', () => {
      renderWithPndProviders(<ResolvedRow {...defaultProps} />);

      fireEvent.click(row());

      expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith('alert-1');
    });

    it('opens the lifecycle from the keyboard', () => {
      renderWithPndProviders(<ResolvedRow {...defaultProps} />);

      fireEvent.keyDown(row(), { key: 'Enter' });

      expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith('alert-1');
    });

    it('is a button, so the keyboard reaches it', () => {
      renderWithPndProviders(<ResolvedRow {...defaultProps} />);

      expect(row()).toHaveAttribute('role', 'button');
      expect(row()).toHaveAttribute('tabIndex', '0');
    });

    describe('a gate with no correlated discovery', () => {
      const uncorrelated = { ...answeredProposal, correlationId: '' };

      it('is not a button at all, rather than one that does nothing', () => {
        renderWithPndProviders(<ResolvedRow {...defaultProps} proposal={uncorrelated} />);

        expect(row()).not.toHaveAttribute('role', 'button');
        expect(row()).not.toHaveAttribute('tabIndex');
      });

      it('does not open a lifecycle for the empty id when clicked', () => {
        renderWithPndProviders(<ResolvedRow {...defaultProps} proposal={uncorrelated} />);

        fireEvent.click(row());

        expect(defaultProps.onViewLifecycle).not.toHaveBeenCalled();
      });
    });
  });
});
