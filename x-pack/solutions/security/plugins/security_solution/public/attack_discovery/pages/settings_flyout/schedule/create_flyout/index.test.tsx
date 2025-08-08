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

import { CreateFlyout } from '.';
import * as i18n from './translations';

import { useKibana } from '../../../../../common/lib/kibana';
import { TestProviders } from '../../../../../common/mock/test_providers';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { useCreateAttackDiscoverySchedule } from '../logic/use_create_schedule';

jest.mock('@kbn/elastic-assistant/impl/connectorland/use_load_connectors');
jest.mock('../logic/use_create_schedule');
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

const defaultProps = {
  connectorId: undefined,
  onConnectorIdSelected: jest.fn(),
  onClose: jest.fn(),
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
    (useCreateAttackDiscoverySchedule as jest.Mock).mockReturnValue({
      isLoading: false,
      mutateAsync: jest.fn(),
    });
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
    (useLoadConnectors as jest.Mock).mockReturnValue({
      isLoading: false,
      data: [],
    });
    const mutateAsync = jest.fn();
    (useCreateAttackDiscoverySchedule as jest.Mock).mockReturnValue({
      isLoading: false,
      mutateAsync,
    });
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
        expect(screen.getByText('Select a connector type')).toBeInTheDocument();
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
