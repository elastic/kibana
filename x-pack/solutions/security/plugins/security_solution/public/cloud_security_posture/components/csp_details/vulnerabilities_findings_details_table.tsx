/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import type { Criteria, EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { buildVulnerabilityEntityFlyoutPreviewQuery } from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import type {
  VulnerabilitiesFindingDetailFields,
  VulnerabilitiesPackage,
} from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings';
import {
  useVulnerabilitiesFindings,
  VULNERABILITY_FINDING,
} from '@kbn/cloud-security-posture/src/hooks/use_vulnerabilities_findings';
import type {
  FindingsVulnerabilityPanelExpandableFlyoutPropsPreview,
  MultiValueCellAction,
} from '@kbn/cloud-security-posture';
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
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

import { VulnerabilityFindingsPreviewPanelKey } from '../../../flyout/csp_details/vulnerabilities_flyout/constants';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import type { CloudPostureEntityIdentifier } from '../entity_insight';

type VulnerabilitySortFieldType =
  | 'score'
  | 'vulnerability'
  | 'resource'
  | VULNERABILITY_FINDING.SEVERITY
  | VULNERABILITY_FINDING.ID
  | VULNERABILITY_FINDING.PACKAGE_NAME
  | VULNERABILITY_FINDING.TITLE
  | 'event'
  | VULNERABILITY_FINDING.PACKAGE_VERSION;

const EMPTY_VALUE = '-';

export const VulnerabilitiesFindingsDetailsTable = memo(
  ({ value, scopeId }: { value: string; scopeId: string }) => {
    const { getSeverityStatusColor } = useGetSeverityStatusColor();

    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_VULNERABILITY_VIEW_VISITS
      );
    }, []);

    const [currentFilter, setCurrentFilter] = useState<string>('');
    const [sortField, setSortField] = useState<VulnerabilitySortFieldType>(
      VULNERABILITY_FINDING.SEVERITY
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { openPreviewPanel } = useExpandableFlyoutApi();

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
        pageOfItems = findings?.slice(
          startIndex,
          Math.min(startIndex + pageSize, findings?.length)
        );
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

    const getNavUrlParams: ReturnType<typeof useGetNavigationUrlParams> =
      useGetNavigationUrlParams();

    const getVulnerabilityUrl = (name: string, queryField: CloudPostureEntityIdentifier) => {
      return getNavUrlParams({ [queryField]: name }, 'vulnerabilities');
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
          <EuiButtonIcon
            iconType="expand"
            onClick={() => {
              const previewPanelProps: FindingsVulnerabilityPanelExpandableFlyoutPropsPreview = {
                id: VulnerabilityFindingsPreviewPanelKey,
                params: {
                  vulnerabilityId: vulnerability?.id,
                  resourceId: finding?.resource?.id,
                  packageName: finding?.[VULNERABILITY_FINDING.PACKAGE_NAME],
                  packageVersion: finding?.[VULNERABILITY_FINDING.PACKAGE_VERSION],
                  eventId: finding?.event?.id,
                  scopeId,
                  isPreviewMode: true,
                  banner: {
                    title: i18n.translate(
                      'xpack.securitySolution.flyout.right.vulnerabilityFinding.PreviewTitle',
                      {
                        defaultMessage: 'Preview vulnerability details',
                      }
                    ),
                    backgroundColor: 'warning',
                    textColor: 'warning',
                  },
                },
              };

              openPreviewPanel(previewPanelProps);
            }}
            aria-label={i18n.translate(
              'xpack.securitySolution.flyout.left.insights.vulnerability.table.previewDetailsButtonAriaLabel',
              {
                defaultMessage: 'Preview vulnerability details',
              }
            )}
          />
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
        field: VULNERABILITY_FINDING.TITLE,
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
        field: VULNERABILITY_FINDING.ID,
        render: (id: string, finding: VulnerabilitiesFindingDetailFields) =>
          renderMultiValueCell(VULNERABILITY_FINDING.ID, finding),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.vulnerability.table.vulnerabilityIdColumnName',
          { defaultMessage: 'CVE ID' }
        ),
        width: '20%',
        sortable: true,
      },
      {
        field: VULNERABILITY_FINDING.SEVERITY,
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
        field: VULNERABILITY_FINDING.PACKAGE_NAME,
        render: (packageName: string, finding: VulnerabilitiesFindingDetailFields) =>
          renderMultiValueCell(VULNERABILITY_FINDING.PACKAGE_NAME, finding),
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
            {i18n.translate(
              'xpack.securitySolution.flyout.left.insights.vulnerability.tableTitle',
              {
                defaultMessage: 'Vulnerability ',
              }
            )}
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
            tableCaption={i18n.translate(
              'xpack.securitySolution.flyout.left.insights.vulnerability.findingsTableCaption',
              {
                defaultMessage: 'List of vulnerability findings',
              }
            )}
          />
        </EuiPanel>
      </>
    );
  }
);

VulnerabilitiesFindingsDetailsTable.displayName = 'VulnerabilitiesFindingsDetailsTable';
