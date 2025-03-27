/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CDR_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import { FindingsRuleFlyout } from './findings_flyout';
import { render, screen } from '@testing-library/react';
import { useGetMisconfigurationFindings } from '@kbn/cloud-security-posture/src/hooks/use_get_misconfiguration_finding';
import { TestProvider } from '../../../test/test_provider';
import { mockFindingsHit, mockWizFinding } from '../__mocks__/findings';

const TestComponent = () => (
  <TestProvider>
    <FindingsRuleFlyout ruleId={'rule_id_test'} resourceId={'resource_id_test'} />
  </TestProvider>
);

jest.mock('@kbn/cloud-security-posture/src/hooks/use_get_misconfiguration_finding', () => ({
  useGetMisconfigurationFindings: jest.fn(),
}));

describe('<FindingsFlyout/>', () => {
  describe('Overview Tab', () => {
    it('should render loading state when finding data is not available', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({ data: undefined });

      const { getByTestId } = render(<TestComponent />);

      getByTestId('findingsFlyoutLoadingTest');
    });

    it('should render the flyout with available data', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });

      const { getAllByText, getByText } = render(<TestComponent />);

      getAllByText(mockFindingsHit.rule.name);
      getByText(mockFindingsHit.resource.id);
      getByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.rule.section);
      getByText(CDR_MISCONFIGURATIONS_INDEX_PATTERN);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });

    it('displays missing info callout when data source is not CSP', () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockWizFinding }] } },
      });
      const { getByText } = render(<TestComponent />);
      getByText('Some fields not provided by Wiz');
    });

    it('does not display missing info callout when data source is CSP', () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });
      const { queryByText } = render(<TestComponent />);
      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('Rule Tab', () => {
    it('displays rule text details', async () => {
      const { getByText, getAllByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      getAllByText(mockFindingsHit.rule.name);
      getByText(mockFindingsHit.rule.benchmark.name);
      getAllByText(mockFindingsHit.rule.section);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });

    it('displays missing info callout when data source is not CSP', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockWizFinding }] } },
      });
      const { getByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      getByText('Some fields not provided by Wiz');
    });

    it('does not display missing info callout when data source is CSP', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });
      const { queryByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_rule'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('Table Tab', () => {
    it('displays resource name and id', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });
      const { getAllByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_table'));

      getAllByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.resource.id);
    });

    it('does not display missing info callout for 3Ps', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockWizFinding }] } },
      });
      const { queryByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_table'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('JSON Tab', () => {
    it('does not display missing info callout for 3Ps', async () => {
      (useGetMisconfigurationFindings as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockWizFinding }] } },
      });
      const { queryByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_json'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });
});