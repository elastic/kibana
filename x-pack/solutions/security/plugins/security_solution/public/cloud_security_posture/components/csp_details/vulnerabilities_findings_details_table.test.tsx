/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';
import { TestProviders } from '../../../common/mock/test_providers';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';

vi.mock('@kbn/cloud-security-posture-common/utils/ui_metrics', () => {
      const mocked = {
      uiMetricService: { trackUiMetric: vi.fn() },
      ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS: 'visit',
      NAV_TO_FINDINGS_BY_HOST_NAME_FROM_ENTITY_FLYOUT: 'host_nav',
    };
      return { ...mocked, default: mocked };
    });

const finding = {
  vulnerability: { id: 'CVE-1' },
  resource: { id: 'resource-1' },
  event: { id: 'event-1' },
};

vi.mock('@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings', () => {
      const mocked = {
      useVulnerabilitiesFindings: vi
        .fn()
        .mockReturnValue({ data: { rows: [finding] }, isLoading: false }),
      VULNERABILITY_FINDING: {
        ID: 'vulnerability.id',
        SEVERITY: 'vulnerability.severity',
        PACKAGE_NAME: 'package.name',
        PACKAGE_VERSION: 'package.version',
        TITLE: 'vulnerability.title',
      },
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture', () => {
      const mocked = {
      getVulnerabilityStats: vi.fn().mockReturnValue([]),
      getNormalizedSeverity: vi.fn((severity: string) => severity),
      findReferenceLink: vi.fn().mockReturnValue(''),
      CVSScoreBadge: () => null,
      SeverityStatusBadge: () => null,
      ActionableBadge: () => null,
      MultiValueCellPopover: () => null,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params', () => {
      const mocked = {
      useGetNavigationUrlParams: vi.fn().mockReturnValue(vi.fn().mockReturnValue('')),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture/src/hooks/use_get_severity_status_color', () => {
      const mocked = {
      useGetSeverityStatusColor: vi
        .fn()
        .mockReturnValue({ getSeverityStatusColor: vi.fn().mockReturnValue('#000') }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities', () => {
      const mocked = {
      useHasVulnerabilities: vi
        .fn()
        .mockReturnValue({ counts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 } }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/entity-store/public', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/entity-store/public')),
      useEntityStoreEuidApi: vi.fn().mockReturnValue({ euid: null }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/lib/kibana', () => {
      const mocked = {
      useUiSetting: vi.fn().mockReturnValue(false),
      useKibana: vi.fn().mockReturnValue({ services: {} }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../flyout/entity_details/shared/hooks/use_entity_from_store', () => {
      const mocked = {
      useEntityFromStore: vi.fn().mockReturnValue({ entityRecord: null, isLoading: false }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/components/links', () => {
      const mocked = {
      SecuritySolutionLinkAnchor: ({ children }: { children: React.ReactNode }) => (
        <a href="/">{children}</a>
      ),
    };
      return { ...mocked, default: mocked };
    });

const renderTable = (
  onShowVulnerability: (params: {
    vulnerabilityId: string;
    resourceId: string;
    packageName: string;
    packageVersion: string;
    eventId: string;
  }) => void
) =>
  render(
    <TestProviders>
      <VulnerabilitiesFindingsDetailsTable
        identityField={EntityIdentifierFields.hostName}
        value="my-host"
        onShowVulnerability={onShowVulnerability}
      />
    </TestProviders>
  );

describe('VulnerabilitiesFindingsDetailsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes onShowVulnerability with the row identifiers when the preview action is clicked', () => {
    const onShowVulnerability = vi.fn();
    renderTable(onShowVulnerability);

    fireEvent.click(screen.getByRole('button', { name: 'Preview vulnerability details' }));

    expect(onShowVulnerability).toHaveBeenCalledWith(
      expect.objectContaining({
        vulnerabilityId: 'CVE-1',
        resourceId: 'resource-1',
        eventId: 'event-1',
      })
    );
  });
});
