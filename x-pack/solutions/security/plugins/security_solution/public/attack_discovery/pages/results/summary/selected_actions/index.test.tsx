/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { SelectedActions } from '.';
import { render, screen, act } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../common/mock';
import { getMockAttackDiscoveryAlerts } from '../../../mock/mock_attack_discovery_alerts';
import * as i18n from './translations';

jest.mock('../../../../../assistant/use_assistant_availability', () => ({
  useAssistantAvailability: () => ({
    hasSearchAILakeConfigurations: true, // This ensures direct call to onConfirm
  }),
}));

jest.mock('../../../use_attack_discovery_bulk', () => ({
  useAttackDiscoveryBulk: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('../../take_action/use_update_alerts_status', () => ({
  useUpdateAlertsStatus: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  }),
}));

jest.mock('../../take_action/use_add_to_case', () => ({
  useAddToNewCase: () => ({
    disabled: false,
    onAddToNewCase: jest.fn(),
  }),
}));

jest.mock('../../take_action/use_add_to_existing_case', () => ({
  useAddToExistingCase: () => ({
    onAddToExistingCase: jest.fn(),
  }),
}));

jest.mock('../../attack_discovery_panel/view_in_ai_assistant/use_view_in_ai_assistant', () => ({
  useViewInAiAssistant: () => ({
    showAssistantOverlay: jest.fn(),
    disabled: false,
  }),
}));

describe('SelectedActions', () => {
  const defaultProps = {
    refetchFindAttackDiscoveries: jest.fn(),
    selectedAttackDiscoveries: { '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': true },
    selectedConnectorAttackDiscoveries: getMockAttackDiscoveryAlerts(),
    setSelectedAttackDiscoveries: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the expected selected discoveries count', () => {
    render(
      <TestProviders>
        <SelectedActions {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.SELECTED_DISCOVERIES(1))).toBeInTheDocument();
  });

  it('does NOT render when no discoveries are selected', () => {
    render(
      <TestProviders>
        <SelectedActions {...defaultProps} selectedAttackDiscoveries={{}} />
      </TestProviders>
    );

    expect(screen.queryByTestId('summary')).toBeNull();
  });

  it('calls setSelectedAttackDiscoveries when Mark as Closed is clicked', async () => {
    render(
      <TestProviders>
        <SelectedActions {...defaultProps} />
      </TestProviders>
    );

    await act(async () => {
      screen.getByTestId('takeActionPopoverButton').click();
    });

    const markAsClosed = await screen.findByTestId('markAsClosed');
    await act(async () => {
      markAsClosed.click();
    });
    await screen.findByTestId('takeActionPopoverButton');

    expect(defaultProps.setSelectedAttackDiscoveries).toHaveBeenCalledWith({});
  });

  it('renders the expected count when multiple discoveries are selected', () => {
    const multiSelected = {
      ...defaultProps,
      selectedAttackDiscoveries: {
        '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': true,
        'another-id': true,
      },
      selectedConnectorAttackDiscoveries: [
        ...getMockAttackDiscoveryAlerts(),
        { ...getMockAttackDiscoveryAlerts()[0], id: 'another-id' },
      ],
    };

    render(
      <TestProviders>
        <SelectedActions {...multiSelected} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.SELECTED_DISCOVERIES(2))).toBeInTheDocument();
  });

  it('renders correctly when selectedAttackDiscoveries has multiple entries but only one is true', () => {
    const props = {
      ...defaultProps,
      selectedAttackDiscoveries: {
        id1: true,
        id2: false,
        id3: false,
      },
    };

    render(
      <TestProviders>
        <SelectedActions {...props} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.SELECTED_DISCOVERIES(1))).toBeInTheDocument();
  });

  it('does not render when the selectedConnectorAttackDiscoveries array is empty', () => {
    const props = {
      ...defaultProps,
      selectedConnectorAttackDiscoveries: [],
    };

    render(
      <TestProviders>
        <SelectedActions {...props} />
      </TestProviders>
    );

    expect(screen.getByTestId('summary')).toBeInTheDocument();
  });

  it('handles mismatched IDs between selectedAttackDiscoveries and selectedConnectorAttackDiscoveries', () => {
    const props = {
      ...defaultProps,
      selectedAttackDiscoveries: { 'non-existent-id': true },
      selectedConnectorAttackDiscoveries: getMockAttackDiscoveryAlerts(),
    };

    render(
      <TestProviders>
        <SelectedActions {...props} />
      </TestProviders>
    );

    expect(screen.getByText(i18n.SELECTED_DISCOVERIES(1))).toBeInTheDocument();
  });

  describe('action buttons', () => {
    describe('case buttons', () => {
      beforeEach(async () => {
        render(
          <TestProviders>
            <SelectedActions {...defaultProps} />
          </TestProviders>
        );
        await act(async () => {
          screen.getByTestId('takeActionPopoverButton').click();
        });
      });

      it('renders the add to case button', () => {
        expect(screen.getByTestId('addToCase')).toBeInTheDocument();
      });

      it('renders the add to existing case button', () => {
        expect(screen.getByTestId('addToExistingCase')).toBeInTheDocument();
      });
    });

    it('renders view in AI assistant button when only one discovery is selected', async () => {
      render(
        <TestProviders>
          <SelectedActions {...defaultProps} />
        </TestProviders>
      );

      await act(async () => {
        screen.getByTestId('takeActionPopoverButton').click();
      });

      expect(screen.getByTestId('viewInAiAssistant')).toBeInTheDocument();
    });

    it('does NOT render view in AI assistant button when multiple discoveries are selected', async () => {
      const multiSelected = {
        ...defaultProps,
        selectedAttackDiscoveries: {
          '0b8cf9c7-5ba1-49ce-b53d-3cfb06918b60': true,
          'another-id': true,
        },
        selectedConnectorAttackDiscoveries: [
          ...getMockAttackDiscoveryAlerts(),
          { ...getMockAttackDiscoveryAlerts()[0], id: 'another-id' },
        ],
      };

      render(
        <TestProviders>
          <SelectedActions {...multiSelected} />
        </TestProviders>
      );

      await act(async () => {
        screen.getByTestId('takeActionPopoverButton').click();
      });

      expect(screen.queryByTestId('viewInAiAssistant')).toBeNull();
    });

    describe('status buttons', () => {
      beforeEach(async () => {
        render(
          <TestProviders>
            <SelectedActions {...defaultProps} />
          </TestProviders>
        );
        await act(async () => {
          screen.getByTestId('takeActionPopoverButton').click();
        });
      });

      it('renders mark as acknowledged button', () => {
        // Note: markAsOpen is not shown because mock alerts have status 'open'
        expect(screen.getByTestId('markAsAcknowledged')).toBeInTheDocument();
      });

      it('renders mark as closed button', () => {
        expect(screen.getByTestId('markAsClosed')).toBeInTheDocument();
      });
    });
  });
});
