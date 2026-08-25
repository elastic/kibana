/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ApprovalModal } from './approval_modal';
import type { ApprovalModalProps } from './types';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

const baseProps: ApprovalModalProps = {
  iconType: 'gear',
  title: 'Apply monitored exception',
  blastRadius: {
    variant: 'description',
    description: 'This action suppresses qualys-scan on the DMZ scan pool only.',
  },
  onConfirm: jest.fn(),
  onClose: jest.fn(),
  'data-test-subj': 'approvalModal',
};

const renderModal = (props: Partial<ApprovalModalProps> = {}) =>
  render(<ApprovalModal {...baseProps} {...props} />, { wrapper });

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and warningLabel', () => {
    renderModal();
    expect(screen.getAllByText('Apply monitored exception').length).toBeGreaterThan(0);
    expect(screen.getByText(/approval required/i)).toBeInTheDocument();
  });

  it('renders a custom warningLabel when supplied', () => {
    renderModal({ warningLabel: 'Custom label' });
    expect(screen.getAllByText('Custom label').length).toBeGreaterThan(0);
  });

  it('renders the description variant', () => {
    renderModal();
    expect(
      screen.getByText('This action suppresses qualys-scan on the DMZ scan pool only.')
    ).toBeInTheDocument();
  });

  it('renders the list variant with item text', () => {
    renderModal({
      blastRadius: {
        variant: 'list',
        items: [
          {
            id: 'item-1',
            iconType: 'user',
            text: <span>Kills 3 active sessions</span>,
          },
          {
            id: 'item-2',
            iconType: 'check',
            text: <strong>Reversible</strong>,
            status: { label: 'safe', color: 'success' },
          },
        ],
      },
    });
    expect(screen.getByText('Kills 3 active sessions')).toBeInTheDocument();
    expect(screen.getByText('Reversible')).toBeInTheDocument();
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders the blast radius section label', () => {
    renderModal();
    expect(screen.getByText('Blast radius')).toBeInTheDocument();
  });

  it('does not render the actor row when actor is omitted', () => {
    renderModal();
    expect(screen.queryByText('Senior Analyst')).not.toBeInTheDocument();
  });

  it('renders the actor row when actor is supplied', () => {
    renderModal({
      actor: {
        name: 'You',
        detail: 'Senior Analyst · identity actions permitted',
      },
    });
    expect(screen.getByText('You')).toBeInTheDocument();
    // detail is a sibling text node to <strong>, so match as substring
    expect(screen.getByText(/Senior Analyst/)).toBeInTheDocument();
  });

  it('does not render always-allow checkbox when alwaysAllow is omitted', () => {
    renderModal();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders always-allow checkbox when alwaysAllow is supplied', () => {
    const onChange = jest.fn();
    renderModal({
      alwaysAllow: {
        id: 'always-allow',
        label: <span>Always allow session revocation in this case</span>,
        checked: false,
        onChange,
      },
    });
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Always allow session revocation in this case')).toBeInTheDocument();
  });

  it('calls onChange when always-allow checkbox is toggled', () => {
    const onChange = jest.fn();
    renderModal({
      alwaysAllow: {
        id: 'always-allow',
        label: 'Always allow',
        checked: false,
        onChange,
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-cancel'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a custom cancel label', () => {
    renderModal({ cancelLabel: 'No thanks' });
    expect(screen.getByTestId('approvalModal-cancel')).toHaveTextContent('No thanks');
  });

  it('renders the default cancel label when cancelLabel is omitted', () => {
    renderModal();
    expect(screen.getByTestId('approvalModal-cancel')).toHaveTextContent('Cancel');
  });

  it('renders the confirm button with the modal title as its label', () => {
    renderModal();
    expect(screen.getByTestId('approvalModal-confirm')).toHaveTextContent(
      'Apply monitored exception'
    );
  });

  it('wires aria-labelledby to the rendered title', () => {
    renderModal();
    const modal = screen.getByRole('dialog');
    const labelId = modal.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId!);
    expect(titleEl).toHaveTextContent('Apply monitored exception');
  });
});
