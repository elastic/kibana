/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import type { Criteria, EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildVulnerabilityEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import type {
  VulnerabilitiesFindingDetailFields,
  VulnerabilitiesPackage,
} from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings';
import {
  useVulnerabilitiesFindings,
  VULNERABILITY,
} from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings';
import type { MultiValueCellAction } from '@kbn/cloud-security-posture';
import {
  getVulnerabilityStats,
  CVSScoreBadge,
  SeverityStatusBadge,
  getNormalizedSeverity,
  ActionableBadge,
  MultiValueCellPopover,
  findReferenceLink,
} from '@kbn/cloud-security-posture';
import {
  ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS,
  NAV_TO_FINDINGS_BY_HOST_NAME_FROM_ENTITY_FLYOUT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { useGetSeverityStatusColor } from '@kbn/cloud-security-posture/src/hooks/use_get_severity_status_color';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { get } from 'lodash/fp';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import type { CloudPostureEntityIdentifier } from '../entity_insight';

type VulnerabilitySortFieldType =
  | 'score'
  | 'vulnerability'
  | 'resource'
  | VULNERABILITY.SEVERITY
  | VULNERABILITY.ID
  | VULNERABILITY.PACKAGE_NAME
  | VULNERABILITY.TITLE;

const EMPTY_VALUE = '-';

export const VulnerabilitiesFindingsDetailsTable = memo(({ value }: { value: string }) => {
  const { getSeverityStatusColor } = useGetSeverityStatusColor();

  useEffect(() => {
    uiMetricService.trackUiMetric(
      METRIC_TYPE.COUNT,
      ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS
    );
  }, []);

  const [currentFilter, setCurrentFilter] = useState<string>('');
  const [sortField, setSortField] = useState<VulnerabilitySortFieldType>(VULNERABILITY.SEVERITY);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortFieldDirection: { [key: string]: string } = {};
  sortFieldDirection[sortField === 'score' ? 'vulnerability.score.base' : sortField] =
    sortDirection;

  const sorting: EuiTableSortingType<VulnerabilitiesFindingDetailFields> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const { data } = useVulnerabilitiesFindings({
    query: buildVulnerabilityEntityFlyoutPreviewQuery('host.name', value, currentFilter),
    sort: [sortFieldDirection],
    enabled: true,
    pageSize: 1,
  });

  const { counts } = useHasVulnerabilities('host.name', value);

  const { critical = 0, high = 0, medium = 0, low = 0, none = 0 } = counts || {};

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const findingsPagination = (findings: VulnerabilitiesFindingDetailFields[]) => {
    let pageOfItems;

    if (!pageIndex && !pageSize) {
      pageOfItems = findings;
    } else {
      const startIndex = pageIndex * pageSize;
      pageOfItems = findings?.slice(startIndex, Math.min(startIndex + pageSize, findings?.length));
    }

    return {
      pageOfItems,
      totalItemCount: findings?.length,
    };
  };

  const { pageOfItems, totalItemCount } = findingsPagination(data?.rows || []);

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 25, 100],
  };

  const onTableChange = ({ page, sort }: Criteria<VulnerabilitiesFindingDetailFields>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
    if (sort) {
      const { field: fieldSort, direction } = sort;
      setSortField(fieldSort);
      setSortDirection(direction);
    }
  };

  const getNavUrlParams: ReturnType<typeof useGetNavigationUrlParams> = useGetNavigationUrlParams();

  const getVulnerabilityUrl = (name: string, queryField: CloudPostureEntityIdentifier) => {
    return getNavUrlParams({ [queryField]: name }, 'vulnerabilities');
  };

  const getVulnerabilityUrlFilteredByVulnerabilityAndResourceId = (
    vulnerabilityId: string | string[],
    resourceId: string,
    packageName: string,
    packageVersion: string
  ) => {
    return getNavUrlParams(
      {
        'vulnerability.id': vulnerabilityId,
        'resource.id': resourceId,
        'package.name': encodeURIComponent(packageName),
        'package.version': encodeURIComponent(packageVersion),
      },
      'vulnerabilities'
    );
  };

  const vulnerabilityStats = getVulnerabilityStats(
    {
      critical,
      high,
      medium,
      low,
      none,
    },
    getSeverityStatusColor,
    setCurrentFilter,
    currentFilter
  );

  const renderItem = useCallback(
    (item: string, i: number, field: string, object: VulnerabilitiesFindingDetailFields) => {
      const references = Array.isArray(object.vulnerability.reference)
        ? object.vulnerability.reference
        : [object.vulnerability.reference];

      const url = findReferenceLink(references, item);

      const actions: MultiValueCellAction[] = [
        ...(field === 'vulnerability.id' && url
          ? [
              {
                onClick: () => window.open(url, '_blank'),
                iconType: 'popout',
                ariaLabel: i18n.translate(
                  'xpack.securitySolution.vulnerabilities.findingsDetailsTable.openUrlInWindow',
                  {
                    defaultMessage: 'Open URL in window',
                  }
                ),
                title: i18n.translate(
                  'xpack.securitySolution.vulnerabilities.findingsDetailsTable.openUrlInWindow',
                  {
                    defaultMessage: 'Open URL in window',
                  }
                ),
              },
            ]
          : []),
      ];

      return <ActionableBadge key={`${item}-${i}`} item={item} index={i} actions={actions} />;
    },
    []
  );

  const renderMultiValueCell = (field: string, finding: VulnerabilitiesFindingDetailFields) => {
    const cellValue = get(field, finding);
    if (!Array.isArray(cellValue)) {
      return <EuiText size="s">{cellValue || EMPTY_VALUE}</EuiText>;
    }

    return (
      <MultiValueCellPopover<VulnerabilitiesFindingDetailFields>
        items={cellValue}
        field={field}
        object={finding}
        renderItem={renderItem}
        firstItemRenderer={(item) => <EuiText size="s">{item}</EuiText>}
      />
    );
  };

  const columns: Array<EuiBasicTableColumn<VulnerabilitiesFindingDetailFields>> = [
    {
      field: 'vulnerability',
      name: '',
      width: '5%',
      render: (
        vulnerability: VulnerabilitiesPackage,
        finding: VulnerabilitiesFindingDetailFields
      ) => (
        <SecuritySolutionLinkAnchor
          deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
          path={`${getVulnerabilityUrlFilteredByVulnerabilityAndResourceId(
            vulnerability?.id,
            finding?.resource?.id || '',
            vulnerability?.package?.name,
            vulnerability?.package?.version
          )}`}
          target={'_blank'}
          external={false}
        >
          <EuiIcon type={'popout'} />
        </SecuritySolutionLinkAnchor>
      ),
    },
    {
      field: 'score',
      render: (score: { version?: string; base?: number }) => (
        <EuiText size="s">
          <CVSScoreBadge version={score?.version} score={score?.base} />
        </EuiText>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'CVSS' }
      ),
      width: '10%',
      sortable: true,
    },
    {
      field: VULNERABILITY.TITLE,
      render: (title: string) => {
        if (Array.isArray(title)) {
          return <EuiText size="s">{title.join(', ')}</EuiText>;
        }

        return <EuiText size="s">{title || EMPTY_VALUE}</EuiText>;
      },
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.vulnerabilityTitleColumnName',
        { defaultMessage: 'Vulnerability Title' }
      ),
      width: '25%',
      sortable: true,
    },
    {
      field: VULNERABILITY.ID,
      render: (id: string, finding: VulnerabilitiesFindingDetailFields) =>
        renderMultiValueCell(VULNERABILITY.ID, finding),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.vulnerabilityIdColumnName',
        { defaultMessage: 'CVE ID' }
      ),
      width: '20%',
      sortable: true,
    },
    {
      field: VULNERABILITY.SEVERITY,
      render: (severity: string) => (
        <>
          <EuiText size="s">
            <SeverityStatusBadge severity={getNormalizedSeverity(severity)} />
          </EuiText>
        </>
      ),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'Severity' }
      ),
      width: '10%',
      sortable: true,
    },
    {
      field: VULNERABILITY.PACKAGE_NAME,
      render: (packageName: string, finding: VulnerabilitiesFindingDetailFields) =>
        renderMultiValueCell(VULNERABILITY.PACKAGE_NAME, finding),
      name: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.vulnerability.table.ruleColumnName',
        { defaultMessage: 'Package' }
      ),
      width: '30%',
      sortable: true,
    },
  ];

  return (
    <>
      <EuiPanel hasShadow={false}>
        <SecuritySolutionLinkAnchor
          deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
          path={`${getVulnerabilityUrl(value, EntityIdentifierFields.hostName)}`}
          target={'_blank'}
          external={false}
          onClick={() => {
            uiMetricService.trackUiMetric(
              METRIC_TYPE.CLICK,
              NAV_TO_FINDINGS_BY_HOST_NAME_FROM_ENTITY_FLYOUT
            );
          }}
        >
          {i18n.translate('xpack.securitySolution.flyout.left.insights.vulnerability.tableTitle', {
            defaultMessage: 'Vulnerability ',
          })}
          <EuiIcon type={'popout'} />
        </SecuritySolutionLinkAnchor>
        <EuiSpacer size="xl" />
        <DistributionBar stats={vulnerabilityStats} />
        <EuiSpacer size="l" />
        <EuiBasicTable
          items={pageOfItems || []}
          rowHeader="result"
          columns={columns}
          pagination={pagination}
          onChange={onTableChange}
          data-test-subj={'securitySolutionFlyoutVulnerabilitiesFindingsTable'}
          sorting={sorting}
        />
      </EuiPanel>
    </>
  );
});

VulnerabilitiesFindingsDetailsTable.displayName = 'VulnerabilitiesFindingsDetailsTable';
