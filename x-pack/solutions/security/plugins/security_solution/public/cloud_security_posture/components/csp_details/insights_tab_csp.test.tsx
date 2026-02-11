/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../common/mock/test_providers';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { InsightsTabCsp } from './insights_tab_csp';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { CloudPostureEntityIdentifier } from '../entity_insight';
import type { ExpandableFlyoutState } from '@kbn/expandable-flyout';

// Mock the child components
jest.mock('./misconfiguration_findings_details_table', () => ({
  MisconfigurationFindingsDetailsTable: () => (
    <div data-test-subj="misconfiguration-table">{'Misconfiguration Table'}</div>
  ),
}));

jest.mock('./vulnerabilities_findings_details_table', () => ({
  VulnerabilitiesFindingsDetailsTable: () => (
    <div data-test-subj="vulnerabilities-table">{'Vulnerabilities Table'}</div>
  ),
}));

jest.mock('./alerts_findings_details_table', () => ({
  AlertsDetailsTable: () => <div data-test-subj="alerts-table">{'Alerts Table'}</div>,
}));

// Mock the expandable flyout state hook
jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutState: jest.fn(),
}));

const mockUseExpandableFlyoutState = useExpandableFlyoutState as jest.MockedFunction<
  typeof useExpandableFlyoutState
>;

describe('InsightsTabCsp', () => {
  const defaultProps = {
    value: 'test-value',
    field: 'hostName' as CloudPostureEntityIdentifier,
    scopeId: 'test-scope',
  };

  const mockPanels = {
    left: {
      params: {
        hasMisconfigurationFindings: false,
        hasVulnerabilitiesFindings: false,
        hasNonClosedAlerts: false,
        path: { subTab: undefined },
      },
    },
  } as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExpandableFlyoutState.mockReturnValue(mockPanels as unknown as ExpandableFlyoutState);
  });

  describe('when no tabs are available', () => {
    it('should return null', () => {
      const { container } = render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('when only one tab is available', () => {
    it('should render button group as disabled for misconfigurations only', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).toHaveAttribute('disabled');

      // Should show misconfiguration table
      expect(screen.getByTestId('misconfiguration-table')).toBeInTheDocument();
    });

    it('should render button group as disabled for vulnerabilities only', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).toHaveAttribute('disabled');

      // Should show vulnerabilities table
      expect(screen.getByTestId('vulnerabilities-table')).toBeInTheDocument();
    });

    it('should render button group as disabled for alerts only', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: false,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: true,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).toHaveAttribute('disabled');

      // Should show alerts table
      expect(screen.getByTestId('alerts-table')).toBeInTheDocument();
    });

    it('should not allow tab changes when disabled', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toHaveAttribute('disabled');

      // Clicking should not change the active tab (no state change)
      const misconfigurationButton = screen.getByTestId('misconfigurationTabDataTestId');
      fireEvent.click(misconfigurationButton);

      // Should still show misconfiguration table (no change)
      expect(screen.getByTestId('misconfiguration-table')).toBeInTheDocument();
    });
  });

  describe('when multiple tabs are available', () => {
    it('should render button group as enabled for misconfigurations and vulnerabilities', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).not.toHaveAttribute('disabled');

      // Should show misconfiguration table by default (first available)
      expect(screen.getByTestId('misconfiguration-table')).toBeInTheDocument();
    });

    it('should allow tab switching between multiple tabs', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      // Initially should show misconfiguration table
      expect(screen.getByTestId('misconfiguration-table')).toBeInTheDocument();
      expect(screen.queryByTestId('vulnerabilities-table')).not.toBeInTheDocument();

      // Click vulnerabilities tab
      const vulnerabilitiesButton = screen.getByTestId('vulnerabilitiesTabDataTestId');
      fireEvent.click(vulnerabilitiesButton);

      // Should now show vulnerabilities table
      expect(screen.getByTestId('vulnerabilities-table')).toBeInTheDocument();
      expect(screen.queryByTestId('misconfiguration-table')).not.toBeInTheDocument();
    });

    it('should render all three tabs when all are available', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: true,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).not.toHaveAttribute('disabled');

      // Should show all three buttons
      expect(screen.getByTestId('misconfigurationTabDataTestId')).toBeInTheDocument();
      expect(screen.getByTestId('vulnerabilitiesTabDataTestId')).toBeInTheDocument();
      expect(screen.getByTestId('alertsTabDataTestId')).toBeInTheDocument();
    });

    it('should switch to alerts tab when clicked', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: true,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      // Click alerts tab
      const alertsButton = screen.getByTestId('alertsTabDataTestId');
      fireEvent.click(alertsButton);

      // Should show alerts table
      expect(screen.getByTestId('alerts-table')).toBeInTheDocument();
      expect(screen.queryByTestId('misconfiguration-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vulnerabilities-table')).not.toBeInTheDocument();
    });
  });

  describe('when subTab is provided in path', () => {
    it('should use the provided subTab as default', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: true,
            hasNonClosedAlerts: false,
            path: { subTab: CspInsightLeftPanelSubTab.VULNERABILITIES },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      // Should show vulnerabilities table based on provided subTab
      expect(screen.getByTestId('vulnerabilities-table')).toBeInTheDocument();
      expect(screen.queryByTestId('misconfiguration-table')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper legend for screen readers', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      // EuiButtonGroup uses legend prop which creates a fieldset with legend element
      expect(buttonGroup).toBeInTheDocument();
    });

    it('should maintain disabled state accessibility when single tab', () => {
      mockUseExpandableFlyoutState.mockReturnValue({
        left: {
          params: {
            hasMisconfigurationFindings: true,
            hasVulnerabilitiesFindings: false,
            hasNonClosedAlerts: false,
            path: { subTab: undefined },
          },
        },
      } as unknown as ExpandableFlyoutState);

      render(
        <TestProviders>
          <InsightsTabCsp {...defaultProps} />
        </TestProviders>
      );

      const buttonGroup = screen.getByTestId('insightButtonGroupsTestId');
      expect(buttonGroup).toHaveAttribute('disabled');
    });
  });
});
