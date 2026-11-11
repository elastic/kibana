/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
// Necessary until components being tested are migrated of styled-components https://github.com/elastic/kibana/issues/219037
import 'jest-styled-components';
import { TestProviders } from '../../../common/mock';

import { HostOverview } from '.';
import { mockData } from './mock';
import { mockAnomalies } from '../../../common/components/ml/mock';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { OpenFlyoutLinkProps } from '../../../flyout_v2/shared/components/open_flyout_link';
import { FLYOUT_LINK_TEST_ID } from '../../../flyout/shared/components/test_ids';

const defaultProps = {
  data: undefined,
  inspect: null,
  refetch: () => {},
  hasEngineBeenInstalled: true,
  isAuthorized: true,
  loading: true,
};

const mockOpenFlyoutLink = jest.fn();
jest.mock('../../../flyout_v2/shared/components/open_flyout_link', () => {
  const actual = jest.requireActual('../../../flyout_v2/shared/components/open_flyout_link');
  return {
    ...actual,
    OpenFlyoutLink: (props: OpenFlyoutLinkProps) => {
      mockOpenFlyoutLink(props);
      return <actual.OpenFlyoutLink {...props} />;
    },
  };
});

jest.mock('../../../entity_analytics/api/hooks/use_risk_score');

const mockUseRiskScore = useRiskScore as jest.Mock;

describe('Host Summary Component', () => {
  const mockProps = {
    anomaliesData: mockAnomalies,
    data: mockData.Hosts.edges[0].node,
    endDate: '2019-06-18T06:00:00.000Z',
    id: 'hostOverview',
    indexNames: [],
    isInDetailsSidePanel: false,
    isLoadingAnomaliesData: false,
    loading: false,
    narrowDateRange: jest.fn(),
    startDate: '2019-06-15T06:00:00.000Z',
    hostName: 'testHostName',
    jobNameById: {},
    scopeId: 'default',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRiskScore.mockReturnValue({ ...defaultProps, hasEngineBeenInstalled: false });
  });

  test('it renders the default Host Summary', () => {
    const { container } = render(
      <TestProviders>
        <HostOverview {...mockProps} />
      </TestProviders>
    );

    expect(container.children[0]).toMatchSnapshot();
  });

  test('it renders the panel view Host Summary', () => {
    const panelViewProps = {
      ...mockProps,
      isInDetailsSidePanel: true,
    };

    const { container } = render(
      <TestProviders>
        <HostOverview {...panelViewProps} />
      </TestProviders>
    );

    expect(container.children[0]).toMatchSnapshot();
  });

  test('it renders host risk score and level', () => {
    const panelViewProps = {
      ...mockProps,
      isInDetailsSidePanel: true,
    };
    const risk = 'very high host risk';
    const riskScore = 9999999;
    mockUseRiskScore.mockReturnValue({
      ...defaultProps,
      loading: false,
      data: [
        {
          host: {
            name: 'testHostname',
            risk: {
              rule_risks: [],
              calculated_score_norm: riskScore,
              calculated_level: risk,
            },
          },
        },
      ],
    });

    const { getByTestId } = render(
      <TestProviders>
        <HostOverview {...panelViewProps} />
      </TestProviders>
    );

    expect(getByTestId('host-risk-overview')).toHaveTextContent(risk);
    expect(getByTestId('host-risk-overview')).toHaveTextContent(riskScore.toString());
  });

  test('it renders host id', () => {
    const { container } = render(
      <TestProviders>
        <HostOverview {...mockProps} data={mockData.Hosts.edges[0].node} />
      </TestProviders>
    );
    expect(container).toHaveTextContent('aa7ca589f1b8220002f2fc61c64cfbf1');
  });

  test('it links the IP addresses to the network flyout', () => {
    const { getAllByTestId } = render(
      <TestProviders>
        <HostOverview {...mockProps} />
      </TestProviders>
    );

    expect(mockOpenFlyoutLink).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'host.ip', value: '10.142.0.7' })
    );
    expect(getAllByTestId(FLYOUT_LINK_TEST_ID)[0]).toHaveTextContent('10.142.0.7');
  });
});
