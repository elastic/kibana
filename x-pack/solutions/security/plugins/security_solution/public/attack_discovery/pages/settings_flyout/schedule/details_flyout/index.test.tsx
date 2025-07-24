/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { useLoadConnectors } from '@kbn/elastic-assistant/impl/connectorland/use_load_connectors';

import { DetailsFlyout } from '.';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useUpdateAttackDiscoverySchedule } from '../logic/use_update_schedule';
import { useGetAttackDiscoverySchedule } from '../logic/use_get_schedule';
import { mockAttackDiscoverySchedule } from '../../../mock/mock_attack_discovery_schedule';

jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors');
jest.mock('../logic/use_update_schedule');
jest.mock('../logic/use_get_schedule');
jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../sourcerer/containers');
jest.mock('react-router-dom', () => ({
  matchPath: jest.fn(),
  useLocation: jest.fn().mockReturnValue({
    search: '',
  }),
  withRouter: jest.fn(),
}));

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

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseSourcererDataView = useSourcererDataView as jest.MockedFunction<
  typeof useSourcererDataView
>;
const getBooleanValueMock = jest.fn();
const updateAttackDiscoveryScheduleMock = jest.fn();

const defaultProps = {
  scheduleId: mockAttackDiscoverySchedule.id,
  onClose: jest.fn(),
};

const renderComponent = async () => {
  await act(() => {
    render(
      <TestProviders>
        <DetailsFlyout {...defaultProps} />
      </TestProviders>
    );
  });
};

describe('DetailsFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getBooleanValueMock.mockReturnValue(true);

    mockUseKibana.mockReturnValue({
      services: {
        featureFlags: {
          getBooleanValue: getBooleanValueMock,
        },
        lens: {
          EmbeddableComponent: () => <div data-test-subj="mockEmbeddableComponent" />,
        },
        triggersActionsUi: {
          ...triggersActionsUiMock.createStart(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        unifiedSearch: {
          ui: {
            SearchBar: () => <div data-test-subj="mockSearchBar" />,
          },
        },
      },
    } as unknown as jest.Mocked<ReturnType<typeof useKibana>>);

    mockUseSourcererDataView.mockReturnValue({
      sourcererDataView: {},
      loading: false,
    } as unknown as jest.Mocked<ReturnType<typeof useSourcererDataView>>);

    (useLoadConnectors as jest.Mock).mockReturnValue({
      isLoading: false,
      data: mockConnectors,
    });
    (useUpdateAttackDiscoverySchedule as jest.Mock).mockReturnValue({
      isLoading: false,
      mutateAsync: updateAttackDiscoveryScheduleMock,
    });
    (useGetAttackDiscoverySchedule as jest.Mock).mockReturnValue({
      isLoading: false,
      data: { schedule: mockAttackDiscoverySchedule },
    });
  });

  it('should render the flyout title', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('scheduleDetailsTitle')).toHaveTextContent(
        mockAttackDiscoverySchedule.name
      );
    });
  });

  it('should render schedule details container', async () => {
    await renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('scheduleDetails')).toBeInTheDocument();
    });
  });

  it('should render edit button', async () => {
    await renderComponent();
    await waitFor(() => {
      expect(screen.getByTestId('edit')).toBeInTheDocument();
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

  it('should render edit form while editing', async () => {
    await renderComponent();

    const editButton = screen.getByTestId('edit');
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('attackDiscoveryScheduleForm')).toBeInTheDocument();
    });
  });

  it('should render save button while editing', async () => {
    await renderComponent();

    const editButton = screen.getByTestId('edit');
    act(() => {
      fireEvent.click(editButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('save')).toBeInTheDocument();
    });
  });

  describe('confirmation modal', () => {
    beforeEach(async () => {
      await renderComponent();

      // Enter edit mode
      const editButton = screen.getByTestId('edit');
      fireEvent.click(editButton);
      // Simulate unsaved changes
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
      const flyout = screen.getByTestId('scheduleDetailsFlyout');
      fireEvent.keyDown(flyout, { key: 'Escape' });

      // Verify the confirmation modal is shown
      expect(screen.getByTestId('confirmationModal')).toBeInTheDocument();
    });
  });
});
