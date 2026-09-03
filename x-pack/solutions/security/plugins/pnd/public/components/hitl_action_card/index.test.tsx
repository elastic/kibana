/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import {
  PND_HITL_DISCOVERY_CONTEXT,
  PND_HITL_PROPOSAL,
  PND_HITL_SCHEMA_PROPOSAL,
} from './test_helpers/pnd_hitl_proposal';
import { HitlActionCard } from '.';

const onCancel = jest.fn();
const onConfirm = jest.fn();

const defaultProps = {
  onCancel,
  onConfirm,
  proposal: PND_HITL_PROPOSAL,
};

/** Answers both fields of whichever branch is on screen. */
const answer = (decision: string, rationale: string, testSubjPrefix: string) => {
  fireEvent.change(screen.getByTestId(`${testSubjPrefix}-decision`), {
    target: { value: decision },
  });
  fireEvent.change(screen.getByTestId(`${testSubjPrefix}-rationale`), {
    target: { value: rationale },
  });
};

describe('HitlActionCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the card', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCard')).toBeInTheDocument();
  });

  it('renders the approval-required eyebrow', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCardEyebrow')).toHaveTextContent('Approval required');
  });

  it('renders the gate prompt title when the thread has not materialised', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCardTitle')).toHaveTextContent(PND_HITL_PROPOSAL.title);
  });

  it('prefers the thread conversation title, so the modal names what the row named', () => {
    renderWithPndProviders(
      <HitlActionCard
        {...defaultProps}
        proposal={{ ...PND_HITL_PROPOSAL, threadTitle: 'Credential dumping on host-1' }}
      />
    );

    expect(screen.getByTestId('hitlActionCardTitle')).toHaveTextContent(
      'Credential dumping on host-1'
    );
  });

  it('renders the gate message, so the analyst reads the question being answered', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCardMessage')).toHaveTextContent(
      PND_HITL_PROPOSAL.message
    );
  });

  it('renders the reasoning as the operator note, which is where it moved to from the row', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCardReasoning')).toHaveTextContent(
      PND_HITL_PROPOSAL.reasoning
    );
  });

  it('says so when the gate carries no reasoning, rather than rendering a blank note', () => {
    renderWithPndProviders(
      <HitlActionCard {...defaultProps} proposal={{ ...PND_HITL_PROPOSAL, reasoning: '   ' }} />
    );

    expect(screen.getByTestId('hitlActionCardReasoningMissing')).toBeInTheDocument();
  });

  it('renders the blast radius from the discovery context', () => {
    renderWithPndProviders(
      <HitlActionCard {...defaultProps} discoveryContext={PND_HITL_DISCOVERY_CONTEXT} />
    );

    expect(screen.getAllByTestId('hitlActionCardEntity')).toHaveLength(
      PND_HITL_DISCOVERY_CONTEXT.entities.length
    );
  });

  it('renders a blast radius section even when the proposal has no discovery context', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCardBlastRadiusEmpty')).toBeInTheDocument();
  });

  it('renders the schema form when the gate declares a renderable schema', () => {
    renderWithPndProviders(
      <HitlActionCard {...defaultProps} proposal={PND_HITL_SCHEMA_PROPOSAL} />
    );

    expect(screen.getByTestId('pndSchemaForm')).toBeInTheDocument();
  });

  it('renders no fixed controls when the schema form is rendered', () => {
    renderWithPndProviders(
      <HitlActionCard {...defaultProps} proposal={PND_HITL_SCHEMA_PROPOSAL} />
    );

    expect(screen.queryByTestId('pndFixedDecisionForm')).not.toBeInTheDocument();
  });

  it('falls back to the fixed controls when the gate declares no schema', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionForm')).toBeInTheDocument();
  });

  it('renders no schema form on the fallback branch', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.queryByTestId('pndSchemaForm')).not.toBeInTheDocument();
  });

  it('disables the primary action until the gate is answered', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByTestId('hitlCardApprove')).toBeDisabled();
  });

  it('enables the primary action once the fallback branch is answered', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');

    expect(screen.getByTestId('hitlCardApprove')).toBeEnabled();
  });

  it('sends the answered values to _respond unchanged, from the fallback branch', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(onConfirm).toBeCalledWith({ decision: 'approve', rationale: 'the host is contained' });
  });

  it('sends the answered values to _respond unchanged, from the schema branch', () => {
    renderWithPndProviders(
      <HitlActionCard {...defaultProps} proposal={PND_HITL_SCHEMA_PROPOSAL} />
    );

    answer('dismiss', 'a false positive', 'pndSchemaFormControl');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(onConfirm).toBeCalledWith({ decision: 'dismiss', rationale: 'a false positive' });
  });

  it('does not submit an unanswered gate', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(onConfirm).not.toBeCalled();
  });

  it('labels the primary action Approve when the analyst chose to approve', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');

    expect(screen.getByTestId('hitlCardApprove')).toHaveTextContent('Approve');
  });

  it('labels the primary action Dismiss when the analyst chose to dismiss', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    answer('dismiss', 'a false positive', 'pndFixedDecisionFormControl');

    expect(screen.getByTestId('hitlCardApprove')).toHaveTextContent('Dismiss');
  });

  it('cancels', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hitlCardCancel'));

    expect(onCancel).toBeCalled();
  });

  it('renders a server error in place, so the analyst keeps the text they typed', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} errorMessage="Forbidden" />);

    expect(screen.getByTestId('hitlActionCardError')).toHaveTextContent('Forbidden');
  });

  it('renders no error region when the decision has not failed', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.queryByTestId('hitlActionCardError')).not.toBeInTheDocument();
  });

  it('disables the primary action while the decision is in flight', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} isLoading />);

    answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');

    expect(screen.getByTestId('hitlCardApprove')).toBeDisabled();
  });

  it('names the card for a screen reader', () => {
    renderWithPndProviders(<HitlActionCard {...defaultProps} />);

    expect(screen.getByRole('group')).toHaveAccessibleName(
      `Approval required: ${PND_HITL_PROPOSAL.title}`
    );
  });

  it('renders markup in the gate text as text, never as html', () => {
    renderWithPndProviders(
      <HitlActionCard
        {...defaultProps}
        proposal={{ ...PND_HITL_PROPOSAL, reasoning: '<b>escalated</b>' }}
      />
    );

    expect(screen.getByTestId('hitlActionCardReasoning')).toHaveTextContent('<b>escalated</b>');
  });
});
