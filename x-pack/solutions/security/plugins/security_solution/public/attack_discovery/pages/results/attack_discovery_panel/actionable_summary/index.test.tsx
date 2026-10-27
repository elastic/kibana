/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { createExpandableFlyoutApiMock } from '../../../../../common/mock/expandable_flyout';

import { ActionableSummary } from '.';
import { TestProviders } from '../../../../../common/mock';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { mockAttackDiscovery } from '../../../mock/mock_attack_discovery';
import { getMockAttackDiscoveryAlerts } from '../../../mock/mock_attack_discovery_alerts';
import { useKibana } from '../../../../../common/lib/kibana';
import { SECURITY_FEATURE_ID } from '../../../../../../common';
import { useFlyoutApi } from '../../../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../../../flyout_v2/use_flyout_api.mock';

jest.mock('../../../../../common/lib/kibana');
jest.mock('../../../../../agent_builder/hooks/use_agent_builder_availability', () => ({
  useAgentBuilderAvailability: jest.fn(),
}));
jest.mock('@kbn/expandable-flyout');
jest.mock('../../../../../flyout_v2/use_flyout_api');

jest.mock(
  '../../attack_discovery_markdown_formatter/field_markdown_renderer/use_entity_euid_from_alerts',
  () => ({
    useEntityEuidFromAlerts: jest.fn(() => ({ euid: undefined, isLoading: false })),
    ENTITY_TYPE_BY_FIELD: jest.requireActual(
      '../../attack_discovery_markdown_formatter/field_markdown_renderer/helpers'
    ).ENTITY_TYPE_BY_FIELD,
  })
);

describe('ActionableSummary', () => {
  const mockReplacements = {
    '5e454c38-439c-4096-8478-0a55511c76e3': 'foo.hostname',
    '3bdc7952-a334-4d95-8092-cd176546e18a': 'bar.username',
  };

  const mockOpenRightPanel = jest.fn();
  const mockUseExpandableFlyoutApi = useExpandableFlyoutApi as jest.MockedFunction<
    typeof useExpandableFlyoutApi
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useAgentBuilderAvailability)
      .mockImplementation(
        jest.requireActual('../../../../../agent_builder/hooks/use_agent_builder_availability')
          .useAgentBuilderAvailability
      );
    mockUseExpandableFlyoutApi.mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openRightPanel: mockOpenRightPanel,
    });
    jest.mocked(useFlyoutApi).mockReturnValue(createFlyoutApiMock());
  });

  describe('when entities with replacements are provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );
    });

    it('renders a hostname with the expected value from replacements', () => {
      expect(screen.getAllByTestId('entityButton')[0]).toHaveTextContent('foo.hostname');
    });

    it('renders a username with the expected value from replacements', () => {
      expect(screen.getAllByTestId('entityButton')[1]).toHaveTextContent('bar.username');
    });

    it('opens the right panel when an entity badge is clicked', () => {
      const entityButton = screen.getAllByTestId('entityButton')[0];
      fireEvent.click(entityButton);
      expect(mockOpenRightPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe('when entities that do NOT have replacements are provided', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={{}} // <-- no replacements for the entities
          />
        </TestProviders>
      );
    });

    it('renders a hostname with with the original hostname value', () => {
      expect(screen.getAllByTestId('entityButton')[0]).toHaveTextContent(
        '5e454c38-439c-4096-8478-0a55511c76e3'
      );
    });

    it('renders a username with the original username value', () => {
      expect(screen.getAllByTestId('entityButton')[1]).toHaveTextContent(
        '3bdc7952-a334-4d95-8092-cd176546e18a'
      );
    });
  });

  describe('when showAnonymized is true', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
            showAnonymized={true} // <-- show anonymized entities
          />
        </TestProviders>
      );
    });

    it('renders a disabled badge with the original hostname value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[0]).toHaveTextContent(
        '5e454c38-439c-4096-8478-0a55511c76e3'
      );
    });

    it('renders a disabled badge with the original username value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[1]).toHaveTextContent(
        '3bdc7952-a334-4d95-8092-cd176546e18a'
      );
    });
  });

  describe('View in AI assistant', () => {
    beforeEach(() => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );
    });

    it('renders the View in AI assistant button', () => {
      expect(screen.getByTestId('viewInAiAssistantCompact')).toBeInTheDocument();
    });
  });

  describe('when configurations capabilities is defined (for EASE)', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              [SECURITY_FEATURE_ID]: {
                configurations: true,
              },
            },
          },
          uiSettings: {
            get: jest.fn().mockReturnValue(false),
          },
        },
      });

      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );
    });

    it('renders a disabled badge with the hostname value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[0]).toHaveTextContent('foo.hostname');
    });

    it('renders a disabled badge with the username value', () => {
      expect(screen.getAllByTestId('disabledActionsBadge')[1]).toHaveTextContent('bar.username');
    });
  });

  describe('Add to chat', () => {
    beforeEach(() => {
      jest.mocked(useAgentBuilderAvailability).mockReturnValue({
        hasAgentBuilderPrivilege: true,
        hasValidAgentBuilderLicense: true,
        isAgentBuilderEnabled: true,
        isAgentChatExperienceEnabled: true,
      });
    });

    it('renders Add to chat for a persisted discovery', () => {
      const [persistedAttackDiscovery] = getMockAttackDiscoveryAlerts();

      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={persistedAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('newAgentBuilderAttachment')).toBeInTheDocument();
    });

    // Only a persisted discovery can be attached, so a no-op action is not offered.
    it('does not render Add to chat for a discovery that is not persisted', () => {
      render(
        <TestProviders>
          <ActionableSummary
            attackDiscovery={mockAttackDiscovery}
            replacements={mockReplacements}
          />
        </TestProviders>
      );

      expect(screen.queryByTestId('newAgentBuilderAttachment')).not.toBeInTheDocument();
    });
  });
});
