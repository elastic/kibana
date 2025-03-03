/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import type { Criteria, EuiBasicTableColumn, EuiTableSortingType } from '@elastic/eui';
import { EuiSpacer, EuiPanel, EuiText, EuiBasicTable, EuiIcon } from '@elastic/eui';
import type { MisconfigurationFindingDetailFields } from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_findings';
import {
  useMisconfigurationFindings,
  MISCONFIGURATION,
} from '@kbn/cloud-security-posture/src/hooks/use_misconfiguration_findings';
import { i18n } from '@kbn/i18n';
import type { CspFindingResult } from '@kbn/cloud-security-posture-common';
import {
  MISCONFIGURATION_STATUS,
  buildMisconfigurationEntityFlyoutPreviewQuery,
} from '@kbn/cloud-security-posture-common';
import { DistributionBar } from '@kbn/security-solution-distribution-bar';
import type { CspBenchmarkRuleMetadata } from '@kbn/cloud-security-posture-common/schema/rules/latest';
import { CspEvaluationBadge, getMisconfigurationStatusColor } from '@kbn/cloud-security-posture';

import {
  ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS,
  NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT,
  NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';
import { useGetNavigationUrlParams } from '@kbn/cloud-security-posture/src/hooks/use_get_navigation_url_params';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { SecuritySolutionLinkAnchor } from '../../../common/components/links';
import type { CloudPostureEntityIdentifier } from '../entity_insight';

type MisconfigurationSortFieldType =
  | MISCONFIGURATION.RESULT_EVALUATION
  | MISCONFIGURATION.RULE_NAME
  | 'resource'
  | 'rule';

const getFindingsStats = (
  passedFindingsStats: number,
  failedFindingsStats: number,
  filterFunction: (filter: string) => void,
  currentFilter: string
) => {
  if (passedFindingsStats === 0 && failedFindingsStats === 0) return [];
  return [
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.passedFindingsText',
        {
          defaultMessage: 'Passed findings',
        }
      ),
      count: passedFindingsStats,
      color: getMisconfigurationStatusColor(MISCONFIGURATION_STATUS.PASSED),
      filter: () => {
        filterFunction(MISCONFIGURATION_STATUS.PASSED);
      },
      isCurrentFilter: currentFilter === MISCONFIGURATION_STATUS.PASSED,
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        filterFunction('');
        event?.stopPropagation();
      },
    },
    {
      key: i18n.translate(
        'xpack.securitySolution.flyout.right.insights.misconfigurations.failedFindingsText',
        {
          defaultMessage: 'Failed findings',
        }
      ),
      count: failedFindingsStats,
      color: getMisconfigurationStatusColor(MISCONFIGURATION_STATUS.FAILED),
      filter: () => {
        filterFunction(MISCONFIGURATION_STATUS.FAILED);
      },
      isCurrentFilter: currentFilter === MISCONFIGURATION_STATUS.FAILED,
      reset: (event: React.MouseEvent<SVGElement, MouseEvent>) => {
        filterFunction('');
        event?.stopPropagation();
      },
    },
  ];
};

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const MisconfigurationFindingsDetailsTable = memo(
  ({ field, value }: { field: CloudPostureEntityIdentifier; value: string }) => {
    useEffect(() => {
      uiMetricService.trackUiMetric(
        METRIC_TYPE.COUNT,
        ENTITY_FLYOUT_EXPAND_MISCONFIGURATION_VIEW_VISITS
      );
    }, []);

    const [currentFilter, setCurrentFilter] = useState<string>('');

    const [sortField, setSortField] = useState<MisconfigurationSortFieldType>(
      MISCONFIGURATION.RESULT_EVALUATION
    );
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const sortFieldDirection: { [key: string]: string } = {};
    sortFieldDirection[sortField] = sortDirection;

    const { data } = useMisconfigurationFindings({
      query: buildMisconfigurationEntityFlyoutPreviewQuery(field, value, currentFilter),
      sort: [sortFieldDirection],
      enabled: true,
      pageSize: 1,
    });

    const { passedFindings, failedFindings } = useHasMisconfigurations(field, value);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const sorting: EuiTableSortingType<MisconfigurationFindingDetailFields> = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const findingsPagination = (findings: MisconfigurationFindingDetailFields[]) => {
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
    const onTableChange = useCallback(
      ({ page, sort }: Criteria<MisconfigurationFindingDetailFields>) => {
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
      },
      []
    );

    const getNavUrlParams = useGetNavigationUrlParams();

    const getFindingsPageUrlFilteredByRuleAndResourceId = (ruleId: string, resourceId: string) => {
      return getNavUrlParams({ 'rule.id': ruleId, 'resource.id': resourceId }, 'configurations');
    };

    const getFindingsPageUrl = (name: string, queryField: CloudPostureEntityIdentifier) => {
      return getNavUrlParams({ [queryField]: name }, 'configurations', ['rule.name']);
    };

    const linkWidth = 40;
    const resultWidth = 74;

    const misconfigurationStats = getFindingsStats(
      passedFindings,
      failedFindings,
      setCurrentFilter,
      currentFilter
    );

    const columns: Array<EuiBasicTableColumn<MisconfigurationFindingDetailFields>> = [
      {
        field: 'rule',
        name: '',
        width: `${linkWidth}`,
        render: (rule: CspBenchmarkRuleMetadata, finding: MisconfigurationFindingDetailFields) => (
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
            path={`${getFindingsPageUrlFilteredByRuleAndResourceId(
              rule?.id,
              finding?.resource?.id
            )}`}
            target={'_blank'}
            external={false}
            onClick={() => {
              uiMetricService.trackUiMetric(
                METRIC_TYPE.CLICK,
                NAV_TO_FINDINGS_BY_RULE_NAME_FRPOM_ENTITY_FLYOUT
              );
            }}
          >
            <EuiIcon type={'popout'} />
          </SecuritySolutionLinkAnchor>
        ),
      },
      {
        field: MISCONFIGURATION.RESULT_EVALUATION,
        render: (result: CspFindingResult['evaluation'] | undefined) => (
          <CspEvaluationBadge type={result} />
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.resultColumnName',
          {
            defaultMessage: 'Result',
          }
        ),
        width: `${resultWidth}px`,
        sortable: true,
      },
      {
        field: MISCONFIGURATION.RULE_NAME,
        render: (ruleName: CspBenchmarkRuleMetadata['name']) => (
          <EuiText size="s">{ruleName}</EuiText>
        ),
        name: i18n.translate(
          'xpack.securitySolution.flyout.left.insights.misconfigurations.table.ruleColumnName',
          {
            defaultMessage: 'Rule',
          }
        ),
        width: `calc(100% - ${linkWidth + resultWidth}px)`,
        sortable: true,
      },
    ];

    return (
      <>
        <EuiPanel hasShadow={false}>
          <SecuritySolutionLinkAnchor
            deepLinkId={SecurityPageName.cloudSecurityPostureFindings}
            path={`${getFindingsPageUrl(value, field)}`}
            target={'_blank'}
            external={false}
            onClick={() => {
              uiMetricService.trackUiMetric(
                METRIC_TYPE.CLICK,
                NAV_TO_FINDINGS_BY_HOST_NAME_FRPOM_ENTITY_FLYOUT
              );
            }}
          >
            {i18n.translate(
              'xpack.securitySolution.flyout.left.insights.misconfigurations.tableTitle',
              {
                defaultMessage: 'Misconfigurations ',
              }
            )}
            <EuiIcon type={'popout'} />
          </SecuritySolutionLinkAnchor>
          <EuiSpacer size="xl" />
          <DistributionBar stats={misconfigurationStats} />
          <EuiSpacer size="l" />
          <EuiBasicTable
            items={pageOfItems || []}
            rowHeader="result"
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
            data-test-subj={'securitySolutionFlyoutMisconfigurationFindingsTable'}
            sorting={sorting}
          />
        </EuiPanel>
      </>
    );
  }
);

MisconfigurationFindingsDetailsTable.displayName = 'MisconfigurationFindingsDetailsTable';
