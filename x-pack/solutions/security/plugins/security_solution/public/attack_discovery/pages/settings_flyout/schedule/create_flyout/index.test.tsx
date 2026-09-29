/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useLoadConnectors } from '@kbn/inference-connectors';

import { CreateFlyout } from '.';
import * as i18n from './translations';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useScheduleApi } from '../logic/use_schedule_api';
import { useConnectors } from '../../../../../common/hooks/use_connectors';
import { useListWorkflows } from '../../workflow_configuration/hooks/use_list_workflows';
import { useGenerateWorkflow } from '../../workflow_configuration/hooks/use_generate_workflow';

vi.mock('@kbn/inference-connectors');
vi.mock('../logic/use_schedule_api');
vi.mock('../../../../../common/lib/kibana');
vi.mock('../../../../../common/hooks/use_connectors');
vi.mock('../../workflow_configuration/hooks/use_list_workflows');
vi.mock('../../workflow_configuration/hooks/use_generate_workflow');
vi.mock('../../../../../data_view_manager/hooks/use_data_view', () => {
  const mocked = {
    useDataView: vi.fn().mockReturnValue({
      dataView: undefined,
      status: 'ready',
    }),
  };
  return { ...mocked, default: mocked };
});
// Stub the heavy RuleActionsField subtree. It renders the triggers_actions_ui
// `ActionForm` via `React.lazy`/`Suspense` (`getActionFormLazy`), whose first
// mount pays a large one-time lazy-import cost and whose connector/action-type
// loads never settle under jsdom. That subtree — not `AlertSelection` — is the
// dominant cost and the source of the "not wrapped in act(...)" churn that
// tripped Jest's 5s per-test timeout in CI.
vi.mock('../../../../../common/components/rule_actions_field', () => {
  const mocked = {
    RuleActionsField: () => <div data-test-subj="mockRuleActionsField" />,
  };
  return { ...mocked, default: mocked };
});
// Stub the heavy AlertSelection subtree (lens embeddable, unified-search bar,
// alert-preview tabs) that otherwise blows the 5s render budget under jsdom. The
// stub keeps the `alertSelection` marker and an `alertsRange` control wired to
// `onSettingsChanged` so the unsaved-changes assertions still exercise it.
vi.mock('../../alert_selection', () => {
  const mocked = {
    AlertSelection: ({
      settings,
      onSettingsChanged,
    }: {
      settings: Record<string, unknown>;
      onSettingsChanged?: (settings: Record<string, unknown>) => void;
    }) => (
      <div data-test-subj="alertSelection">
        <input
          data-test-subj="alertsRange"
          onChange={(e) => onSettingsChanged?.({ ...settings, size: e.target.value })}
        />
      </div>
    ),
  };
  return { ...mocked, default: mocked };
});
vi.mock('react-router-dom', () => {
  const mocked = {
    matchPath: vi.fn(),
    useLocation: vi.fn().mockReturnValue({
      search: '',
    }),
    withRouter: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockConnectors: unknown[] = [
  {
    id: 'test-id',
    name: 'OpenAI connector',
    actionTypeId: '.gen-ai',
    config: {
      apiProvider: 'OpenAI',
    },
  },
];

const mockUseKibana = useKibana as MockedFunction<typeof useKibana>;
const mockUseScheduleApi = useScheduleApi as MockedFunction<typeof useScheduleApi>;

const setMockCreateSchedule = ({ mutateAsync }: { mutateAsync: Mock }) => {
  mockUseScheduleApi.mockReturnValue({
    isWorkflowsEnabled: false,
    useCreateSchedule: () =>
      ({ isLoading: false, mutateAsync } as unknown as ReturnType<
        ReturnType<typeof useScheduleApi>['useCreateSchedule']
      >),
  } as unknown as ReturnType<typeof useScheduleApi>);
};

const defaultProps = {
  onClose: vi.fn(),
};

const renderComponent = async () => {
  await act(() => {
    render(
      <TestProviders>
        <CreateFlyout {...defaultProps} />
      </TestProviders>
    );
  });
};

describe('CreateFlyout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          useBooleanValue: vi.fn().mockReturnValue(false),
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: {
          ...triggersActionsUiMock.createStart(),
        },
        uiSettings: {
          get: vi.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as Mocked<ReturnType<typeof useKibana>>);

    (useLoadConnectors as Mock).mockReturnValue({
      isLoading: false,
      data: mockConnectors,
    });

    (useConnectors as Mock).mockReturnValue({
      connectors: mockConnectors,
      setCurrentConnector: vi.fn(),
    });

    (useListWorkflows as Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      status: 'success' as const,
    });

    (useGenerateWorkflow as Mock).mockReturnValue({
      cancelGeneration: vi.fn(),
      generatedWorkflow: null,
      isGenerating: false,
      startGeneration: vi.fn(),
    });

    setMockCreateSchedule({ mutateAsync: vi.fn() });
  });

  it('should render the flyout title', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getAllByTestId('title')[0]).toHaveTextContent(i18n.SCHEDULE_CREATE_TITLE);
    });
  });

  it('should invoke onClose when the close button is clicked', async () => {
    await renderComponent();

    const closeButton = screen.getByTestId('euiFlyoutCloseButton');
    act(() => {
      fireEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('confirmation modal', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <CreateFlyout {...defaultProps} />
        </TestProviders>
      );

      // Simulate unsaved changes:
      const input = screen.getByTestId('alertsRange');
      fireEvent.change(input, { target: { value: 'changed' } });

      // Click the close button to trigger the confirmation modal
      fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
    });

    it('renders the confirmation modal when there are unsaved changes and close is clicked', () => {
      expect(screen.getByTestId('confirmationModal')).toBeInTheDocument();
    });

    it('calls onClose when discard is clicked in confirmation modal', () => {
      fireEvent.click(screen.getByTestId('discardChanges'));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes the confirmation modal when cancel is clicked', () => {
      fireEvent.click(screen.getByTestId('cancel'));

      expect(screen.queryByTestId('confirmationModal')).not.toBeInTheDocument();
    });

    it('renders the confirmation modal when there are unsaved changes and escape key is pressed', () => {
      // First, close the modal that was opened in beforeEach
      fireEvent.click(screen.getByTestId('cancel'));

      // Verify modal is closed
      expect(screen.queryByTestId('confirmationModal')).not.toBeInTheDocument();

      // Now press escape key on the flyout
      const flyout = screen.getByTestId('scheduleCreateFlyout');
      fireEvent.keyDown(flyout, { key: 'Escape' });

      // Verify the confirmation modal is shown
      expect(screen.getByTestId('confirmationModal')).toBeInTheDocument();
    });
  });

  it('does not call createAttackDiscoverySchedule if a connector is not found', async () => {
    (useLoadConnectors as Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });
    const mutateAsync = vi.fn();
    setMockCreateSchedule({ mutateAsync });
    await act(async () => {
      render(
        <TestProviders>
          <CreateFlyout {...defaultProps} />
        </TestProviders>
      );
    });

    // Simulate save
    fireEvent.click(screen.getByTestId('save'));

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  describe('schedule form', () => {
    it('should render schedule form', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
      });
    });

    it('should render schedule name field component', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryFormNameField')).toBeInTheDocument();
      });
    });

    it('should render connector selector component', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryConnectorSelectorField')).toBeInTheDocument();
      });
    });

    it('should render `alertSelection` component', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('alertSelection')).toBeInTheDocument();
      });
    });

    it('should render schedule (`run every`) component', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('attackDiscoveryScheduleField')).toBeInTheDocument();
      });
    });

    it('should render actions component', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('mockRuleActionsField')).toBeInTheDocument();
      });
    });

    it('should render "Create and enable" button', async () => {
      await renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('save')).toHaveTextContent(i18n.SCHEDULE_CREATE_BUTTON_TITLE);
      });
    });
  });
});
