/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@kbn/elastic-assistant-common', async () => {
  const actual = await vi.importActual('@kbn/elastic-assistant-common');
  return {
    ...actual,
    // `TakeAction` always generates markdown; keep it cheap for unit tests.
    getAttackDiscoveryMarkdown: vi.fn(() => 'markdown'),
  };
});

import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import { mockAttackDiscovery } from '../../mock/mock_attack_discovery';
import { getMockAttackDiscoveryAlerts } from '../../mock/mock_attack_discovery_alerts';
import { useAssistantAvailability } from '../../../../assistant/use_assistant_availability';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { TakeAction } from '.';

const defaultAgentBuilderAvailability = vi.hoisted(() => ({
  isAgentBuilderEnabled: true,
  hasAgentBuilderPrivilege: true,
  isAgentChatExperienceEnabled: false,
  hasValidAgentBuilderLicense: true,
}));

const mockMutateAsyncBulk = vi.fn().mockResolvedValue({});
const mockMutateAsyncStatus = vi.fn().mockResolvedValue({});
vi.mock('../../../../agent_builder/hooks/use_agent_builder_availability', () => {
  const mocked = {
    useAgentBuilderAvailability: vi.fn().mockReturnValue(defaultAgentBuilderAvailability),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../../assistant/use_assistant_availability', () => {
  const mocked = {
    useAssistantAvailability: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockUseAssistantAvailability = useAssistantAvailability as Mock;
const mockUseAgentBuilderAvailability = vi.mocked(useAgentBuilderAvailability);

vi.mock('../../../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../use_attack_discovery_bulk', () => {
  const mocked = {
    useAttackDiscoveryBulk: vi.fn(() => ({ mutateAsync: mockMutateAsyncBulk })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_add_to_case', () => {
  const mocked = {
    useAddToCase: vi.fn(() => ({ disabled: false, onAddToCase: vi.fn() })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant', () => {
  const mocked = {
    useViewInAiAssistant: vi.fn(() => ({
      showAssistantOverlay: vi.fn(),
      disabled: false,
      isAssistantVisible: true,
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_update_alerts_status', () => {
  const mocked = {
    useUpdateAlertsStatus: vi.fn(() => ({ mutateAsync: mockMutateAsyncStatus })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../utils/is_attack_discovery_alert', () => {
  const mocked = {
    isAttackDiscoveryAlert: (ad: { alertWorkflowStatus?: string }) =>
      ad?.alertWorkflowStatus !== undefined,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../detections/containers/detection_engine/alerts/use_alerts_privileges');

vi.mock(
  '../../../../detections/hooks/attacks/bulk_actions/context_menu_items/use_attack_run_workflow_context_menu_items',
  () => {
    const mocked = {
      useAttackRunWorkflowContextMenuItems: vi.fn(() => ({ items: [], panels: [] })),
    };
    return { ...mocked, default: mocked };
  }
);

const mockUseAlertsPrivileges = useAlertsPrivileges as Mock;

vi.mock('../use_attack_discovery_attachment', () => {
  const mocked = {
    useAttackDiscoveryAttachment: vi.fn(() => vi.fn()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../../agent_builder/hooks/use_report_add_to_chat', () => {
  const mocked = {
    useReportAddToChat: vi.fn(() => vi.fn()),
  };
  return { ...mocked, default: mocked };
});

/** helper function to open the popover */
const openPopover = () => fireEvent.click(screen.getAllByTestId('takeActionPopoverButton')[0]);

const defaultProps = {
  attackDiscoveries: [mockAttackDiscovery],
  setSelectedAttackDiscoveries: vi.fn(),
};

describe('TakeAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAgentBuilderAvailability.mockReturnValue(defaultAgentBuilderAvailability);
    (useKibana as Mock).mockReturnValue({
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
            canUseCases: vi.fn().mockReturnValue({
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
            useCasesAddToExistingCase: vi.fn(),
            useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({ open: vi.fn() }),
            useCasesAddToNewCaseFlyout: vi.fn(),
          },
          ui: {},
        },
      },
    });

    mockUseAssistantAvailability.mockReturnValue({
      hasSearchAILakeConfigurations: false, // EASE is not configured
    });

    mockUseAlertsPrivileges.mockReturnValue({ hasAlertsUpdate: true });
  });

  it('renders the Add to case action', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('addToCase')).toBeInTheDocument();
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

  it('renders explicitly ordered action groups with icons and separators', () => {
    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );
    openPopover();

    expect(
      screen.getAllByRole('menuitem').map((item) => item.getAttribute('data-test-subj'))
    ).toEqual([
      'markAsOpen',
      'markAsAcknowledged',
      'markAsClosed',
      'addToCase',
      'viewInAiAssistant',
    ]);
    expect(screen.getAllByTestId('securityActionMenuGroupSeparator')).toHaveLength(2);
    screen.getAllByRole('menuitem').forEach((item) => {
      expect(item.querySelector('[data-euiicon-type]')).not.toBeNull();
    });
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
        <TakeAction {...defaultProps} attackDiscoveries={[getMockAttackDiscoveryAlerts()[0]]} />
      </TestProviders>
    );

    openPopover();

    expect(screen.getByTestId('viewInAgentBuilder')).toBeDisabled();
  });

  // Only a persisted discovery can be attached, so a no-op action is not offered.
  it('does not render the Add to chat action for a discovery that is not persisted', () => {
    mockUseAgentBuilderAvailability.mockReturnValue({
      isAgentBuilderEnabled: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });

    render(
      <TestProviders>
        <TakeAction {...defaultProps} />
      </TestProviders>
    );

    openPopover();

    expect(screen.queryByTestId('viewInAgentBuilder')).not.toBeInTheDocument();
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
    const setSelectedAttackDiscoveries = vi.fn();
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
    alerts[0].alertWorkflowStatus = 'open';
    alerts[1].alertWorkflowStatus = 'closed';
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
          <TakeAction attackDiscoveries={alerts} setSelectedAttackDiscoveries={vi.fn()} />
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
    let setSelectedAttackDiscoveries: Mock;

    beforeEach(() => {
      alert = getMockAttackDiscoveryAlerts()[0];
      setSelectedAttackDiscoveries = vi.fn();
      (useKibana as Mock).mockReturnValue({
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
    const mockOnAddToCase = vi.fn();

    beforeEach(async () => {
      const { useAddToCase } = await vi.importMock('./use_add_to_case');

      useAddToCase.mockReturnValue({
        disabled: false,
        onAddToCase: mockOnAddToCase,
      });
    });

    it('calls onAddToCase when clicking add to case', async () => {
      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();
      fireEvent.click(screen.getByTestId('addToCase'));

      await waitFor(() => {
        expect(mockOnAddToCase).toHaveBeenCalledWith({
          alertIds: expect.any(Array),
          markdownComments: expect.any(Array),
          replacements: undefined,
        });
      });
    });

    it('refreshes attack discoveries after adding to a case', async () => {
      const refetchFindAttackDiscoveries = vi.fn();

      render(
        <TestProviders>
          <TakeAction
            {...defaultProps}
            refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
          />
        </TestProviders>
      );

      const { useAddToCase } = await vi.importMock('./use_add_to_case');
      expect(useAddToCase).toHaveBeenCalledWith(
        expect.objectContaining({
          onSuccess: refetchFindAttackDiscoveries,
        })
      );
    });
  });

  describe('when case permissions are disabled', () => {
    beforeEach(async () => {
      (useKibana as Mock).mockReturnValue({
        services: {
          cases: {
            helpers: {
              canUseCases: vi.fn().mockReturnValue({
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
              useCasesAddToExistingCase: vi.fn(),
              useCasesAddToExistingCaseModal: vi.fn().mockReturnValue({ open: vi.fn() }),
              useCasesAddToNewCaseFlyout: vi.fn(),
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

      const { useAddToCase } = await vi.importMock('./use_add_to_case');
      useAddToCase.mockReturnValue({
        disabled: true,
        onAddToCase: vi.fn(),
      });
    });

    it('does not render case actions when the user lacks permissions', () => {
      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();

      expect(screen.queryByTestId('addToCase')).not.toBeInTheDocument();
    });
  });

  describe('AI Assistant interactions', () => {
    const mockShowAssistantOverlay = vi.fn();

    beforeEach(async () => {
      const { useViewInAiAssistant } = await vi.importMock(
        '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
      );
      useViewInAiAssistant.mockReturnValue({
        showAssistantOverlay: mockShowAssistantOverlay,
        disabled: false,
        isAssistantVisible: true,
      });
    });

    it('disables view in AI assistant when disabled', async () => {
      const { useViewInAiAssistant } = await vi.importMock(
        '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
      );
      useViewInAiAssistant.mockReturnValue({
        showAssistantOverlay: mockShowAssistantOverlay,
        disabled: true,
        isAssistantVisible: true,
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

    it('does not render view in AI assistant when isAssistantVisible is false', async () => {
      const { useViewInAiAssistant } = await vi.importMock(
        '../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant'
      );
      useViewInAiAssistant.mockReturnValue({
        showAssistantOverlay: mockShowAssistantOverlay,
        disabled: false,
        isAssistantVisible: false,
      });

      render(
        <TestProviders>
          <TakeAction {...defaultProps} />
        </TestProviders>
      );

      openPopover();
      expect(screen.queryByTestId('viewInAiAssistant')).not.toBeInTheDocument();
    });
  });

  describe('when the user does not have alert edit privileges', () => {
    beforeEach(() => {
      mockUseAlertsPrivileges.mockReturnValue({ hasAlertsUpdate: false });
    });

    it('does not render mark as open action', () => {
      const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'closed', id: 'id1' };

      render(
        <TestProviders>
          <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
        </TestProviders>
      );

      openPopover();

      expect(screen.queryByTestId('markAsOpen')).not.toBeInTheDocument();
    });

    it('does not render mark as closed/acknowledged action', () => {
      const alert = { ...mockAttackDiscovery, alertWorkflowStatus: 'open', id: 'id1' };

      render(
        <TestProviders>
          <TakeAction {...defaultProps} attackDiscoveries={[alert]} />
        </TestProviders>
      );

      openPopover();

      expect(screen.queryByTestId('markAsAcknowledged')).not.toBeInTheDocument();
      expect(screen.queryByTestId('markAsClosed')).not.toBeInTheDocument();
    });
  });
});
