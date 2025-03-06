/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';

import { useUpsellingComponent } from '../../../common/hooks/use_upselling';
import { EnableRiskScore } from '../enable_risk_score';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { State } from '../../../common/store';
import { hostsModel, hostsSelectors } from '../../../explore/hosts/store';
import { usersSelectors } from '../../../explore/users/store';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { TopRiskScoreContributorsAlerts } from '../top_risk_score_contributors_alerts';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { buildEntityNameFilter, EntityType } from '../../../../common/search_strategy';
import type { UsersComponentsQueryProps } from '../../../explore/users/pages/navigation/types';
import type { HostsComponentsQueryProps } from '../../../explore/hosts/pages/navigation/types';
import { HostRiskScoreQueryId, UserRiskScoreQueryId } from '../../common/utils';
import { useRiskScore } from '../../api/hooks/use_risk_score';
import { useMissingRiskEnginePrivileges } from '../../hooks/use_missing_risk_engine_privileges';
import { RiskEnginePrivilegesCallOut } from '../risk_engine_privileges_callout';
import { RiskScoresNoDataDetected } from '../risk_score_no_data_detected';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme: { euiTheme } }) => euiTheme.size.l};
`;

type ComponentsQueryProps = HostsComponentsQueryProps | UsersComponentsQueryProps;

const RiskDetailsTabBodyComponent: React.FC<
  Pick<ComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    entityName: string;
    riskEntity: EntityType;
  }
> = ({ entityName, startDate, endDate, setQuery, deleteQuery, riskEntity }) => {
  const queryId = useMemo(
    () =>
      riskEntity === EntityType.host
        ? HostRiskScoreQueryId.HOST_DETAILS_RISK_SCORE
        : UserRiskScoreQueryId.USER_DETAILS_RISK_SCORE,
    [riskEntity]
  );

  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    riskEntity === EntityType.host
      ? hostsSelectors.hostRiskScoreSeverityFilterSelector()(state, hostsModel.HostsType.details)
      : usersSelectors.userRiskScoreSeverityFilterSelector()(state)
  );

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const { toggleStatus: contributorsToggleStatus, setToggleStatus: setContributorsToggleStatus } =
    useQueryToggle(`${queryId} contributors`);

  const filterQuery = useMemo(
    () => (entityName ? buildEntityNameFilter(riskEntity, [entityName]) : {}),
    [entityName, riskEntity]
  );

  const { data, loading, refetch, inspect, hasEngineBeenInstalled } = useRiskScore({
    filterQuery,
    onlyLatest: false,
    riskEntity,
    skip: !contributorsToggleStatus,
    timerange,
  });

  useQueryInspector({
    queryId,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const toggleContributorsQuery = useCallback(
    (status: boolean) => {
      setContributorsToggleStatus(status);
    },
    [setContributorsToggleStatus]
  );

  const privileges = useMissingRiskEnginePrivileges();

  const RiskScoreUpsell = useUpsellingComponent('entity_analytics_panel');
  if (RiskScoreUpsell) {
    return <RiskScoreUpsell />;
  }

  if (!privileges.isLoading && !privileges.hasAllRequiredPrivileges) {
    return (
      <EuiPanel hasBorder>
        <RiskEnginePrivilegesCallOut privileges={privileges} />
      </EuiPanel>
    );
  }

  const status = {
    isDisabled: !hasEngineBeenInstalled && !loading,
  };

  if (status.isDisabled) {
    return <EnableRiskScore {...status} entityType={riskEntity} />;
  }

  if (hasEngineBeenInstalled && severitySelectionRedux.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={riskEntity} />;
  }

  return (
    <>
      <StyledEuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          {data?.[0] && (
            <TopRiskScoreContributorsAlerts
              toggleStatus={contributorsToggleStatus}
              toggleQuery={toggleContributorsQuery}
              riskScore={data[0]}
              riskEntity={riskEntity}
              loading={loading}
            />
          )}
        </EuiFlexItem>
      </StyledEuiFlexGroup>
    </>
  );
};

RiskDetailsTabBodyComponent.displayName = 'RiskDetailsTabBodyComponent';

export const RiskDetailsTabBody = React.memo(RiskDetailsTabBodyComponent);

RiskDetailsTabBody.displayName = 'RiskDetailsTabBody';
