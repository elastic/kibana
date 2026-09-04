/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { PndProposalRow } from '@kbn/pnd-common';
import { SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import { ApprovalModal, type ApprovalModalProps } from './approval_modal';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiProvider>{children}</EuiProvider>
);

const mockProposal: PndProposalRow = {
  alwaysGate: false,
  correlationId: 'alert-1',
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: 'open_investigation',
  inputSchema: {},
  message: 'Open an investigation into the credential-dumping attack on host-1?',
  reasoning: 'This action suppresses qualys-scan on the DMZ scan pool only.',
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

const baseProps: ApprovalModalProps = {
  decision: 'approve',
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  proposal: mockProposal,
  'data-test-subj': 'approvalModal',
};

const renderModal = (props: Partial<ApprovalModalProps> = {}) =>
  render(<ApprovalModal {...baseProps} {...props} />, { wrapper });

const typeRationale = (rationale: string) => {
  fireEvent.change(screen.getByTestId('approvalModal-rationale'), {
    target: { value: rationale },
  });
};

describe('ApprovalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and warningLabel', () => {
    renderModal();
    expect(screen.getAllByText('Open investigation').length).toBeGreaterThan(0);
    expect(screen.getByText(/approval required/i)).toBeInTheDocument();
  });

  it('renders the reasoning the approver needs to decide', () => {
    renderModal();
    expect(
      screen.getByText('This action suppresses qualys-scan on the DMZ scan pool only.')
    ).toBeInTheDocument();
  });

  it('renders the blast radius section label', () => {
    renderModal();
    expect(screen.getByText('Blast radius')).toBeInTheDocument();
  });

  it('renders entity values from discovery context', () => {
    renderModal({
      discoveryContext: {
        correlationId: 'alert-1',
        entities: [{ count: 3, field: 'host.name', value: 'host-1' }],
      },
    });
    expect(screen.getByTestId('hitlActionCardEntity')).toHaveTextContent('host-1');
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
        checked: false,
        id: 'always-allow',
        label: <span>Always allow session revocation in this case</span>,
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
        checked: false,
        id: 'always-allow',
        label: 'Always allow',
        onChange,
      },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not confirm until a rationale is given', () => {
    renderModal();
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm with decision and rationale when the confirm button is clicked', () => {
    renderModal();
    typeRationale('Confirmed on host-1.');
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).toHaveBeenCalledWith({
      decision: 'approve',
      rationale: 'Confirmed on host-1.',
    });
  });

  it('sends dismiss when that is the decision the modal was opened for', () => {
    renderModal({ decision: 'dismiss' });
    typeRationale('Noise.');
    fireEvent.click(screen.getByTestId('approvalModal-confirm'));
    expect(baseProps.onConfirm).toHaveBeenCalledWith({
      decision: 'dismiss',
      rationale: 'Noise.',
    });
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

  it('renders the confirm button with the gate primary action as its label', () => {
    renderModal();
    expect(screen.getByTestId('approvalModal-confirm')).toHaveTextContent('Open investigation');
  });

  it('wires aria-labelledby to the rendered title', () => {
    renderModal();
    const modal = screen.getByRole('dialog');
    const labelId = modal.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const titleEl = document.getElementById(labelId ?? '');
    expect(titleEl).toHaveTextContent('Open investigation');
  });

  // The Forensic Watch's recommended containment rides in `reasoning` as a label-anchored
  // JSON array. @see parseRecommendedActions
  describe('when the reasoning carries recommended actions', () => {
    const isolateHost = {
      action_type: 'isolate_host',
      capability_ref: 'endpoint.isolate',
      execution: 'kibana_api',
      priority: 'immediate',
      rationale: 'The host is beaconing to a known C2 address.',
      targets: { alert_ids: [], hosts: ['WKSTN-RECV01'], ips: [], users: [] },
      title: 'Isolate WKSTN-RECV01',
    };

    const prose = 'The investigation assessed this as a real incident.';

    const withRecommendations = (actions: unknown[]): PndProposalRow => ({
      ...mockProposal,
      reasoning: `${prose} Recommended response actions JSON: ${JSON.stringify(actions)}.`,
    });

    it('renders each recommendation', () => {
      renderModal({ proposal: withRecommendations([isolateHost]) });

      expect(screen.getByTestId('pndRecommendedActionTitle-0')).toHaveTextContent(
        'Isolate WKSTN-RECV01'
      );
    });

    it('keeps the prose the array was anchored into', () => {
      renderModal({ proposal: withRecommendations([isolateHost]) });

      expect(screen.getByTestId('hitlActionCardReasoning')).toHaveTextContent(prose);
    });

    it('does not render the raw JSON array to the analyst', () => {
      renderModal({ proposal: withRecommendations([isolateHost]) });

      expect(screen.getByTestId('hitlActionCardReasoning')).not.toHaveTextContent(
        'Recommended response actions JSON'
      );
    });

    it('renders no recommendations section when the forensics recommended nothing', () => {
      renderModal({ proposal: withRecommendations([]) });

      expect(screen.queryByTestId('pndRecommendedActions')).not.toBeInTheDocument();
    });
  });

  it('renders no recommendations section on a gate whose reasoning carries none', () => {
    renderModal();

    expect(screen.queryByTestId('pndRecommendedActions')).not.toBeInTheDocument();
  });
});
