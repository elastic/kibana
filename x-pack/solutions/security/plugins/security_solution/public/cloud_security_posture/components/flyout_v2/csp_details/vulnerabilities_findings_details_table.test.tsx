/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.mock('@kbn/cloud-security-posture', () => ({
  useVulnerabilitiesFindings: jest.fn().mockReturnValue({ data: { page: [] }, isLoading: false }),
  getVulnerabilityStats: jest.fn().mockReturnValue([]),
  hasVulnerabilitiesData: jest.fn().mockReturnValue(false),
  SecuritySolutionLinkAnchor: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities', () => ({
  useHasVulnerabilities: jest.fn().mockReturnValue({ hasVulnerabilitiesFindings: false }),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params', () => ({
  useGetNavigationUrlParams: jest.fn().mockReturnValue(jest.fn().mockReturnValue('')),
}));

jest.mock('@kbn/cloud-security-posture/src/hooks/use_get_severity_status_color', () => ({
  useGetSeverityStatusColor: jest
    .fn()
    .mockReturnValue({ getSeverityStatusColor: jest.fn().mockReturnValue('#000') }),
}));

jest.mock('@kbn/entity-store/public', () => ({
  ...jest.requireActual('@kbn/entity-store/public'),
  useEntityStoreEuidApi: jest.fn().mockReturnValue({ euid: null }),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useUiSetting: jest.fn().mockReturnValue(false),
  useKibana: jest.fn().mockReturnValue({ services: {} }),
}));

jest.mock('../../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => ({
  useEntityFromStore: jest.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
}));

jest.mock('../../../../common/components/links', () => ({
  SecuritySolutionLinkAnchor: ({ children }: { children: React.ReactNode }) => (
    <a href="/">{children}</a>
  ),
}));

describe('VulnerabilitiesFindingsDetailsTable (v2)', () => {
  const mockOnShowVulnerability = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(
      <TestProviders>
        <VulnerabilitiesFindingsDetailsTable
          identityField="host.name"
          value="my-host"
          scopeId="scope-id"
          onShowVulnerability={mockOnShowVulnerability}
        />
      </TestProviders>
    );

    expect(getByTestId('securitySolutionFlyoutVulnerabilitiesFindingsTable')).toBeInTheDocument();
  });

  it('accepts required onShowVulnerability callback without throwing', () => {
    expect(() =>
      render(
        <TestProviders>
          <VulnerabilitiesFindingsDetailsTable
            identityField="host.name"
            value="my-host"
            scopeId="scope-id"
            entityId="host-entity-id"
            entityType="host"
            onShowVulnerability={mockOnShowVulnerability}
          />
        </TestProviders>
      )
    ).not.toThrow();
  });
});
