/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, type HealthScanResultResponse, type HealthScanSummary } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import moment from 'moment';
import React from 'react';
import { useGetHealthScanResults } from '../../../hooks/use_get_health_scan_results';
import { useKibana } from '../../../hooks/use_kibana';

interface Props {
  scan: HealthScanSummary;
}

function getHealthStatus(result: HealthScanResultResponse): string {
  const issues: string[] = [];

  const rollup = result.health.rollup;
  if (rollup.isProblematic) {
    if (rollup.missing) {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.missingRollupIssue', {
          defaultMessage: 'Missing rollup transform',
        })
      );
    }
    if (rollup.state !== 'unavailable' && !rollup.stateMatches) {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.mismatchedRollupIssue', {
          defaultMessage: 'Mismatched rollup transform state',
        })
      );
    }
    if (rollup.status === 'unhealthy') {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.unhealthyRollupIssue', {
          defaultMessage: 'Unhealthy rollup transform',
        })
      );
    }
  }

  const summary = result.health.summary;
  if (summary.isProblematic) {
    if (summary.missing) {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.missingSummaryTransformIssue', {
          defaultMessage: 'Missing summary transform',
        })
      );
    }
    if (summary.state !== 'unavailable' && !summary.stateMatches) {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.mismatchedSummaryTransformIssue', {
          defaultMessage: 'Mismatched summary transform state',
        })
      );
    }
    if (summary.status === 'unhealthy') {
      issues.push(
        i18n.translate('xpack.slo.healthScanFlyout.scanResults.unhealthySummaryTransformIssue', {
          defaultMessage: 'Unhealthy summary transform',
        })
      );
    }
  }

  return issues.length > 0
    ? issues.join(', ')
    : i18n.translate('xpack.slo.healthScanFlyout.scanResults.healthy', {
        defaultMessage: 'Healthy',
      });
}

export function ScanResultsPanel({ scan }: Props) {
  const { uiSettings, http } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');
  const { data, isLoading, isError } = useGetHealthScanResults({
    scanId: scan.scanId,
    problematic: true,
    size: 100,
    refetchInterval: scan.status !== 'completed' ? 5000 : false,
  });

  const columns: Array<EuiBasicTableColumn<HealthScanResultResponse>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanResults.sloIdColumn', {
        defaultMessage: 'SLO',
      }),
      render: (_, item: HealthScanResultResponse) => (
        <EuiToolTip content={item.slo.name}>
          <EuiLink
            data-test-subj="sloLink"
            href={http.basePath.prepend(paths.sloDetails(item.slo.id, ALL_VALUE))}
            target="_blank"
            rel="noopener"
          >
            {item.slo.name}
          </EuiLink>
        </EuiToolTip>
      ),
      width: '30%',
    },
    {
      field: 'spaceId',
      name: i18n.translate('xpack.slo.healthScanFlyout.scanResults.spaceColumn', {
        defaultMessage: 'Space',
      }),
      render: (spaceId: string) => <EuiBadge color="hollow">{spaceId}</EuiBadge>,
      width: '15%',
    },
    {
      name: i18n.translate('xpack.slo.healthScanFlyout.scanResults.issueColumn', {
        defaultMessage: 'Issue',
      }),
      render: (result: HealthScanResultResponse) => (
        <EuiText size="s" color="danger">
          {getHealthStatus(result)}
        </EuiText>
      ),
      width: '45%',
    },
  ];

  if (isLoading) {
    return (
      <EuiFlexGroup alignItems="center" justifyContent="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.slo.healthScanFlyout.scanResults.errorTitle', {
          defaultMessage: 'Error loading scan results',
        })}
        color="danger"
        iconType="error"
      >
        <p>
          {i18n.translate('xpack.slo.healthScanFlyout.scanResults.errorBody', {
            defaultMessage: 'Unable to load the results for this scan. Please try again.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={moment(scan.latestTimestamp).format(dateFormat)}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.scanDate', {
              defaultMessage: 'Scan date',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={scan.total}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.totalScanned', {
              defaultMessage: 'Total scanned',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={scan.problematic}
            titleColor={scan.problematic > 0 ? 'danger' : 'success'}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.problematic', {
              defaultMessage: 'Issues found',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {scan.problematic === 0 ? (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.slo.healthScanFlyout.scanResults.noIssuesTitle', {
            defaultMessage: 'All SLOs are healthy',
          })}
          color="success"
          iconType="check"
        >
          <p>
            {i18n.translate('xpack.slo.healthScanFlyout.scanResults.noIssuesBody', {
              defaultMessage: 'No operational issues were found during this scan.',
            })}
          </p>
        </EuiCallOut>
      ) : (
        <>
          <EuiText size="s">
            <h4>
              {i18n.translate('xpack.slo.healthScanFlyout.scanResults.problematicSlosTitle', {
                defaultMessage: 'Problematic SLOs',
              })}
            </h4>
          </EuiText>

          <EuiSpacer size="s" />

          <EuiBasicTable
            tableCaption="health scan results"
            items={data?.results ?? []}
            columns={columns}
            rowProps={(result) => ({
              'data-test-subj': `healthScanResult-${result.slo.id}`,
            })}
            data-test-subj="healthScanResultsTable"
          />
        </>
      )}
    </>
  );
}
