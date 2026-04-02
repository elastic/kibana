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
  EuiButton,
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
import { ALL_VALUE, type HealthScanResultResponse } from '@kbn/slo-schema';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { useGetHealthScanResults } from '../../../hooks/use_get_health_scan_results';
import { useKibana } from '../../../hooks/use_kibana';

interface Props {
  scanId: string;
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

const PAGE_SIZE = 25;

export function ScanResultsPanel({ scanId }: Props) {
  const { uiSettings, http } = useKibana().services;
  const dateFormat = uiSettings.get('dateFormat');
  const [isPending, setIsPending] = useState<boolean>(true);
  const [searchAfter, setSearchAfter] = useState<string | undefined>(undefined);
  const [searchAfterHistory, setSearchAfterHistory] = useState<Array<string | undefined>>([]);
  const prevTotalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSearchAfter(undefined);
    setSearchAfterHistory([]);
    prevTotalRef.current = undefined;
  }, [scanId]);

  const { data, isLoading, isError } = useGetHealthScanResults({
    scanId,
    problematic: true,
    allSpaces: true,
    size: PAGE_SIZE,
    searchAfter,
    refetchInterval: isPending ? 5000 : false,
  });

  useEffect(() => {
    if (!isLoading && data) {
      const scanPending = data.scan.status !== 'completed';
      setIsPending(scanPending);
      if (
        scanPending &&
        prevTotalRef.current !== undefined &&
        data.total !== prevTotalRef.current
      ) {
        setSearchAfter(undefined);
        setSearchAfterHistory([]);
      }
      prevTotalRef.current = data.total;
    }
  }, [isLoading, data]);

  const handleNextPage = () => {
    if (data?.searchAfter) {
      setSearchAfterHistory((prev) => [...prev, searchAfter]);
      setSearchAfter(JSON.stringify(data.searchAfter));
    }
  };
  const handlePreviousPage = () => {
    const newHistory = [...searchAfterHistory];
    const previousCursor = newHistory.pop();
    setSearchAfterHistory(newHistory);
    setSearchAfter(previousCursor);
  };

  const pageIndex = searchAfterHistory.length;

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

  if (isLoading && !data) {
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

  const hasIssues = !!data?.scan && data.scan.problematic > 0;
  const noIssues = !!data?.scan && data.scan.problematic === 0;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={moment(data?.scan.latestTimestamp).format(dateFormat)}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.scanDate', {
              defaultMessage: 'Scan date',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={data?.scan.status}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.status', {
              defaultMessage: 'Status',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={data?.scan.total}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.totalScanned', {
              defaultMessage: 'Total scanned',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={data?.scan.problematic}
            titleColor={(data?.scan.problematic ?? 0) > 0 ? 'danger' : 'success'}
            description={i18n.translate('xpack.slo.healthScanFlyout.scanResults.problematic', {
              defaultMessage: 'Issues found',
            })}
            titleSize="xs"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup direction="column" gutterSize="m">
        {isPending && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.slo.healthScanFlyout.scanResults.pendingTitle', {
              defaultMessage: 'Scan in progress',
            })}
            color="warning"
            iconType="clock"
          >
            <p>
              {i18n.translate('xpack.slo.healthScanFlyout.scanResults.pendingBody', {
                defaultMessage:
                  'The health scan is still running. Results will update automatically as they become available.',
              })}
            </p>
          </EuiCallOut>
        )}

        {!isPending && noIssues && (
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
        )}

        {!isPending && hasIssues && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate('xpack.slo.healthScanFlyout.scanResults.issuesTitle', {
              defaultMessage: 'Some SLOs have issues',
            })}
            color="danger"
            iconType="alert"
          >
            <p>
              {i18n.translate('xpack.slo.healthScanFlyout.scanResults.issuesBody', {
                defaultMessage:
                  'Review the problematic SLOs listed below to resolve operational issues.',
              })}
            </p>
          </EuiCallOut>
        )}

        {hasIssues && (
          <>
            <EuiText size="s">
              <h4>
                {i18n.translate('xpack.slo.healthScanFlyout.scanResults.problematicSlosTitle', {
                  defaultMessage: 'Problematic SLOs',
                })}
              </h4>
            </EuiText>

            <EuiBasicTable
              tableCaption="Problematic health scan results"
              items={data?.results ?? []}
              columns={columns}
              loading={isLoading}
              rowProps={(result) => ({
                'data-test-subj': `healthScanResult-${result.slo.id}`,
              })}
              data-test-subj="healthScanResultsTable"
            />

            {data && data.total > PAGE_SIZE && (
              <>
                <EuiSpacer size="m" />
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.slo.healthScanFlyout.scanResults.paginationLabel', {
                        defaultMessage: 'Showing {start}-{end} of {total}',
                        values: {
                          start: pageIndex * PAGE_SIZE + 1,
                          end: Math.min((pageIndex + 1) * PAGE_SIZE, data.total),
                          total: data.total,
                        },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s">
                      <EuiButton
                        size="s"
                        onClick={handlePreviousPage}
                        disabled={searchAfterHistory.length === 0 || isLoading}
                        data-test-subj="healthScanResultsPreviousPage"
                      >
                        {i18n.translate('xpack.slo.healthScanFlyout.scanResults.previousPage', {
                          defaultMessage: 'Previous',
                        })}
                      </EuiButton>
                      <EuiButton
                        size="s"
                        onClick={handleNextPage}
                        disabled={!data?.searchAfter || isLoading}
                        data-test-subj="healthScanResultsNextPage"
                      >
                        {i18n.translate('xpack.slo.healthScanFlyout.scanResults.nextPage', {
                          defaultMessage: 'Next',
                        })}
                      </EuiButton>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}
          </>
        )}
      </EuiFlexGroup>
    </>
  );
}
