/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

jest.mock('@kbn/elastic-assistant-common', () => {
  const actual = jest.requireActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    // `TakeAction` always generates markdown; keep it cheap for unit tests.
    getAttackDiscoveryMarkdown: jest.fn(() => 'markdown'),
  };
});

import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { TakeAction } from '.';

const defaultAgentBuilderAvailability = {
  isAgentBuilderEnabled: true,
  hasAgentBuilderPrivilege: true,
  isAgentChatExperienceEnabled: false,
  hasValidAgentBuilderLicense: true,
};

const mockMutateAsyncBulk = jest.fn().mockResolvedValue({});
const mockMutateAsyncStatus = jest.fn().mockResolvedValue({});
jest.mock('../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn().mockReturnValue(defaultAgentBuilderAvailability),
}));
jest.mock('../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: jest.fn(),
}));

const mockUseAssistantAvailability = useAssistantAvailability as jest.Mock;
const mockUseAgentBuilderAvailability = jest.mocked(useAgentBuilderAvailability);

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: jest.fn(() => ({ mutateAsync: mockMutateAsyncBulk })),
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

jest.mock('./use_update_alerts_status', () => ({
  useUpdateAlertsStatus: jest.fn(() => ({ mutateAsync: mockMutateAsyncStatus })),
}));

jest.mock('../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: (ad: { alertWorkflowStatus?: string }) =>
    ad?.alertWorkflowStatus !== undefined,
}));

/** helper function to open the popover */
const openPopover = () => fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);

const defaultProps = {
  attackDiscoveries: [mockAttackDiscovery],
  setSelectedAttackDiscoveries: jest.fn(),
};

