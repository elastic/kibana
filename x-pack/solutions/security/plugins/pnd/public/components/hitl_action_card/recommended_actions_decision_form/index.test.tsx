/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import {
  PND_STAGED_ACTIONS,
  PND_STAGED_ANALYZE_EXFIL,
  PND_STAGED_ISOLATE_HOST,
  PND_STAGED_REVOKE_USER,
} from '../test_helpers/pnd_recommended_actions';
import { RecommendedActionsDecisionForm } from '.';

const onChange = jest.fn();

const defaultProps = {
  actions: PND_STAGED_ACTIONS,
  onChange,
  values: { approved_actions: [] },
};

describe('RecommendedActionsDecisionForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders one row per staged action', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getAllByTestId(/^pndRecommendedActionRow-/)).toHaveLength(
      PND_STAGED_ACTIONS.length
    );
  });

  it('renders a toggle for a Kibana-executable action', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionToggle-0')).toBeInTheDocument();
  });

  it('starts every toggle off, so nothing executes without an explicit choice', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionToggle-0')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('renders no toggle for a manual action', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.queryByTestId('pndRecommendedActionToggle-2')).not.toBeInTheDocument();
  });

  it('marks a manual action as executed outside Kibana', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionManual-2')).toHaveTextContent(
      'Manual — analyst executes outside Kibana'
    );
  });

  it('marks analyze_exfiltration_ips as a read-only agent hunt, so the toggle cannot read as a response action', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionAgentHunt-1')).toHaveTextContent(
      'Read-only agent hunt — findings post to the incident chat'
    );
  });

  it('gives the agent-hunt action a toggle, because approving it runs the hunt', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionToggle-1')).toBeInTheDocument();
  });

  it('renders the action title', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionRow-0')).toHaveTextContent('Isolate host-1');
  });

  it('renders the action type badge', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionType-0')).toHaveTextContent('isolate_host');
  });

  it('renders the priority badge', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionPriority-0')).toHaveTextContent('Immediate');
  });

  it('renders the targets summary line', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionTargets-0')).toHaveTextContent(
      'Hosts: host-1 · 1 alert'
    );
  });

  it('renders the action rationale', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndRecommendedActionRationale-0')).toHaveTextContent(
      PND_STAGED_ISOLATE_HOST.rationale
    );
  });

  it('reports the full action object when a toggle is switched on', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));

    expect(onChange).toBeCalledWith({ approved_actions: [PND_STAGED_ISOLATE_HOST] });
  });

  it('keeps the approved actions in staged order, whatever order they were toggled in', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [PND_STAGED_ANALYZE_EXFIL] }}
      />
    );

    fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));

    expect(onChange).toBeCalledWith({
      approved_actions: [PND_STAGED_ISOLATE_HOST, PND_STAGED_ANALYZE_EXFIL],
    });
  });

  it('removes the action when its toggle is switched back off', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [PND_STAGED_ISOLATE_HOST] }}
      />
    );

    fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));

    expect(onChange).toBeCalledWith({ approved_actions: [] });
  });

  it('preserves the decision fields when a toggle changes', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [], decision: 'approve', rationale: 'contained' }}
      />
    );

    fireEvent.click(screen.getByTestId('pndRecommendedActionToggle-0'));

    expect(onChange).toBeCalledWith({
      approved_actions: [PND_STAGED_ISOLATE_HOST],
      decision: 'approve',
      rationale: 'contained',
    });
  });

  it('disables every toggle when the analyst is dismissing', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [], decision: 'dismiss' }}
      />
    );

    expect(screen.getByTestId('pndRecommendedActionToggle-0')).toBeDisabled();
  });

  it('empties the approved actions when the decision changes to dismiss', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [PND_STAGED_ISOLATE_HOST] }}
      />
    );

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-decision'), {
      target: { value: 'dismiss' },
    });

    expect(onChange).toBeCalledWith({ approved_actions: [], decision: 'dismiss' });
  });

  it('keeps the approved actions when the decision changes to approve', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        values={{ approved_actions: [PND_STAGED_ISOLATE_HOST] }}
      />
    );

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-decision'), {
      target: { value: 'approve' },
    });

    expect(onChange).toBeCalledWith({
      approved_actions: [PND_STAGED_ISOLATE_HOST],
      decision: 'approve',
    });
  });

  it('renders the fixed decision control, so both branches answer under the same key', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-decision')).toBeInTheDocument();
  });

  it('renders the fixed rationale control', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} />);

    expect(screen.getByTestId('pndFixedDecisionFormControl-rationale')).toBeInTheDocument();
  });

  it('renders a validation message in place', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        errors={{ rationale: 'This field is required' }}
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('disables the toggles while a decision is in flight', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} disabled />);

    expect(screen.getByTestId('pndRecommendedActionToggle-0')).toBeDisabled();
  });

  it('says so when nothing was staged, rather than rendering an empty list', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} actions={[]} />);

    expect(screen.getByTestId('pndRecommendedActionsEmpty')).toHaveTextContent(
      'No containment actions were staged'
    );
  });

  it('renders no action list when nothing was staged', () => {
    renderWithPndProviders(<RecommendedActionsDecisionForm {...defaultProps} actions={[]} />);

    expect(screen.queryByTestId('pndRecommendedActionsList')).not.toBeInTheDocument();
  });

  it('renders markup in an action title as text, never as html', () => {
    renderWithPndProviders(
      <RecommendedActionsDecisionForm
        {...defaultProps}
        actions={[{ ...PND_STAGED_REVOKE_USER, title: '<b>revoke</b>' }]}
      />
    );

    expect(screen.getByTestId('pndRecommendedActionTitle-0')).toHaveTextContent('<b>revoke</b>');
  });
});
