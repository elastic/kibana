/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';

import { renderWithPndProviders } from '../../test_utils/render_with_pnd_providers';
import { PND_HITL_PROPOSAL } from '../test_helpers/pnd_hitl_proposal';
import { HitlActionModal } from '.';

const onCancel = jest.fn();
const onConfirm = jest.fn();

const defaultProps = {
  onCancel,
  onConfirm,
  proposal: PND_HITL_PROPOSAL,
};

describe('HitlActionModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a dialog', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the approval card inside it', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    expect(screen.getByTestId('hitlActionCard')).toBeInTheDocument();
  });

  it('names the dialog with the card title, since the card owns its own chrome', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toHaveAccessibleName(PND_HITL_PROPOSAL.title);
  });

  it('cancels when the analyst dismisses the dialog', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onCancel).toBeCalled();
  });

  it('cancels from the card footer', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hitlCardCancel'));

    expect(onCancel).toBeCalled();
  });

  it('hands the answered values up unchanged', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} />);

    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-decision'), {
      target: { value: 'approve' },
    });
    fireEvent.change(screen.getByTestId('pndFixedDecisionFormControl-rationale'), {
      target: { value: 'the host is contained' },
    });
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(onConfirm).toBeCalledWith({ decision: 'approve', rationale: 'the host is contained' });
  });

  it('renders a server error in place', () => {
    renderWithPndProviders(<HitlActionModal {...defaultProps} errorMessage="Conflict" />);

    expect(screen.getByTestId('hitlActionCardError')).toHaveTextContent('Conflict');
  });
});
