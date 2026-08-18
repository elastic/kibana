/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
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
import {
  SecurityCellActions,
  SecurityCellActionType,
} from '../../../common/components/cell_actions';

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
  /** Overrides the count column header (defaults to "Entities"). */
  countColumnName?: React.ReactNode;
  /**
   * When true, always show the Alerts-style ⋮ cell-actions column using the
   * field name (no data-view FieldSpec required). Prefer this for prototypes.
   */
  showCellActions?: boolean;
  /** Custom ⋮ cell renderer — when set, replaces the default SecurityCellActions. */
  renderCellActions?: (level: RiskSeverity) => React.ReactNode;
}

export const RiskLevelBreakdownTable: React.FC<RiskLevelBreakdownTableProps> = ({
  severityCount,
  loading = false,
  entityDataView,
  countColumnName,
  showCellActions = false,
  renderCellActions,
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

  const getCellActionsMetadata = useCallback(
    (level: RiskSeverity) =>
      entityDataView?.id
        ? {
            dataViewId: entityDataView.id,
            ...(level === RiskSeverity.Unknown ? { includeNullValues: true } : {}),
          }
        : undefined,
    [entityDataView?.id]
  );

  const showDataViewCellActions = !!riskLevelFieldSpec && !!entityDataView?.id;
  const showActionsColumn =
    Boolean(renderCellActions) || showCellActions || showDataViewCellActions;

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
        name: countColumnName ?? (
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

    if (showActionsColumn) {
      baseColumns.push({
        field: 'level',
        name: '',
        width: '40px',
        'data-test-subj': 'riskLevelBreakdownTable-actions',
        render: (level: RiskSeverity) => {
          if (renderCellActions) {
            return <>{renderCellActions(level)}</>;
          }
          if (showCellActions || !riskLevelFieldSpec) {
            return (
              <SecurityCellActions
                mode={CellActionsMode.INLINE}
                visibleCellActions={0}
                triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
                data={{ field: ENTITY_RISK_LEVEL_FIELD, value: level }}
                disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
                extraActionsIconType="boxesVertical"
                extraActionsColor="text"
              />
            );
          }
          return (
            <CellActions
              mode={CellActionsMode.INLINE}
              visibleCellActions={0}
              triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
              data={{ field: riskLevelFieldSpec, value: level }}
              metadata={getCellActionsMetadata(level)}
              disabledActionTypes={[SecurityCellActionType.SHOW_TOP_N]}
              extraActionsIconType="boxesVertical"
              extraActionsColor="text"
            />
          );
        },
      });
    }

    return baseColumns;
  }, [
    euiTheme,
    showActionsColumn,
    showCellActions,
    riskLevelFieldSpec,
    getCellActionsMetadata,
    countColumnName,
    renderCellActions,
  ]);

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
