/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { Title } from '.';
import { TestProviders } from '../../../../../../../common/mock';
import { useKibanaFeatureFlags } from '../../../../../use_kibana_feature_flags';

jest.mock('../../../../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: jest.fn(),
}));

jest.mock('@kbn/elastic-assistant-common', () => ({
  ATTACK_DISCOVERY_AD_HOC_RULE_ID: 'ad-hoc-rule-id',
  API_VERSIONS: {
    public: {
      v1: '2023-10-31',
    },
    internal: {
      v1: '1',
    },
  },
  replaceAnonymizedValuesWithOriginalValues: jest.fn((params) => params.messageContent),
}));

jest.mock('../../../../../settings_flyout/schedule/details_flyout', () => ({
  DetailsFlyout: ({ scheduleId, onClose }: { scheduleId: string; onClose: () => void }) => (
    <div data-test-subj="detailsFlyout">
      {scheduleId}
      <button type="button" onClick={onClose} data-test-subj="closeFlyout">
        {'Close'}
      </button>
    </div>
  ),
}));

jest.mock('../../../../../utils/is_attack_discovery_alert', () => ({
  isAttackDiscoveryAlert: jest.fn((discovery) => !!discovery.alertRuleUuid),
}));

const mockUseKibanaFeatureFlags = useKibanaFeatureFlags as jest.MockedFunction<
  typeof useKibanaFeatureFlags
>;

// Test wrapper with QueryClient and TestProviders
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <TestProviders>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestProviders>
  );
};

// Complete mockRawResponse matching AttackDiscovery shape
const mockRawResponse = {
  id: 'test-id',
  title: 'Test Attack Discovery',
  alertIds: ['alert-1'],
  detailsMarkdown: 'Details',
  summaryMarkdown: 'Summary',
  timestamp: '2023-01-01T00:00:00Z',
  connectorId: 'connector-id',
  connectorName: 'Connector Name',
  generationUuid: 'generation-uuid',
  entitySummaryMarkdown: 'Entity summary',
  mitreAttackTactics: ['TA0001'],
  users: [],
};

const defaultProps = {
  attackDiscovery: mockRawResponse,
  isOpen: 'closed' as const,
  isSelected: false,
  onToggle: jest.fn(),
  setIsOpen: jest.fn(),
  setIsSelected: jest.fn(),
  showAnonymized: false,
};

describe('Title', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibanaFeatureFlags.mockReturnValue({
      attackDiscoveryAlertsEnabled: true,
    });
  });

  describe('rendering', () => {
    it('renders the title component', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('titleText')).toBeInTheDocument();
    });

    it('renders the checkbox when attackDiscoveryAlertsEnabled is true', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('attackDiscoveryCheckbox')).toBeInTheDocument();
    });

    it('renders the accordion', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('attackDiscoveryAccordion')).toBeInTheDocument();
    });
  });

  describe('feature flag variations', () => {
    describe('when attackDiscoveryAlertsEnabled is false', () => {
      beforeEach(() => {
        mockUseKibanaFeatureFlags.mockReturnValue({
          attackDiscoveryAlertsEnabled: false,
        });
      });

      it('does not render the checkbox', () => {
        render(
          <TestWrapper>
            <Title {...defaultProps} />
          </TestWrapper>
        );

        expect(screen.queryByTestId('attackDiscoveryCheckbox')).not.toBeInTheDocument();
      });

      it('still renders other components', () => {
        render(
          <TestWrapper>
            <Title {...defaultProps} />
          </TestWrapper>
        );

        expect(screen.getByTestId('attackDiscoveryAccordion')).toBeInTheDocument();
      });
    });

    describe('when attackDiscoveryAlertsEnabled is true', () => {
      beforeEach(() => {
        mockUseKibanaFeatureFlags.mockReturnValue({
          attackDiscoveryAlertsEnabled: true,
        });
      });

      it('renders the checkbox', () => {
        render(
          <TestWrapper>
            <Title {...defaultProps} />
          </TestWrapper>
        );

        expect(screen.getByTestId('attackDiscoveryCheckbox')).toBeInTheDocument();
      });
    });
  });

  describe('user interactions', () => {
    it('calls setIsSelected when checkbox is clicked', async () => {
      const setIsSelected = jest.fn();
      render(
        <TestWrapper>
          <Title {...defaultProps} setIsSelected={setIsSelected} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByTestId('attackDiscoveryCheckbox'));

      expect(setIsSelected).toHaveBeenCalledWith({
        id: 'test-id',
        selected: true,
      });
    });

    describe('when the accordion button is clicked', () => {
      let setIsOpen: jest.Mock;
      let onToggle: jest.Mock;

      beforeEach(async () => {
        setIsOpen = jest.fn();
        onToggle = jest.fn();
        render(
          <TestWrapper>
            <Title {...defaultProps} setIsOpen={setIsOpen} onToggle={onToggle} />
          </TestWrapper>
        );

        const accordion = screen.getByTestId('attackDiscoveryAccordion');
        const button = accordion.querySelector('button.euiAccordion__button');
        if (button != null) {
          await userEvent.click(button);
        }
      });

      it('calls setIsOpen with "open"', () => {
        expect(setIsOpen).toHaveBeenCalledWith('open');
      });

      it('calls onToggle with "open"', () => {
        expect(onToggle).toHaveBeenCalledWith('open');
      });
    });
  });

  describe('schedule detection', () => {
    it('renders DetailsFlyout when attack discovery has alertRuleUuid that is not ad-hoc', async () => {
      const discoveryWithSchedule = {
        ...mockRawResponse,
        alertRuleUuid: 'scheduled-rule-id',
      };

      render(
        <TestWrapper>
          <Title {...defaultProps} attackDiscovery={discoveryWithSchedule} />
        </TestWrapper>
      );

      // Click the schedule button to open the flyout
      await userEvent.click(screen.getByTestId('scheduleButton'));

      expect(screen.getByTestId('detailsFlyout')).toHaveTextContent('scheduled-rule-id');
    });

    it('does NOT render the schedule button when attack discovery has no alertRuleUuid', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('scheduleButton')).not.toBeInTheDocument();
    });

    it('handles an attack discovery without an id when a checkbox is clicked', async () => {
      const setIsSelected = jest.fn();
      const discoveryWithoutId = { ...mockRawResponse, id: undefined };
      render(
        <TestWrapper>
          <Title
            {...defaultProps}
            attackDiscovery={discoveryWithoutId}
            setIsSelected={setIsSelected}
          />
        </TestWrapper>
      );

      await userEvent.click(screen.getByTestId('attackDiscoveryCheckbox'));

      expect(setIsSelected).not.toHaveBeenCalled();
    });

    it('renders the schedule button for a scheduled attack discovery', () => {
      const discoveryWithAlertRule = {
        ...mockRawResponse,
        alertRuleUuid: 'some-scheduled-rule-id',
      };
      render(
        <TestWrapper>
          <Title {...defaultProps} attackDiscovery={discoveryWithAlertRule} />
        </TestWrapper>
      );

      expect(screen.getByTestId('scheduleButton')).toBeInTheDocument();
    });

    it('handles the isSelected prop correctly', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} isSelected={true} />
        </TestWrapper>
      );

      const checkbox = screen.getByTestId('attackDiscoveryCheckbox');

      expect(checkbox).toBeChecked();
    });

    it('handles the isOpen prop correctly', () => {
      render(
        <TestWrapper>
          <Title {...defaultProps} isOpen="open" />
        </TestWrapper>
      );

      expect(screen.getByTestId('attackDiscoveryAccordion')).toBeInTheDocument();
    });
  });
});
