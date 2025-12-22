/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { TakeAction } from '.';

import { useUpdateWorkflowStatusAction } from '../../../../detections/hooks/attacks/actions/use_update_status_action';

jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn().mockReturnValue({
    isAgentBuilderEnabled: false,
    hasAgentBuilderPrivilege: true,
    isAgentChatExperienceEnabled: false,
  }),
}));

jest.mock('../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(),
}));

jest.mock('../../../../detections/hooks/attacks/actions/use_update_status_action', () => ({
  useUpdateWorkflowStatusAction: jest.fn(),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./use_add_to_case', () => ({
  useAddToNewCase: jest.fn(() => ({ disabled: false, onAddToNewCase: jest.fn() })),
}));

jest.mock('./use_add_to_existing_case', () => ({
  useAddToExistingCase: jest.fn(() => ({ onAddToExistingCase: jest.fn() })),
}));

jest.mock('../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant', () => ({
  useViewInAiAssistant: jest.fn(() => ({ showAssistantOverlay: jest.fn(), disabled: false })),
}));

jest.mock('../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: (ad: { alertWorkflowStatus?: string }) =>
    ad?.alertWorkflowStatus !== undefined,
}));

const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;

const mockUseUpdateWorkflowStatusAction = useUpdateWorkflowStatusAction as jest.Mock;

/** helper function to open the popover */
const openPopover = () => fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);

const defaultProps = {
  attackDiscoveries: [mockAttackDiscovery],
  setSelectedAttackDiscoveries: jest.fn(),
};

describe('TakeAction', () => {
  const mockMarkAsOpen = jest.fn();
  const mockMarkAsAcknowledged = jest.fn();
  const mockMarkAsClosed = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: {
            assistant: {
              show: true,
              save: true,
            },
          },
        },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              all: true,
              connectors: true,
              create: true,
              delete: true,
              push: true,
              read: true,
              settings: true,
              update: true,
              createComment: true,
            }),
          },
          hooks: {
            useCasesAddToExistingCase: jest.fn(),
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: jest.fn() }),
            useCasesAddToNewCaseFlyout: jest.fn(),
          },
          ui: {},
        },
      },
    });

    mockUseAssistantAvailability.mockReturnValue({
      hasSearchAILakeConfigurations: false, // EASE is not configured
    });

    // hook returns only actionItems
    mockUseUpdateWorkflowStatusAction.mockReturnValue({
      actionItems: [
        { title: 'markAsOpen', onClick: mockMarkAsOpen },
        { title: 'markAsAcknowledged', onClick: mockMarkAsAcknowledged },
        { title: 'markAsClosed', onClick: mockMarkAsClosed },
      ],
    });
  });

  it('renders the Add to new case action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('addToCase')).toBeInTheDocument();
  });

  it('renders the Add to existing case action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('addToExistingCase')).toBeInTheDocument();
  });

  it('renders the View in AI Assistant action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('viewInAiAssistant')).toBeInTheDocument();
  });

  it('does NOT render View in AI Assistant when multiple discoveries are selected', () => {
    render(
      <TestProviders>
        <TakeAction
          {...defaultProps}
          attackDiscoveries={[mockAttackDiscovery, mockAttackDiscovery]}
        />
      </TestProviders>
    );

    openPopover();

    expect(screen.queryByTestId('viewInAiAssistant')).toBeNull();
  });

  it('renders workflow status actions from useUpdateWorkflowStatusAction', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('markAsOpen')).toBeInTheDocument();
    expect(screen.getByTestId('markAsAcknowledged')).toBeInTheDocument();
    expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
  });

  it('invokes workflow action onClick and clears selection on click', async () => {
    const setSelectedAttackDiscoveries = jest.fn();
    const refetchFindAttackDiscoveries = jest.fn();

    render(
      <TestProviders>
        <TakeAction
          {...defaultProps}
          setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
          refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
        />
      </TestProviders>
    );

    openPopover();
    fireEvent.click(screen.getByTestId('markAsClosed'));

    await waitFor(() => {
      expect(mockMarkAsClosed).toHaveBeenCalled();
    });

    expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
    expect(refetchFindAttackDiscoveries).toHaveBeenCalled();
  });

  describe('actions when multiple alerts are selected', () => {
    const alerts = getMockAttackDiscoveryAlerts();

    beforeEach(() => {
      render(
        <TestProviders>
          <TakeAction attackDiscoveries={alerts} setSelectedAttackDiscoveries={jest.fn()} />
        </TestProviders>
      );
      openPopover();
    });

    it('renders workflow actions returned by the hook', () => {
      expect(screen.getByTestId('markAsOpen')).toBeInTheDocument();
      expect(screen.getByTestId('markAsAcknowledged')).toBeInTheDocument();
      expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
    });
  });

  describe('case interactions', () => {
    const mockOnAddToNewCase = jest.fn();
    const mockOnAddToExistingCase = jest.fn();

    beforeEach(() => {
      const { useAddToNewCase } = jest.requireMock('./use_add_to_case');
      const { useAddToExistingCase } = jest.requireMock('./use_add_to_existing_case');

      useAddToNewCase.mockReturnValue({
        disabled: false,
        onAddToNewCase: mockOnAddToNewCase,
      });

      useAddToExistingCase.mockReturnValue({
        onAddToExistingCase: mockOnAddToExistingCase,
      });
    });

    it('calls onAddToNewCase when clicking add to new case', async () => {
      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();
      fireEvent.click(screen.getByTestId('addToCase'));

      await waitFor(() => {
        expect(mockOnAddToNewCase).toHaveBeenCalledWith({
          alertIds: expect.any(Array),
          markdownComments: expect.any(Array),
          replacements: undefined,
        });
      });
    });

    it('calls onAddToExistingCase when clicking add to existing case', () => {
      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();
      fireEvent.click(screen.getByTestId('addToExistingCase'));

      expect(mockOnAddToExistingCase).toHaveBeenCalledWith({
        alertIds: expect.any(Array),
        markdownComments: expect.any(Array),
        replacements: undefined,
      });
    });
  });
});
