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
});
