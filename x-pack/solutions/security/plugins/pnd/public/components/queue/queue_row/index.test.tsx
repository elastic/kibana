/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import type { QueueEvent } from '../types';
import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { QueueRow } from '.';

const event: QueueEvent = {
  actionIcon: 'inspect',
  actionLabel: 'Open an investigation',
  actionTone: 'primary',
  caseId: 'alert-1',
  description: 'Open an investigation into the credential-dumping attack on host-1?',
  gateId: 'open_investigation',
  id: 'source-1',
  recommendedAction: 'investigate',
  reversible: true,
  riskScore: 94,
  threadConversationId: 'thread-1',
  title: 'Credential dumping on host-1',
};

const defaultProps = {
  event,
  onRequestApproval: jest.fn(),
  onSelect: jest.fn(),
  selected: false,
};

const row = (): HTMLElement => screen.getByTestId('pndQueueRow');

describe('QueueRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the headline', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.getByTestId('pndQueueRowTitle')).toHaveTextContent(
      'Credential dumping on host-1'
    );
  });

  it('renders the description', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.getByTestId('pndQueueRowSummary')).toHaveTextContent(event.description);
  });

  it('names the pending action from event.actionLabel, which PND fills from gate.actionLabel', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.getByTestId('pndQueueRowPrimaryAction')).toHaveTextContent(
      'Open an investigation'
    );
  });

  it('renders no inline Approve, because the row proposes and the HITL card decides', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('renders no container type tag', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(
      ['Investigation', 'Sub-investigation', 'Incident', 'Parent · Investigation'].some(
        (label) => screen.queryByText(label) != null
      )
    ).toBe(false);
  });

  it('renders no relative timestamp', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueRowCreatedAt')).toBeNull();
  });

  it('renders no time element at all', () => {
    const { container } = renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(container.querySelector('time')).toBeNull();
  });

  it('renders no thinking affordance while the row awaits input', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueRowThinking')).toBeNull();
  });

  it('does not render the animated dots on a parked row', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(row()).not.toHaveTextContent('···');
  });

  it('names the risk score for a screen reader', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveAttribute(
      'aria-label',
      'Risk score 94'
    );
  });

  it('composes headline, case id and score into the row aria-label', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(row()).toHaveAttribute(
      'aria-label',
      'Credential dumping on host-1, alert-1, risk score 94'
    );
  });

  it('opens the approval path when the row is clicked', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.click(row());

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('opens the approval path on Enter', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.keyDown(row(), { key: 'Enter' });

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('opens the approval path on Space', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.keyDown(row(), { key: ' ' });

    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it('requests approval when the primary action is clicked', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueRowPrimaryAction'));

    expect(defaultProps.onRequestApproval).toHaveBeenCalledWith(event);
  });

  it('does not also select the row when the primary action is clicked', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueRowPrimaryAction'));

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('stops keydown on the primary action so Space cannot activate the row', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    fireEvent.keyDown(screen.getByTestId('pndQueueRowPrimaryAction'), { key: ' ' });

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('renders no primary action when the event has no actionLabel', () => {
    renderWithPndProviders(
      <QueueRow {...defaultProps} event={{ ...event, actionLabel: undefined }} />
    );

    expect(screen.queryByTestId('pndQueueRowPrimaryAction')).toBeNull();
  });

  it('hides the primary action once a decision is recorded', () => {
    renderWithPndProviders(
      <QueueRow {...defaultProps} latestDecision={{ label: 'Investigation opened' }} />
    );

    expect(screen.queryByTestId('pndQueueRowPrimaryAction')).toBeNull();
  });

  it('shows the past-tense result when a decision is recorded', () => {
    renderWithPndProviders(
      <QueueRow {...defaultProps} latestDecision={{ label: 'Investigation opened' }} />
    );

    expect(screen.getByTestId('pndQueueRowResult')).toHaveTextContent('Investigation opened');
  });

  it('marks the row as current when it is selected', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} selected={true} />);

    expect(row()).toHaveAttribute('aria-current', 'true');
  });

  it('renders the risk score of zero, which is a real score', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} event={{ ...event, riskScore: 0 }} />);

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveTextContent('0');
  });

  it('renders no risk badge when no score could be derived', () => {
    renderWithPndProviders(
      <QueueRow {...defaultProps} event={{ ...event, riskScore: undefined }} />
    );

    expect(screen.queryByTestId('pndQueueRiskScoreBadge')).toBeNull();
  });

  it('offers chat when onOpenChat is provided', () => {
    const onOpenChat = jest.fn();

    renderWithPndProviders(<QueueRow {...defaultProps} onOpenChat={onOpenChat} />);

    fireEvent.click(screen.getByTestId('pndQueueRowOpenInChatButton'));

    expect(onOpenChat).toHaveBeenCalledWith(event);
  });

  it('stops keydown on the agent icon so it cannot activate the row', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} onOpenChat={jest.fn()} />);

    fireEvent.keyDown(screen.getByTestId('pndQueueRowOpenInChatButton'), { key: 'Enter' });

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('renders no chat button when onOpenChat is omitted', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueRowOpenInChatButton')).toBeNull();
  });

  it('stops keydown on the overflow trigger so it cannot activate the row', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} onViewLifecycle={jest.fn()} />);

    fireEvent.keyDown(screen.getByTestId('pndQueueRowActionsMenuButton'), { key: 'Enter' });

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('does not select the row when the overflow menu is opened', () => {
    renderWithPndProviders(<QueueRow {...defaultProps} onViewLifecycle={jest.fn()} />);

    fireEvent.click(screen.getByTestId('pndQueueRowActionsMenuButton'));

    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });
});
