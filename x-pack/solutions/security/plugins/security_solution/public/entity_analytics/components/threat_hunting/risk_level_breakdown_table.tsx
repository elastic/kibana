/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from '../severity/common';
import type { SeverityCount } from '../severity/types';

interface RiskLevelBreakdownItem {
  level: RiskSeverity;
  scoreRange: string;
  count: number;
}

interface RiskLevelBreakdownTableProps {
  severityCount: SeverityCount;
  loading?: boolean;
}

export const RiskLevelBreakdownTable: React.FC<RiskLevelBreakdownTableProps> = ({
  severityCount,
  loading = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const tableItems: RiskLevelBreakdownItem[] = useMemo(() => {
    return [
      {
        level: RiskSeverity.Critical,
        scoreRange: '>90',
        count: severityCount[RiskSeverity.Critical] ?? 0,
      },
      {
        level: RiskSeverity.High,
        scoreRange: '70-90',
        count: severityCount[RiskSeverity.High] ?? 0,
      },
      {
        level: RiskSeverity.Moderate,
        scoreRange: '40-70',
        count: severityCount[RiskSeverity.Moderate] ?? 0,
      },
      {
        level: RiskSeverity.Low,
        scoreRange: '20-40',
        count: severityCount[RiskSeverity.Low] ?? 0,
      },
      {
        level: RiskSeverity.Unknown,
        scoreRange: '<20',
        count: severityCount[RiskSeverity.Unknown] ?? 0,
      },
    ];
  }, [severityCount]);

  const columns: Array<EuiBasicTableColumn<RiskLevelBreakdownItem>> = useMemo(
    () => [
      {
        field: 'level',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevelBreakdown.riskLevel"
            defaultMessage="Risk level"
          />
        ),
        render: (level: RiskSeverity) => (
          <EuiText size="s">
            <RiskScoreLevel hideBackgroundColor severity={level} />
          </EuiText>
        ),
      },
      {
        field: 'scoreRange',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevelBreakdown.riskScore"
            defaultMessage="Risk score"
          />
        ),
        render: (scoreRange: string) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.medium }}>
            {scoreRange}
          </EuiText>
        ),
      },
      {
        field: 'count',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.threatHunting.riskLevelBreakdown.numberOfEntities"
            defaultMessage="Number of entities"
          />
        ),
        dataType: 'number',
        render: (count: number) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {count.toLocaleString()}
          </EuiText>
        ),
      },
    ],
    [euiTheme]
  );

  return (
    <EuiBasicTable
      items={tableItems}
      columns={columns}
      loading={loading}
      tableCaption="Risk level breakdown by entity count"
      data-test-subj="risk-level-breakdown-table"
    />
  );
};
