/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiStat,
  EuiSpacer,
  EuiProgress,
  EuiText,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiHealth,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { usePostureSummary } from '../hooks/use_posture_summary';
import { TEST_SUBJECTS } from '../../../common/endpoint_assets';
import * as i18n from '../pages/translations';

interface FailedCheckRow {
  check: string;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
};

const getSeverityFromCheck = (check: string): 'critical' | 'high' | 'medium' | 'low' => {
  const lowerCheck = check.toLowerCase();
  if (lowerCheck.includes('encryption')) return 'critical';
  if (lowerCheck.includes('firewall')) return 'high';
  if (lowerCheck.includes('secure boot')) return 'medium';
  if (lowerCheck.includes('admin')) return 'high';
  return 'medium';
};

export const PostureOverview: React.FC = React.memo(() => {
  const { data, loading, error } = usePostureSummary();

  if (loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error || !data) {
    return (
      <EuiPanel hasBorder>
        <EuiText color="danger">Error loading posture summary</EuiText>
      </EuiPanel>
    );
  }

  const { total_assets, posture_distribution, failed_checks_by_type, average_score } = data;

  // Convert failed checks to table rows
  const failedCheckRows: FailedCheckRow[] = Object.entries(failed_checks_by_type)
    .map(([check, count]) => ({
      check,
      count,
      severity: getSeverityFromCheck(check),
    }))
    .sort((a, b) => b.count - a.count);

  const columns: Array<EuiBasicTableColumn<FailedCheckRow>> = [
    {
      field: 'check',
      name: 'Failed Check',
      render: (check: string, row: FailedCheckRow) => (
        <EuiHealth color={getSeverityColor(row.severity)}>{check}</EuiHealth>
      ),
    },
    {
      field: 'count',
      name: 'Affected Assets',
      width: '120px',
    },
    {
      field: 'severity',
      name: 'Severity',
      width: '100px',
      render: (severity: string) => (
        <EuiText size="xs" color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </EuiText>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="l" data-test-subj={TEST_SUBJECTS.POSTURE_OVERVIEW}>
      {/* Summary Stats Row */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={`${average_score}/100`}
                description="Average Posture Score"
                titleSize="l"
                titleColor={average_score >= 80 ? 'success' : average_score >= 60 ? 'warning' : 'danger'}
              />
              <EuiSpacer size="s" />
              <EuiProgress value={average_score} max={100} color={average_score >= 80 ? 'success' : average_score >= 60 ? 'warning' : 'danger'} />
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={posture_distribution.critical + posture_distribution.high}
                description="Assets Needing Attention"
                titleSize="l"
                titleColor="danger"
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {posture_distribution.critical} critical, {posture_distribution.high} high risk
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiPanel hasBorder>
              <EuiStat
                title={posture_distribution.low}
                description="Compliant Assets"
                titleSize="l"
                titleColor="success"
              />
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                {Math.round((posture_distribution.low / total_assets) * 100)}% of total
              </EuiText>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Distribution Chart */}
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={1}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>Posture Score Distribution</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiText size="s" color="danger">Critical</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={posture_distribution.critical}
                        max={total_assets}
                        color="danger"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{posture_distribution.critical}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiText size="s" color="danger">High</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={posture_distribution.high}
                        max={total_assets}
                        color="warning"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{posture_distribution.high}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiText size="s">Medium</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={posture_distribution.medium}
                        max={total_assets}
                        color="primary"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{posture_distribution.medium}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiFlexGroup alignItems="center">
                    <EuiFlexItem grow={false} style={{ width: 80 }}>
                      <EuiText size="s" color="success">Low</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiProgress
                        value={posture_distribution.low}
                        max={total_assets}
                        color="success"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} style={{ width: 40 }}>
                      <EuiText size="s">{posture_distribution.low}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder>
              <EuiTitle size="xs">
                <h3>Failed Checks by Type</h3>
              </EuiTitle>
              <EuiSpacer size="m" />

              <EuiBasicTable<FailedCheckRow>
                items={failedCheckRows}
                columns={columns}
                compressed
              />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

PostureOverview.displayName = 'PostureOverview';
