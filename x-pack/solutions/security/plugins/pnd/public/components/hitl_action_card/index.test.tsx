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
import {
  PND_HITL_CONTAINMENT_PROPOSAL,
  PND_STAGED_ISOLATE_HOST,
  stagedContainmentReasoning,
} from './test_helpers/pnd_recommended_actions';
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

  describe('the recommended-actions branch, for an incident_contained gate with staged actions', () => {
    it('renders the per-action toggle form', () => {
      renderWithPndProviders(
        <HitlActionCard {...defaultProps} proposal={PND_HITL_CONTAINMENT_PROPOSAL} />
      );

      expect(screen.getByTestId('pndRecommendedActionsDecisionForm')).toBeInTheDocument();
    });

    it('takes precedence over the schema branch, which cannot echo the staged actions back', () => {
      renderWithPndProviders(
        <HitlActionCard
          {...defaultProps}
          proposal={{
            ...PND_HITL_CONTAINMENT_PROPOSAL,
            inputSchema: PND_HITL_SCHEMA_PROPOSAL.inputSchema,
          }}
        />
      );

      expect(screen.queryByTestId('pndSchemaForm')).not.toBeInTheDocument();
    });

    it('falls back to the fixed controls when the reasoning lost the label anchor', () => {
      renderWithPndProviders(
        <HitlActionCard
          {...defaultProps}
          proposal={{ ...PND_HITL_CONTAINMENT_PROPOSAL, reasoning: 'The anchor is gone.' }}
        />
      );

      expect(screen.queryByTestId('pndRecommendedActionsDecisionForm')).not.toBeInTheDocument();
    });

    it('renders no toggle form for another gate, whatever its reasoning carries', () => {
      renderWithPndProviders(
        <HitlActionCard
          {...defaultProps}
          proposal={{
            ...PND_HITL_PROPOSAL,
            reasoning: PND_HITL_CONTAINMENT_PROPOSAL.reasoning,
          }}
        />
      );

      expect(screen.queryByTestId('pndRecommendedActionsDecisionForm')).not.toBeInTheDocument();
    });

    it('submits an explicitly empty approved_actions when nothing was toggled on', () => {
      renderWithPndProviders(
        <HitlActionCard {...defaultProps} proposal={PND_HITL_CONTAINMENT_PROPOSAL} />
      );

      answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');
      fireEvent.click(screen.getByTestId('hitlCardApprove'));

      expect(onConfirm).toBeCalledWith({
        approved_actions: [],
        decision: 'approve',
        rationale: 'the host is contained',
      });
    });

    it('submits the full action objects whose toggles are on', () => {
      renderWithPndProviders(
        <HitlActionCard {...defaultProps} proposal={PND_HITL_CONTAINMENT_PROPOSAL} />
      );

      fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));
      answer('approve', 'the host is contained', 'pndFixedDecisionFormControl');
      fireEvent.click(screen.getByTestId('hitlCardApprove'));

      expect(onConfirm).toBeCalledWith({
        approved_actions: [PND_STAGED_ISOLATE_HOST],
        decision: 'approve',
        rationale: 'the host is contained',
      });
    });

    it('submits an empty approved_actions on a dismissal, even after a toggle was on', () => {
      renderWithPndProviders(
        <HitlActionCard {...defaultProps} proposal={PND_HITL_CONTAINMENT_PROPOSAL} />
      );

      fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));
      answer('dismiss', 'a false positive', 'pndFixedDecisionFormControl');
      fireEvent.click(screen.getByTestId('hitlCardApprove'));

      expect(onConfirm).toBeCalledWith({
        approved_actions: [],
        decision: 'dismiss',
        rationale: 'a false positive',
      });
    });

    it('renders the staged-nothing callout when the summary staged an empty array', () => {
      renderWithPndProviders(
        <HitlActionCard
          {...defaultProps}
          proposal={{
            ...PND_HITL_CONTAINMENT_PROPOSAL,
            reasoning: stagedContainmentReasoning([]),
          }}
        />
      );

      expect(screen.getByTestId('pndRecommendedActionsEmpty')).toBeInTheDocument();
    });
  });
});