describe('TakeAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentBuilderAvailability.mockReturnValue(defaultAgentBuilderAvailability);
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

  it('renders the Add to chat action disabled when license is invalid', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: false,
    });

    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('viewInAgentBuilder')).toBeDisabled();
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

  it('shows the UpdateAlertsModal when mark as closed is clicked', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };

    render(
      <TestProviders>
        <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
      </TestProviders>
    );

    openPopover();
    fireEvent.click(screen.getByTestId('markAsClosed'));

    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();
  });

  it('calls setSelectedAttackDiscoveries and closes the modal on confirm', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };
    const setSelectedAttackDiscoveries = jest.fn();
    render(
      <TestProviders>
        <TakeAction
          {...defaultProps}
          attackDiscoveries={[alert]}
          setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
        />
      </TestProviders>
    );

    openPopover();
    fireEvent.click(screen.getByTestId('markAsClosed'));
    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('markDiscoveriesOnly'));
    // Wait for setSelectedAttackDiscoveries to be called
    await screen.findByTestId('takeActionPopoverButton');
    expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
  });

  it('closes the modal on cancel', async () => {
    const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };
    render(
      <TestProviders>
        <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
      </TestProviders>
    );

    openPopover();
    fireEvent.click(screen.getByTestId('markAsClosed'));
    expect(await screen.findByTestId('confirmModal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel'));
    // Wait for modal to close
    await screen.findByTestId('takeActionPopoverButton');

    expect(screen.queryByTestId('confirmModal')).toBeNull();
  });

  describe('actions when a single alert is selected', () => {
    const workflowStatuses = [
      {
        status: 'open',
        expected: {
          markAsOpen: false,
          markAsAcknowledged: true,
          markAsClosed: true,
        },
      },
      {
        status: 'acknowledged',
        expected: {
          markAsOpen: true,
          markAsAcknowledged: false,
          markAsClosed: true,
        },
      },
      {
        status: 'closed',
        expected: {
          markAsOpen: true,
          markAsAcknowledged: true,
          markAsClosed: false,
        },
      },
    ];

    it.each(workflowStatuses)(
      'renders correct actions for status $status (single alert selection)',
      ({ status, expected }) => {
        const alert = { ...mockAttackDiscovery, alertWorkflowStatus: status };

        render(
          <TestProviders>
            <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
          </TestProviders>
        );
        openPopover();

        if (expected.markAsOpen) {
          expect(screen.getByTestId('markAsOpen')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('markAsOpen')).toBeNull();
        }

        if (expected.markAsAcknowledged) {
          expect(screen.getByTestId('markAsAcknowledged')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('markAsAcknowledged')).toBeNull();
        }

        if (expected.markAsClosed) {
          expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
        } else {
          expect(screen.queryByTestId('markAsClosed')).toBeNull();
        }
      }
    );
  });

  describe('actions when multiple alerts are selected', () => {
    const alerts = getMockAttackDiscoveryAlerts(); // <-- multiple alerts
    const testCases = [
      {
        testId: 'markAsAcknowledged',
        description: 'renders mark as acknowledged',
      },
      {
        testId: 'markAsClosed',
        description: 'renders mark as closed',
      },
      {
        testId: 'markAsOpen',
        description: 'renders mark as open',
      },
    ];

    beforeEach(() => {
      render(
        <TestProviders>
          <TakeAction attackDiscoveries={alerts} setSelectedAttackDiscoveries={jest.fn()} />
        </TestProviders>
      );

      openPopover();
    });

    it.each(testCases)('$description', ({ testId }) => {
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    });
  });

  describe('when EASE is the configured project', () => {
    let alert: ReturnType<typeof getMockAttackDiscoveryAlerts>[0];
    let setSelectedAttackDiscoveries: jest.Mock;

    beforeEach(() => {
      alert = getMockAttackDiscoveryAlerts()[0];
      setSelectedAttackDiscoveries = jest.fn();
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cases: { helpers: { canUseCases: () => ({ createComment: true, read: true }) } },
        },
      });

      mockUseAssistantAvailability.mockReturnValue({
        hasSearchAILakeConfigurations: true, // EASE IS configured
      });
    });

    it('renders mark as closed action and takes action immediately (no modal)', async () => {
      render(
        <TestProviders>
          <TakeAction
            attackDiscoveries={[alert]}
            setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
          />
        </TestProviders>
      );

      openPopover();
      expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('markAsClosed'));

      // Modal should NOT appear
      expect(screen.queryByTestId('confirmModal')).toBeNull();

      // Wait for async action
      await waitFor(() => {
        expect(mockMutateAsyncBulk).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: [alert.id],
            kibanaAlertWorkflowStatus: 'closed',
          })
        );
      });

      expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
      expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
    });

    it('renders mark as acknowledged action and takes action immediately (no modal)', async () => {
      alert = { ...alert, alertWorkflowStatus: 'open' };
      render(
        <TestProviders>
          <TakeAction
            attackDiscoveries={[alert]}
            setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
          />
        </TestProviders>
      );

      openPopover();
      expect(screen.getByTestId('markAsAcknowledged')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('markAsAcknowledged'));

      expect(screen.queryByTestId('confirmModal')).toBeNull();

      await waitFor(() => {
        expect(mockMutateAsyncBulk).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: [alert.id],
            kibanaAlertWorkflowStatus: 'acknowledged',
          })
        );
      });

      expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
      expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
    });

    it('renders mark as open action and takes action immediately (no modal)', async () => {
      alert = { ...alert, alertWorkflowStatus: 'closed' };
      render(
        <TestProviders>
          <TakeAction
            attackDiscoveries={[alert]}
            setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
          />
        </TestProviders>
      );

      openPopover();
      expect(screen.getByTestId('markAsOpen')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('markAsOpen'));

      expect(screen.queryByTestId('confirmModal')).toBeNull();

      await waitFor(() => {
        expect(mockMutateAsyncBulk).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: [alert.id],
            kibanaAlertWorkflowStatus: 'open',
          })
        );
      });

      expect(mockMutateAsyncStatus).not.toHaveBeenCalled();
      expect(setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
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

  describe('when case permissions are disabled', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          cases: {
            helpers: {
              canUseCases: jest.fn().mockReturnValue({
                all: false,
                connectors: false,
                create: false,
                delete: false,
                push: false,
                read: false,
                settings: false,
                update: false,
                createComment: false,
              }),
            },
            hooks: {
              useCasesAddToExistingCase: jest.fn(),
              useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: jest.fn() }),
              useCasesAddToNewCaseFlyout: jest.fn(),
            },
            ui: {},
          },
          application: {
            capabilities: {
              assistant: {
                show: true,
                save: true,
              },
            },
          },
        },
      });

      const { useAddToNewCase } = jest.requireMock('./use_add_to_case');
      useAddToNewCase.mockReturnValue({
        disabled: true,
        onAddToNewCase: jest.fn(),
      });

      const { useAddToExistingCase } = jest.requireMock('./use_add_to_existing_case');
      useAddToExistingCase.mockReturnValue({
        onAddToExistingCase: jest.fn(),
      });
    });

    it('disables case actions when the user lacks permissions', () => {
      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();

      const addToCaseButton = screen.getByTestId('addToCase');
      const addToExistingCaseButton = screen.getByTestId('addToExistingCase');

      expect(addToCaseButton).toBeDisabled();
      expect(addToExistingCaseButton).toBeDisabled();
    });
  });

  describe('AI Assistant interactions', () => {
    const mockShowAssistantOverlay = jest.fn();

    beforeEach(() => {
      const { useViewInAiAssistant } = jest.requireMock(
        '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
      );
      useViewInAiAssistant.mockReturnValue({
        showAssistantOverlay: mockShowAssistantOverlay,
        disabled: false,
      });
    });

    it('disables view in AI assistant when disabled', () => {
      const { useViewInAiAssistant } = jest.requireMock(
        '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
      );
      useViewInAiAssistant.mockReturnValue({
        showAssistantOverlay: mockShowAssistantOverlay,
        disabled: true,
      });

      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();
      const viewInAiAssistantButton = screen.getByTestId('viewInAiAssistant');

      expect(viewInAiAssistantButton).toBeDisabled();
    });
  });
});
