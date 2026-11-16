/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { useMisconfigurationPreview } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview';
import { useVulnerabilitiesPreview } from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview';
import { TestProviders } from '../../../../common/mock';
import { HostEntityOverview } from './host_entity_overview';
import type { HostEntity } from '../../../../../common/api/entity_analytics';
import {
  ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID,
} from './test_ids';
import { mockContextValue } from '../../../../flyout/document_details/shared/mocks/mock_context';
import { mockDataFormattedForFieldBrowser } from '../../../../flyout/document_details/shared/mocks/mock_data_formatted_for_field_browser';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { useAlertsByStatus } from '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status';

const hostName = 'host';
const identityFields = { 'host.name': hostName };
const osFamily = 'Windows';
const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.;000Z';
const hostEntityRecord = { host: { os: { family: [osFamily] } } } as unknown as HostEntity;
const riskLevel = [{ host: { risk: { calculated_level: 'Medium' } } }];

const panelContextValue = {
  ...mockContextValue,
  dataFormattedForFieldBrowser: mockDataFormattedForFieldBrowser,
};

jest.mock('@kbn/cloud-security-posture/src/hooks/use_misconfiguration_preview');
jest.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_preview');

jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock(
  '../../../../overview/components/detection_response/alerts_by_status/use_alerts_by_status'
);
const mockAlertData = {
  open: {
    total: 2,
    severities: [
      { key: 'high', value: 1, label: 'High' },
      { key: 'low', value: 1, label: 'Low' },
    ],
  },
};

const mockedTelemetry = createTelemetryServiceMock();
jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        telemetry: mockedTelemetry,
      },
    }),
  };
});

const mockUseGlobalTime = jest.fn().mockReturnValue({ from, to });
jest.mock('../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

const mockUseRiskScore = useRiskScore as jest.Mock;
jest.mock('../../../../entity_analytics/api/hooks/use_risk_score');

const renderHostEntityContent = (
  extraProps: Partial<React.ComponentProps<typeof HostEntityOverview>> = {}
) =>
  render(
    <TestProviders>
      <HostEntityOverview
        hostName={hostName}
        identityFields={identityFields}
        scopeId={panelContextValue.scopeId}
        {...extraProps}
      />
    </TestProviders>
  );

describe('<HostEntityContent />', () => {
  beforeAll(() => {
    (useMisconfigurationPreview as jest.Mock).mockReturnValue({});
    (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({});
    (useAlertsByStatus as jest.Mock).mockReturnValue({ isLoading: false, items: {} });
  });

  describe('license is valid', () => {
    it('should render os family and host risk level', () => {
      mockUseRiskScore.mockReturnValue({ data: riskLevel });

      const { getByTestId } = renderHostEntityContent({ entityRecord: hostEntityRecord });

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent(osFamily);
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toBeInTheDocument();
    });

    it('should render correctly if returned data is null', () => {
      mockUseRiskScore.mockReturnValue({ data: null });

      const { getByTestId } = renderHostEntityContent();

      expect(getByTestId(ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID)).toHaveTextContent('—');
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID)).toHaveTextContent('—');
    });
  });

  it('should render loading if loading for risk score is true', () => {
    mockUseRiskScore.mockReturnValue({ data: null, loading: true });

    const { getByTestId } = render(
      <TestProviders>
        <HostEntityOverview
          hostName={hostName}
          identityFields={identityFields}
          scopeId={panelContextValue.scopeId}
        />
      </TestProviders>
    );
    expect(getByTestId(ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID)).toBeInTheDocument();
  });

  describe('entity links', () => {
    it('renders the host name as plain text by default (Flyout v2 / Discover)', () => {
      mockUseRiskScore.mockReturnValue({ data: riskLevel });

      const { getByTestId } = renderHostEntityContent();

      const container = getByTestId(ENTITIES_HOST_OVERVIEW_LINK_TEST_ID);
      expect(container).toHaveTextContent(hostName);
      expect(container.querySelector('a, button')).toBeNull();
      container.click();
    });
  });

  describe('distribution bar insights', () => {
    beforeEach(() => {
      mockUseRiskScore.mockReturnValue({ data: riskLevel });
    });

    it('should not render if no data is available', () => {
      const { queryByTestId } = renderHostEntityContent();
      expect(
        queryByTestId(ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID)
      ).not.toBeInTheDocument();
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID)).not.toBeInTheDocument();
      expect(queryByTestId(ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID)).not.toBeInTheDocument();
    });

    it('should render alert count when data is available', () => {
      (useAlertsByStatus as jest.Mock).mockReturnValue({
        isLoading: false,
        items: mockAlertData,
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID)).toBeInTheDocument();
    });

    it('should render misconfiguration when data is available', () => {
      (useMisconfigurationPreview as jest.Mock).mockReturnValue({
        data: { count: { passed: 1, failed: 2 } },
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID)).toBeInTheDocument();
    });

    it('should render vulnerabilities when data is available', () => {
      (useVulnerabilitiesPreview as jest.Mock).mockReturnValue({
        data: { count: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 0, UNKNOWN: 0 } },
      });

      const { getByTestId } = renderHostEntityContent();
      expect(getByTestId(ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID)).toBeInTheDocument();
    });
  });
});
