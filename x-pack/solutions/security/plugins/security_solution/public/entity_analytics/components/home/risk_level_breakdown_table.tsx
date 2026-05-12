/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiInMemoryTable, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { DataView } from '@kbn/data-views-plugin/public';
import { CellActions } from '@kbn/cell-actions';
import { CellActionsMode } from '@kbn/cell-actions/constants';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreLevel } from '../severity/common';
import type { SeverityCount } from '../severity/types';
import { SecurityCellActionType } from '../../../common/components/cell_actions';

export const ENTITY_RISK_LEVEL_FIELD = 'entity.risk.calculated_level';

interface RiskLevelBreakdownItem {
  level: RiskSeverity;
  scoreRange: string;
  count: number;
}

interface RiskLevelBreakdownTableProps {
  severityCount: SeverityCount;
  loading?: boolean;
  /**
   * When provided, inline cell actions (filter in/out, add to timeline, copy)
   * will be rendered next to each risk level using this data view's field spec
   * for `entity.risk.calculated_level`.
   */
  entityDataView?: DataView;
}

export const RiskLevelBreakdownTable: React.FC<RiskLevelBreakdownTableProps> = ({
  severityCount,
  loading = false,
  entityDataView,
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

  const riskLevelFieldSpec = useMemo(
    () => entityDataView?.fields?.getByName(ENTITY_RISK_LEVEL_FIELD)?.toSpec(),
    [entityDataView]
  );

  const cellActionsMetadata = useMemo(
    () => (entityDataView?.id ? { dataViewId: entityDataView.id } : undefined),
    [entityDataView]
  );

  const showCellActions = !!riskLevelFieldSpec && !!cellActionsMetadata;

  const columns: Array<EuiBasicTableColumn<RiskLevelBreakdownItem>> = useMemo(() => {
    const baseColumns: Array<EuiBasicTableColumn<RiskLevelBreakdownItem>> = [
      {
        field: 'level',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.homePage.riskLevelBreakdown.riskLevel"
            defaultMessage="Risk level"
          />
        ),
        'data-test-subj': 'riskLevelBreakdownTable-level',
        render: (level: RiskSeverity) => (
          <EuiText className="eui-textTruncate" size="s">
            <RiskScoreLevel hideBackgroundColor severity={level} />
          </EuiText>
        ),
      },
      {
        field: 'scoreRange',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.homePage.riskLevelBreakdown.riskScore"
            defaultMessage="Risk score"
          />
        ),
        align: 'right',
        'data-test-subj': 'riskLevelBreakdownTable-scoreRange',
        render: (scoreRange: string) => (
          <EuiText size="s" css={{ whiteSpace: 'nowrap', fontWeight: euiTheme.font.weight.medium }}>
            {scoreRange}
          </EuiText>
        ),
      },
      {
        field: 'count',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.homePage.riskLevelBreakdown.numberOfEntities"
            defaultMessage="Entities"
          />
        ),
        align: 'right',
        'data-test-subj': 'riskLevelBreakdownTable-count',
        render: (count: number) => (
          <EuiText size="s" style={{ fontWeight: euiTheme.font.weight.semiBold }}>
            {getAbbreviatedNumber(count)}
          </EuiText>
        ),
      },
    ];

    if (showCellActions && riskLevelFieldSpec && cellActionsMetadata) {
      baseColumns.push({
        field: 'level',
        name: '',
        width: '40px',
        'data-test-subj': 'riskLevelBreakdownTable-actions',
        render: (level: RiskSeverity) => (
          <CellActions
            mode={CellActionsMode.INLINE}
            visibleCellActions={0}
            triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
            data={{ field: riskLevelFieldSpec, value: level }}
            metadata={cellActionsMetadata}
            disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
            extraActionsIconType="boxesVertical"
            extraActionsColor="text"
          />
        ),
      });
    }

    return baseColumns;
  }, [euiTheme, showCellActions, riskLevelFieldSpec, cellActionsMetadata]);

  return (
    <EuiInMemoryTable
      items={tableItems}
      compressed={true}
      columns={columns}
      loading={loading}
      tableCaption="Risk level breakdown by entity count"
      data-test-subj="risk-level-breakdown-table"
    />
  );
};
