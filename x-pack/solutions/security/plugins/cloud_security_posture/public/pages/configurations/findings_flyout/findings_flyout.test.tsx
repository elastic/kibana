/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { CDR_MISCONFIGURATIONS_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useMisconfigurationFinding } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding';
import { TestProvider } from '../../../test/test_provider';
import { mockFindingsHit, mockWizFinding } from '../__mocks__/findings';
import { FindingMisconfigurationFlyoutContentProps } from '@kbn/cloud-security-posture';
import FindingsMisconfigurationFlyoutContent from './findings_right/content';
import FindingsMisconfigurationFlyoutFooter from './findings_right/footer';
import FindingsMisconfigurationFlyoutHeader from './findings_right/header';
import FindingsRuleFlyout from './findings_flyout';

const TestComponent = () => (
  <TestProvider>
    <FindingsRuleFlyout ruleId={'rule_id_test'} resourceId={'resource_id_test'}>
      {({ finding, createRuleFn }: FindingMisconfigurationFlyoutContentProps) => {
        return (
          <>
            <FindingsMisconfigurationFlyoutHeader finding={finding} />
            <FindingsMisconfigurationFlyoutContent finding={finding} />
            <FindingsMisconfigurationFlyoutFooter createRuleFn={createRuleFn} />
          </>
        );
      }}
    </FindingsRuleFlyout>
  </TestProvider>
);

jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_finding', () => ({
  useMisconfigurationFinding: jest.fn(),
}));

describe('<FindingsFlyout/>', () => {
  describe('Overview Tab', () => {
    it('should render the flyout with available data', async () => {
      (useMisconfigurationFinding as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });

      const { getAllByText, getByText } = render(<TestComponent />);

      getAllByText(mockFindingsHit.resource.name);
      getByText(mockFindingsHit.resource.id);
      getAllByText(mockFindingsHit.rule.section);
      getByText(CDR_MISCONFIGURATIONS_INDEX_PATTERN);
      mockFindingsHit.rule.tags.forEach((tag) => {
        getAllByText(tag);
      });
    });

    it('does not display missing info callout when data source is CSP', () => {
      (useMisconfigurationFinding as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });
      const { queryByText } = render(<TestComponent />);
      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });

  describe('Table Tab', () => {
    it('displays resource name and id', async () => {
      (useMisconfigurationFinding as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockFindingsHit }] } },
      });
      const { getAllByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_table'));

      getAllByText(mockFindingsHit.resource.name);
      getAllByText(mockFindingsHit.resource.id);
    });

    it('does not display missing info callout for 3Ps', async () => {
      (useMisconfigurationFinding as jest.Mock).mockReturnValue({
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
      (useMisconfigurationFinding as jest.Mock).mockReturnValue({
        data: { result: { hits: [{ _source: mockWizFinding }] } },
      });
      const { queryByText } = render(<TestComponent />);
      await userEvent.click(screen.getByTestId('findings_flyout_tab_json'));

      const missingInfoCallout = queryByText('Some fields not provided by Wiz');
      expect(missingInfoCallout).toBeNull();
    });
  });
});
