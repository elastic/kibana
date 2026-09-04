/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import type { PndProposalRow } from '@kbn/pnd-common';
import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import { readInvestigationId } from '../conversation_queue/helpers/read_investigation_id';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { ConversationCard } from '.';

const investigateProposal: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: 'open_investigation',
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  reasoning: 'Three alerts on host-1 chain to a credential access technique.',
  recommendedAction: 'investigate',
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
  onRequestApproval: jest.fn(),
  onViewLifecycle: jest.fn(),
  proposal: investigateProposal,
};

const card = (): HTMLElement => screen.getByTestId('pndProposalRow');

describe('ConversationCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('leads with the thread conversation title (D9)', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowTitle')).toHaveTextContent('Credential dumping on host-1');
  });

  /**
   * A gate whose thread has not materialised carries no `threadTitle` at all — never a blank one —
   * so the gate prompt title is the whole fallback.
   */
  it('falls back to the gate prompt title when the thread has not materialised', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, threadTitle: undefined }}
      />
    );

    expect(screen.getByTestId('pndRowTitle')).toHaveTextContent(investigateProposal.title);
  });

  it('summarizes the card with the gate prompt message', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowSummary')).toHaveTextContent(investigateProposal.message);
  });

  /** The long reasoning moved to the approval modal and the lifecycle flyout (D9). */
  it('does not render the reasoning on the card', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(card()).not.toHaveTextContent(investigateProposal.reasoning);
  });

  /**
   * The container type tag (`Investigation` / `Sub-investigation` / `Incident`) came off on
   * 2026-08-18. It was also the affordance for reaching the container; that navigation is the
   * overflow menu's "View lifecycle" now, which is asserted below.
   */
  it('renders no container type tag', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByTestId('pndRowContainerBadge')).toBeNull();
  });

  it('renders none of the three container type labels as text either', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(
      ['Investigation', 'Sub-investigation', 'Incident'].some(
        (label) => screen.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('renders the risk score when one was derived', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} riskScore={73} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveTextContent('73');
  });

  /**
   * An absent score and a score of zero must not look the same: zero is a real measurement of the
   * constituent alerts, absent means there was nothing to measure.
   */
  it('renders a risk score of zero, which is a real score', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} riskScore={0} />);

    expect(screen.getByTestId('pndRiskScoreBadge')).toHaveTextContent('0');
  });

  it('renders no risk badge when no score could be derived', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByTestId('pndRiskScoreBadge')).toBeNull();
  });

  /** Annotation 11a: the accordion the card sits in already names the phase. */
  it('renders no phase badge', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByText('Investigate')).toBeNull();
  });

  /** Annotation 11a: the watch filter above the queue already scopes this. */
  it('renders no watch badge', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByText('Forensic Watch')).toBeNull();
  });

  /** Annotation 11a: reversibility survives on the contract, for the modal's tone, not as a badge. */
  it('renders no reversibility badge', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByText('Reversible')).toBeNull();
  });

  it('renders no "not reversible" badge on an irreversible gate either', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{
          ...investigateProposal,
          gateId: 'apply_tuning',
          recommendedAction: 'tune',
          reversible: false,
          workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
        }}
      />
    );

    expect(screen.queryByText('Not reversible')).toBeNull();
  });

  /**
   * The relative timestamp came off on 2026-08-18 with the type tag. When the gate was raised is
   * still on the contract — the Resolved section and the lifecycle both date a gate — it is just not
   * what a card asking for a decision leads with.
   */
  it('renders no relative timestamp', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByTestId('pndRowCreatedAt')).toBeNull();
  });

  it('renders no <time> element at all, so no timestamp can arrive by another route', () => {
    const { container } = renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(container.querySelector('time')).toBeNull();
  });

  it('opens the details flyout when the card is clicked', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(card());

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith(investigateProposal.correlationId);
    expect(defaultProps.onRequestApproval).not.toHaveBeenCalled();
  });

  it('opens the details flyout on Enter', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.keyDown(card(), { key: 'Enter' });

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith(investigateProposal.correlationId);
  });

  it('opens the details flyout on Space', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.keyDown(card(), { key: ' ' });

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith(investigateProposal.correlationId);
  });

  it('ignores keys that are not Enter or Space', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.keyDown(card(), { key: 'a' });

    expect(defaultProps.onViewLifecycle).not.toHaveBeenCalled();
    expect(defaultProps.onRequestApproval).not.toHaveBeenCalled();
  });

  it('names what the pending decision would do', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowPrimaryAction')).toHaveTextContent('Open investigation');
  });

  it('names the card its action belongs to, because every card of a gate carries the same verb', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowPrimaryAction')).toHaveAttribute(
      'aria-label',
      'Open investigation for Credential dumping on host-1'
    );
  });

  /** The action is a way to *read* the decision, not a second way to make it. */
  it('opens the approval modal when the action is clicked', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowPrimaryAction'));

    expect(defaultProps.onRequestApproval).toHaveBeenCalledWith(investigateProposal);
  });

  /** The card's own click handler would otherwise fire the same approval a second time. */
  it('opens the approval modal exactly once when the action is clicked', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowPrimaryAction'));

    expect(defaultProps.onRequestApproval).toHaveBeenCalledTimes(1);
  });

  it('renders no action for a gate outside the registry', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, gateId: 'not_a_gate' }}
      />
    );

    expect(screen.queryByTestId('pndRowPrimaryAction')).toBeNull();
  });

  it('divides the action from the icon actions beside it', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowActionDivider')).toBeInTheDocument();
  });

  /** A divider with nothing on its far side is a rule drawn against the edge of the card. */
  it('renders no divider when the card has no icon actions to divide from', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{
          ...investigateProposal,
          correlationId: '',
          threadConversationId: undefined,
        }}
      />
    );

    expect(screen.queryByTestId('pndRowActionDivider')).toBeNull();
  });

  it('renders no inline Approve, because the modal owns the decision', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('renders no inline Dismiss, because the modal owns the decision', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.queryByText('Dismiss')).toBeNull();
  });

  /**
   * Every card in the queue is a pending gate: answering one moves it to the Resolved section, which
   * draws it as a single line. A queue card that could carry a decision badge beside its bucket badge
   * would be indistinguishable from one still waiting.
   */
  it('renders no decision badge, because a decided gate is not in this list', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, decision: 'approve' }}
      />
    );

    expect(screen.queryByTestId('pndRowDecisionBadge')).toBeNull();
  });

  it('attributes nothing, because nobody has answered a pending gate', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, decision: 'approve', respondedBy: 'elastic' }}
      />
    );

    expect(screen.queryByTestId('pndRowAnsweredBy')).toBeNull();
  });

  it('names the card the chat button opens', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(screen.getByTestId('pndRowOpenInChatButton')).toHaveAttribute(
      'aria-label',
      'Open Credential dumping on host-1 in chat'
    );
  });

  it('opens the thread in the Agent Builder sidebar', () => {
    const openChat = jest.fn();
    renderWithPndProviders(<ConversationCard {...defaultProps} />, {
      services: { agentBuilder: { openChat } },
    });

    fireEvent.click(screen.getByTestId('pndRowOpenInChatButton'));

    expect(openChat).toHaveBeenCalledWith({ conversationId: 'thread-1' });
  });

  it('does not open the approval modal when the chat button is clicked', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowOpenInChatButton'));

    expect(defaultProps.onRequestApproval).not.toHaveBeenCalled();
  });

  /** An id no conversation matches would navigate away from the queue for nothing. */
  it('renders no chat button when the gate has no thread', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, threadConversationId: undefined }}
      />
    );

    expect(screen.queryByTestId('pndRowOpenInChatButton')).toBeNull();
  });

  it('does not open the approval modal when the actions menu is opened', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowActionsMenuButton'));

    expect(defaultProps.onRequestApproval).not.toHaveBeenCalled();
  });

  it('opens the lifecycle from the actions menu', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowActionsMenuButton'));
    fireEvent.click(screen.getByTestId('pndRowViewLifecycle'));

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith('alert-1');
  });

  /**
   * The other half of the 2026-08-18 decision: *"parent flyout navigation moved to the overflow
   * menu"*. The type tag went, and the menu is where reaching the container has to be, so this pins
   * the menu as that affordance rather than leaving it implied by the tag's absence.
   *
   * Asserted against `readInvestigationId` rather than against the literal `'alert-1'` the test
   * above uses, because the claim is *which subject* the menu opens, not which string: an
   * investigation's identity **is** its Attack Discovery alert id (ADR-003), so the row's parent and
   * the id the menu hands over are the same key derived two ways. A future change that gave a
   * container an id of its own would fail here and pass above.
   */
  it('reaches the parent container from the overflow menu', () => {
    const child: PndProposalRow = { ...investigateProposal, gateId: 'incident_contained' };

    renderWithPndProviders(<ConversationCard {...defaultProps} proposal={child} />);

    fireEvent.click(screen.getByTestId('pndRowActionsMenuButton'));
    fireEvent.click(screen.getByTestId('pndRowViewLifecycle'));

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith(readInvestigationId(child));
  });

  /**
   * `open_investigation` parks *before* the container it names exists, so the gate that opens an
   * investigation has no parent to reach — `readInvestigationId` returns `undefined` for it. The menu
   * still opens the discovery's own lifecycle, which is why this is asserted as an inequality: the
   * item is not mislabelled navigation to a parent that is not there.
   */
  it('opens the discovery itself for the gate that has no parent yet', () => {
    expect(readInvestigationId(investigateProposal)).toBeUndefined();

    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRowActionsMenuButton'));
    fireEvent.click(screen.getByTestId('pndRowViewLifecycle'));

    expect(defaultProps.onViewLifecycle).toHaveBeenCalledWith(investigateProposal.correlationId);
  });

  /**
   * An uncorrelated run has no Attack Discovery to open, and "View lifecycle" is the menu's only
   * item — so the trigger would open an empty panel.
   */
  it('renders no actions menu for an uncorrelated run', () => {
    renderWithPndProviders(
      <ConversationCard
        {...defaultProps}
        proposal={{ ...investigateProposal, correlationId: '' }}
      />
    );

    expect(screen.queryByTestId('pndRowActionsMenuButton')).toBeNull();
  });

  it('tags the card with the gate it addresses, so the list is assertable', () => {
    renderWithPndProviders(<ConversationCard {...defaultProps} />);

    expect(card()).toHaveAttribute('data-source-id', investigateProposal.sourceId);
  });
});
