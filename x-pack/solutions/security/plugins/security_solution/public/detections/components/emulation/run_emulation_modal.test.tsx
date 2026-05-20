/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunEmulationModal } from './run_emulation_modal';
import type { CommandSuggestion } from './run_emulation_modal';

const APPROVE_BTN = 'emulation-modal-approve-button';
const REJECT_BTN = 'emulation-modal-reject-button';

describe('RunEmulationModal', () => {
  const mockSuggestion: CommandSuggestion = {
    technique_id: 'T1059.001',
    phase_id: 'execution',
    host_id: 'test-host-123',
    command: 'whoami',
    args: ['-v'],
    timeout: '30s',
    rationale: 'Test user enumeration technique',
  };

  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with command details', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Command Approval Required')).toBeInTheDocument();
    expect(screen.getByText(/T1059.001/)).toBeInTheDocument();
    expect(screen.getByText(/execution/)).toBeInTheDocument();
    expect(screen.getByText(/test-host-123/)).toBeInTheDocument();
    expect(screen.getByText(/30s/)).toBeInTheDocument();
    expect(screen.getByText(/Test user enumeration technique/)).toBeInTheDocument();
    expect(screen.getByText(/whoami -v/)).toBeInTheDocument();
  });

  it('calls onReject when Reject button is clicked', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByText('Reject'));
    expect(mockOnReject).toHaveBeenCalledWith('test-request-123');
    expect(mockOnApprove).not.toHaveBeenCalled();
  });

  it('calls onApprove with approve decision when Approve button is clicked', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByText('Approve'));
    expect(mockOnApprove).toHaveBeenCalledWith('test-request-123', {
      decision: 'approve',
    });
    expect(mockOnReject).not.toHaveBeenCalled();
  });

  it('enables modification mode when switch is toggled', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const modifySwitch = screen.getByLabelText('Modify command before executing');
    fireEvent.click(modifySwitch);

    expect(screen.getByDisplayValue('whoami')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-v')).toBeInTheDocument();
    expect(screen.getByText('Approve Modified Command')).toBeInTheDocument();
  });

  it('calls onApprove with modified command when modifications are made', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Enable modification mode
    const modifySwitch = screen.getByLabelText('Modify command before executing');
    fireEvent.click(modifySwitch);

    // Modify command
    const commandInput = screen.getByDisplayValue('whoami');
    fireEvent.change(commandInput, { target: { value: 'pwd' } });

    // Modify args
    const argsInput = screen.getByDisplayValue('-v');
    fireEvent.change(argsInput, { target: { value: '-la' } });

    // Approve
    fireEvent.click(screen.getByText('Approve Modified Command'));

    expect(mockOnApprove).toHaveBeenCalledWith('test-request-123', {
      decision: 'modify',
      modified_command: 'pwd',
      modified_args: ['-la'],
    });
  });

  it('handles commands without arguments', () => {
    const suggestionNoArgs: CommandSuggestion = {
      ...mockSuggestion,
      args: undefined,
    };

    render(
      <RunEmulationModal
        suggestion={suggestionNoArgs}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/^whoami$/)).toBeInTheDocument();
  });

  it('handles commands without timeout', () => {
    const suggestionNoTimeout: CommandSuggestion = {
      ...mockSuggestion,
      timeout: undefined,
    };

    render(
      <RunEmulationModal
        suggestion={suggestionNoTimeout}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.queryByText(/Timeout:/)).not.toBeInTheDocument();
  });

  it('displays agent type when provided', () => {
    const suggestionWithAgentType: CommandSuggestion = {
      ...mockSuggestion,
      agent_type: 'sentinel_one',
    };

    render(
      <RunEmulationModal
        suggestion={suggestionWithAgentType}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText(/Agent Type:/)).toBeInTheDocument();
    expect(screen.getByText(/sentinel_one/)).toBeInTheDocument();
  });

  it('omits agent type row when not provided', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="test-request-123"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.queryByText(/Agent Type:/)).not.toBeInTheDocument();
  });

  // ─── I10: state-reset on suggestion / requestId change ─────────────────

  it('resets modify-mode and inputs when a new suggestion comes in (I10)', () => {
    const { rerender } = render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-A"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Toggle modify mode and edit the command — these are local state.
    fireEvent.click(screen.getByLabelText('Modify command before executing'));
    fireEvent.change(screen.getByDisplayValue('whoami'), { target: { value: 'pwd' } });
    fireEvent.change(screen.getByDisplayValue('-v'), { target: { value: '-la' } });

    // Now swap in a fresh suggestion — the modal must reset, otherwise the
    // user's previous edits would silently apply to the new approval.
    const nextSuggestion: CommandSuggestion = {
      ...mockSuggestion,
      command: 'ls',
      args: ['-h'],
      technique_id: 'T1057',
    };
    rerender(
      <RunEmulationModal
        suggestion={nextSuggestion}
        requestId="req-B"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    // Modify-mode is off again and the displayed command reflects the new
    // suggestion, not the prior edits.
    expect(screen.queryByDisplayValue('pwd')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('-la')).not.toBeInTheDocument();
    expect(screen.getByText(/ls -h/)).toBeInTheDocument();
  });

  // ─── I11: in-flight submission guard ───────────────────────────────────

  it('disables both buttons after Approve to prevent double-submission (I11)', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-once"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const approveBtn = screen.getByTestId(APPROVE_BTN);
    fireEvent.click(approveBtn);
    // The second click must be a no-op (only one onApprove call).
    fireEvent.click(approveBtn);

    expect(mockOnApprove).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(APPROVE_BTN)).toBeDisabled();
    expect(screen.getByTestId(REJECT_BTN)).toBeDisabled();
  });

  it('disables both buttons after Reject to prevent double-submission (I11)', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-once"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    const rejectBtn = screen.getByTestId(REJECT_BTN);
    fireEvent.click(rejectBtn);
    fireEvent.click(rejectBtn);

    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(APPROVE_BTN)).toBeDisabled();
    expect(screen.getByTestId(REJECT_BTN)).toBeDisabled();
  });

  // ─── I12: argv tokenization preserves quoted segments ──────────────────

  it('parses modified args with quoted strings as a single argv element (I12)', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-quote"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByLabelText('Modify command before executing'));
    fireEvent.change(screen.getByDisplayValue('whoami'), { target: { value: 'echo' } });
    // Quoted "hello world" must remain a single argv element — the legacy
    // .split(' ') would have produced `['--message="hello`, `world"']`.
    fireEvent.change(screen.getByDisplayValue('-v'), {
      target: { value: '--message="hello world" --flag' },
    });

    fireEvent.click(screen.getByTestId(APPROVE_BTN));

    expect(mockOnApprove).toHaveBeenCalledWith('req-quote', {
      decision: 'modify',
      modified_command: 'echo',
      modified_args: ['--message=hello world', '--flag'],
    });
  });

  it('parses modified args with backslash-escaped spaces (I12)', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-escape"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByLabelText('Modify command before executing'));
    fireEvent.change(screen.getByDisplayValue('whoami'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByDisplayValue('-v'), {
      target: { value: '/Library/Application\\ Support/foo.txt' },
    });

    fireEvent.click(screen.getByTestId(APPROVE_BTN));

    expect(mockOnApprove).toHaveBeenCalledWith('req-escape', {
      decision: 'modify',
      modified_command: 'cat',
      modified_args: ['/Library/Application Support/foo.txt'],
    });
  });

  it('omits modified_args when the modified args field is whitespace-only (I12)', () => {
    render(
      <RunEmulationModal
        suggestion={mockSuggestion}
        requestId="req-empty-args"
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    fireEvent.click(screen.getByLabelText('Modify command before executing'));
    fireEvent.change(screen.getByDisplayValue('whoami'), { target: { value: 'date' } });
    fireEvent.change(screen.getByDisplayValue('-v'), { target: { value: '   ' } });

    fireEvent.click(screen.getByTestId(APPROVE_BTN));

    expect(mockOnApprove).toHaveBeenCalledWith('req-empty-args', {
      decision: 'modify',
      modified_command: 'date',
      modified_args: undefined,
    });
  });
});
