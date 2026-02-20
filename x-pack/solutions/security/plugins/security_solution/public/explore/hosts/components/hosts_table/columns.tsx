/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality';
import { SecurityCellActions, CellActionsMode } from '../../../../common/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HostDetailsLink } from '../../../../common/components/links';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { HostsTableColumns } from '.';
import * as i18n from './translations';
import type { Maybe, RiskSeverity } from '../../../../../common/search_strategy';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { VIEW_HOSTS_BY_SEVERITY } from '../../../../entity_analytics/components/host_risk_score_table/translations';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { ENTITY_RISK_LEVEL } from '../../../../entity_analytics/components/risk_score/translations';

export const getHostsColumns = (
  showRiskColumn: boolean,
  dispatchSeverityUpdate: (s: RiskSeverity) => void
): HostsTableColumns => {
  const columns: HostsTableColumns = [
    {
      field: 'node.host.name',
      name: i18n.NAME,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (hostName) => {
        if (hostName != null && hostName.length > 0) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
              data={{
                value: hostName[0],
                field: 'host.name',
              }}
            >
              <HostDetailsLink hostName={hostName[0]} />
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
      width: '35%',
    },
    {
      field: 'node.lastSeen',
      name: (
        <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.LAST_SEEN} <EuiIcon color="subdued" type="info" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (lastSeen: Maybe<string | string[]> | undefined) => {
        if (lastSeen != null && lastSeen.length > 0) {
          return (
            <FormattedRelativePreferenceDate
              value={Array.isArray(lastSeen) ? lastSeen[0] : lastSeen}
            />
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.name',
      name: (
        <EuiToolTip content={i18n.OS_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.OS} <EuiIcon color="subdued" type="info" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsName) => {
        if (hostOsName != null) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
              data={{
                value: hostOsName[0],
                field: 'host.os.name',
              }}
            >
              {hostOsName}
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.version',
      name: i18n.VERSION,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsVersion) => {
        if (hostOsVersion != null) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
              data={{
                value: hostOsVersion[0],
                field: 'host.os.version',
              }}
            >
              {hostOsVersion}
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
  ];

  if (showRiskColumn) {
    columns.push({
      field: 'node.risk',
      name: ENTITY_RISK_LEVEL(EntityType.host),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (riskScore: RiskSeverity) => {
        if (riskScore != null) {
          return (
            <RiskScoreLevel
              toolTipContent={
                <EuiLink onClick={() => dispatchSeverityUpdate(riskScore)}>
                  <EuiText size="xs">{VIEW_HOSTS_BY_SEVERITY(riskScore.toLowerCase())}</EuiText>
                </EuiLink>
              }
              severity={riskScore}
            />
          );
        }
        return getEmptyTagValue();
      },
    });
  }

  columns.push({
    field: 'node.criticality',
    name: i18n.ASSET_CRITICALITY,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: false,
    render: (assetCriticality: CriticalityLevelWithUnassigned) => {
      if (!assetCriticality) return getEmptyTagValue();
      return (
        <AssetCriticalityBadge
          criticalityLevel={assetCriticality}
          css={{ verticalAlign: 'middle' }}
        />
      );
    },
  });

  return columns;
};
