/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { Investigation } from '@kbn/pnd-common';
import { ApprovalModal, type ApprovalModalProps } from './approval_modal';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

const mockInvestigation: Investigation = {
  id: 'inv-1',
  title: 'test proposal',
  template_id: 'investigation',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  watch_id: 'watch-1',
  watch_execution_id: 'exec-1',
  pendingProposalCount: 0,
  events: [],
  primaryActionLabel: 'Apply monitored exception',
  summary: 'This action suppresses qualys-scan on the DMZ scan pool only.',
  recommendedAction: 'investigate',
};

const baseProps: ApprovalModalProps = {
  selectedRecommendedActionConversation: mockInvestigation,
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

  it('renders the description from the investigation summary', () => {
    renderModal();
    expect(
      screen.getByText('This action suppresses qualys-scan on the DMZ scan pool only.')
    ).toBeInTheDocument();
  });

  it('renders the blast radius section label', () => {
    renderModal();
    expect(screen.getByText('Blast radius')).toBeInTheDocument();
  });

  it('always renders the actor row', () => {
    renderModal();
    expect(screen.getByText('You')).toBeInTheDocument();
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

  it('renders the cancel label', () => {
    renderModal();
    expect(screen.getByTestId('approvalModal-cancel')).toHaveTextContent('Cancel');
  });

  it('renders the confirm button with the investigation primaryActionLabel as its label', () => {
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
