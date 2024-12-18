/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticEvent } from 'react';
import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import styled from 'styled-components';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HostDetailsLink, UserDetailsLink } from '../../../common/components/links';
import { RiskScoreLevel } from '../severity/common';
import { CELL_ACTIONS_TELEMETRY } from '../risk_score/constants';
import type {
  HostRiskScore,
  Maybe,
  RiskSeverity,
  UserRiskScore,
} from '../../../../common/search_strategy';
import { RiskScoreEntity, RiskScoreFields } from '../../../../common/search_strategy';
import * as i18n from './translations';
import { FormattedCount } from '../../../common/components/formatted_number';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
  SecurityCellActionType,
} from '../../../common/components/cell_actions';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { formatRiskScore } from '../../common';

type HostRiskScoreColumns = Array<EuiBasicTableColumn<HostRiskScore & UserRiskScore>>;

const StyledCellActions = styled(SecurityCellActions)`
  padding-left: ${({ theme }) => theme.eui.euiSizeS};
`;

type OpenEntityOnAlertsPage = (entityName: string) => void;
type OpenEntityOnExpandableFlyout = (entityName: string) => void;

export const getRiskScoreColumns = (
  riskEntity: RiskScoreEntity,
  openEntityOnAlertsPage: OpenEntityOnAlertsPage,
  openEntityOnExpandableFlyout: OpenEntityOnExpandableFlyout
): HostRiskScoreColumns => [
  {
    field: riskEntity === RiskScoreEntity.host ? 'host.name' : 'user.name',
    name: i18n.ENTITY_NAME(riskEntity),
    truncateText: false,
    mobileOptions: { show: true },
    className: 'inline-actions-table-cell',
    render: (entityName: string) => {
      const onEntityDetailsLinkClick = (e: SyntheticEvent) => {
        e.preventDefault();
        openEntityOnExpandableFlyout(entityName);
      };

      if (entityName != null && entityName.length > 0) {
        return riskEntity === RiskScoreEntity.host ? (
          <>
            <HostDetailsLink hostName={entityName} onClick={onEntityDetailsLinkClick} />
            <StyledCellActions
              data={{
                value: entityName,
                field: 'host.name',
              }}
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              mode={CellActionsMode.INLINE}
              visibleCellActions={2}
              disabledActionTypes={[
                SecurityCellActionType.FILTER,
                SecurityCellActionType.SHOW_TOP_N,
              ]}
              metadata={{
                telemetry: CELL_ACTIONS_TELEMETRY,
              }}
            />
          </>
        ) : (
          <>
            <UserDetailsLink userName={entityName} onClick={onEntityDetailsLinkClick} />

            <StyledCellActions
              data={{
                value: entityName,
                field: 'user.name',
              }}
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              mode={CellActionsMode.INLINE}
              disabledActionTypes={[
                SecurityCellActionType.FILTER,
                SecurityCellActionType.SHOW_TOP_N,
              ]}
            />
          </>
        );
      }
      return getEmptyTagValue();
    },
  },

  {
    field: RiskScoreFields.timestamp,
    name: i18n.LAST_UPDATED,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    width: '20%',
    render: (lastSeen: Maybe<string>) => {
      if (lastSeen != null) {
        return <FormattedRelativePreferenceDate value={lastSeen} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field:
      riskEntity === RiskScoreEntity.host
        ? RiskScoreFields.hostRiskScore
        : RiskScoreFields.userRiskScore,
    width: '15%',
    name: i18n.RISK_SCORE_TITLE(riskEntity),
    truncateText: true,
    mobileOptions: { show: true },
    render: (riskScore: number) => {
      if (riskScore != null) {
        return (
          <span data-test-subj="risk-score-truncate" title={`${riskScore}`}>
            {formatRiskScore(riskScore)}
          </span>
        );
      }
      return getEmptyTagValue();
    },
  },
  {
    field:
      riskEntity === RiskScoreEntity.host ? RiskScoreFields.hostRisk : RiskScoreFields.userRisk,
    width: '25%',
    name: i18n.ENTITY_RISK_LEVEL(riskEntity),
    truncateText: false,
    mobileOptions: { show: true },
    render: (risk: RiskSeverity) => {
      if (risk != null) {
        return <RiskScoreLevel severity={risk} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.alertsCount,
    width: '10%',
    name: i18n.ALERTS,
    truncateText: false,
    mobileOptions: { show: true },
    className: 'inline-actions-table-cell',
    render: (alertCount: number, risk) => (
      <>
        <EuiLink
          data-test-subj="risk-score-alerts"
          disabled={alertCount === 0}
          onClick={() =>
            openEntityOnAlertsPage(
              riskEntity === RiskScoreEntity.host ? risk.host.name : risk.user.name
            )
          }
        >
          <FormattedCount count={alertCount} />
        </EuiLink>
        <StyledCellActions
          data={{
            value: riskEntity === RiskScoreEntity.host ? risk.host.name : risk.user.name,
            field: riskEntity === RiskScoreEntity.host ? 'host.name' : 'user.name',
          }}
          mode={CellActionsMode.INLINE}
          triggerId={SecurityCellActionsTrigger.ALERTS_COUNT}
          metadata={{
            andFilters: [{ field: 'kibana.alert.workflow_status', value: 'open' }],
          }}
        />
      </>
    ),
  },
];
