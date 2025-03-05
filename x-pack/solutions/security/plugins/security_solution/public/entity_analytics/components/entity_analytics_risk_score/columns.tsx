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
import styled from '@emotion/styled';
import { get } from 'lodash/fp';

import { EntityTypeToIdentifierField } from '../../../../common/entity_analytics/types';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { EntityDetailsLink } from '../../../common/components/links';
import { RiskScoreLevel } from '../severity/common';
import { CELL_ACTIONS_TELEMETRY } from '../risk_score/constants';
import type {
  EntityRiskScore,
  Maybe,
  RiskSeverity,
  EntityType,
} from '../../../../common/search_strategy';
import {
  EntityTypeToLevelField,
  EntityTypeToScoreField,
  RiskScoreFields,
} from '../../../../common/search_strategy';
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

const StyledCellActions = styled(SecurityCellActions)`
  padding-left: ${({ theme: { euiTheme } }) => euiTheme.size.s};
`;

type OpenEntityOnAlertsPage = (entityName: string) => void;
type OpenEntityOnExpandableFlyout = (entityName: string) => void;

export const getRiskScoreColumns = <E extends EntityType>(
  entityType: E,
  openEntityOnAlertsPage: OpenEntityOnAlertsPage,
  openEntityOnExpandableFlyout: OpenEntityOnExpandableFlyout
): Array<EuiBasicTableColumn<EntityRiskScore<E>>> => {
  const fieldName = EntityTypeToIdentifierField[entityType];
  const getEntityName = get(fieldName);
  const getEntityDetailsLinkComponent = (entityName: string) => {
    const onEntityDetailsLinkClick: (e: SyntheticEvent) => void = (e) => {
      e.preventDefault();
      openEntityOnExpandableFlyout(entityName);
    };

    return (
      <EntityDetailsLink
        entityType={entityType}
        entityName={entityName}
        onClick={onEntityDetailsLinkClick}
      />
    );
  };

  return [
    {
      field: fieldName,
      name: i18n.ENTITY_NAME(entityType),
      truncateText: false,
      mobileOptions: { show: true },
      className: 'inline-actions-table-cell',
      render: (entityName: string) => {
        if (entityName != null && entityName.length > 0) {
          return (
            <>
              {getEntityDetailsLinkComponent(entityName)}

              <StyledCellActions
                data={{
                  value: entityName,
                  field: fieldName,
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
      field: EntityTypeToScoreField[entityType],
      width: '15%',
      name: i18n.RISK_SCORE_TITLE(entityType),
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
      field: EntityTypeToLevelField[entityType],
      width: '25%',
      name: i18n.ENTITY_RISK_LEVEL(entityType),
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
            onClick={() => openEntityOnAlertsPage(getEntityName(risk))}
          >
            <FormattedCount count={alertCount} />
          </EuiLink>
          <StyledCellActions
            data={{
              value: getEntityName(risk),
              field: fieldName,
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
};
