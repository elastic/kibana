/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import {
  SecurityCellActions,
  SecurityCellActionsTrigger,
  CellActionsMode,
} from '../../../common/components/cell_actions';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import type { UserRiskScoreColumns } from '.';
import * as i18n from './translations';
import { RiskScoreLevel } from '../severity/common';
import type { Maybe, RiskSeverity } from '../../../../common/search_strategy';
import { RiskScoreEntity, RiskScoreFields } from '../../../../common/search_strategy';
import { UserDetailsLink } from '../../../common/components/links';
import { UsersTableType } from '../../../explore/users/store/model';
import { ENTITY_RISK_LEVEL } from '../risk_score/translations';
import { CELL_ACTIONS_TELEMETRY } from '../risk_score/constants';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { formatRiskScore } from '../../common';

export const getUserRiskScoreColumns = ({
  dispatchSeverityUpdate,
}: {
  dispatchSeverityUpdate: (s: RiskSeverity) => void;
}): UserRiskScoreColumns => [
  {
    field: 'user.name',
    name: i18n.USER_NAME,
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    width: '35%',
    render: (userName) => {
      if (userName != null && userName.length > 0) {
        const id = escapeDataProviderId(`user-risk-score-table-userName-${userName}`);
        return (
          <SecurityCellActions
            key={id}
            mode={CellActionsMode.HOVER_DOWN}
            visibleCellActions={5}
            showActionTooltips
            triggerId={SecurityCellActionsTrigger.DEFAULT}
            data={{
              value: userName,
              field: 'user.name',
            }}
            metadata={{
              telemetry: CELL_ACTIONS_TELEMETRY,
            }}
          >
            <UserDetailsLink userName={userName} userTab={UsersTableType.risk} />
          </SecurityCellActions>
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
    render: (lastSeen: Maybe<string>) => {
      if (lastSeen != null) {
        return <FormattedRelativePreferenceDate value={lastSeen} />;
      }
      return getEmptyTagValue();
    },
  },
  {
    field: RiskScoreFields.userRiskScore,
    name: i18n.USER_RISK_SCORE,
    truncateText: true,
    mobileOptions: { show: true },
    sortable: true,
    render: (riskScore) => {
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
    field: RiskScoreFields.userRisk,
    name: ENTITY_RISK_LEVEL(RiskScoreEntity.user),
    truncateText: false,
    mobileOptions: { show: true },
    sortable: true,
    render: (risk) => {
      if (risk != null) {
        return (
          <RiskScoreLevel
            toolTipContent={
              <EuiLink onClick={() => dispatchSeverityUpdate(risk)}>
                <EuiText size="xs">{i18n.VIEW_USERS_BY_SEVERITY(risk.toLowerCase())}</EuiText>
              </EuiLink>
            }
            severity={risk}
          />
        );
      }
      return getEmptyTagValue();
    },
  },
];
