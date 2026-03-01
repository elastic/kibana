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
import {
  buildEntityNameFilter,
  buildHostFilterFromEntityIdentifiers,
  EntityType,
} from '../../../../common/search_strategy';
import type { UsersComponentsQueryProps } from '../../../explore/users/pages/navigation/types';
import type { HostsComponentsQueryProps } from '../../../explore/hosts/pages/navigation/types';
import { HostRiskScoreQueryId, UserRiskScoreQueryId } from '../../common/utils';
import { useHostRiskScoresFromEntityStore } from '../../api/hooks/use_host_risk_scores_from_entity_store';
import { useUserRiskScoresFromEntityStore } from '../../api/hooks/use_user_risk_scores_from_entity_store';
import { useMissingRiskEnginePrivileges } from '../../hooks/use_missing_risk_engine_privileges';
import { RiskEnginePrivilegesCallOut } from '../risk_engine_privileges_callout';
import { RiskScoresNoDataDetected } from '../risk_score_no_data_detected';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme: { euiTheme } }) => euiTheme.size.l};
`;

type ComponentsQueryProps = HostsComponentsQueryProps | UsersComponentsQueryProps;

const RiskDetailsTabBodyComponent: React.FC<
  Pick<
    ComponentsQueryProps,
    'startDate' | 'endDate' | 'setQuery' | 'deleteQuery' | 'filterQuery'
  > & {
    entityName: string;
    riskEntity: EntityType;
    entityIdentifiers?: Record<string, string>;
  }
> = ({
  entityName,
  startDate,
  endDate,
  setQuery,
  deleteQuery,
  riskEntity,
  filterQuery: filterQueryProp,
  entityIdentifiers = {},
}) => {
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

  const { toggleStatus: contributorsToggleStatus, setToggleStatus: setContributorsToggleStatus } =
    useQueryToggle(`${queryId} contributors`);

  const querySkip = !contributorsToggleStatus;

  const legacyFilterQuery = useMemo(
    () => (entityName ? buildEntityNameFilter(riskEntity, [entityName]) : {}),
    [entityName, riskEntity]
  );

  const hostEntityStoreFilterQuery = useMemo(() => {
    if (filterQueryProp && typeof filterQueryProp === 'string') {
      return filterQueryProp;
    }
    if (entityName && riskEntity === EntityType.host) {
      const hasHostIdentifiers = Object.keys(entityIdentifiers).some((k) => k.startsWith('host.'));
      const euidFilter = hasHostIdentifiers
        ? buildHostFilterFromEntityIdentifiers(entityIdentifiers as Record<string, string>)
        : undefined;
      return euidFilter ? JSON.stringify(euidFilter) : JSON.stringify(legacyFilterQuery);
    }
    return undefined;
  }, [filterQueryProp, entityName, riskEntity, legacyFilterQuery, entityIdentifiers]);

  const userEntityStoreFilterQuery = useMemo(() => {
    if (filterQueryProp && typeof filterQueryProp === 'string') {
      return filterQueryProp;
    }
    if (entityName && riskEntity === EntityType.user) {
      return JSON.stringify(legacyFilterQuery);
    }
    return undefined;
  }, [filterQueryProp, entityName, riskEntity, legacyFilterQuery]);

  const {
    data: hostData,
    loading: hostLoading,
    refetch: hostRefetch,
    inspect: hostInspect,
    hasEngineBeenInstalled: hostHasEngine,
  } = useHostRiskScoresFromEntityStore({
    filterQuery: hostEntityStoreFilterQuery,
    pagination: { cursorStart: 0, querySize: 1 },
    skip: riskEntity !== EntityType.host || querySkip,
  });

  const {
    data: userData,
    loading: userLoading,
    refetch: userRefetch,
    inspect: userInspect,
    hasEngineBeenInstalled: userHasEngine,
  } = useUserRiskScoresFromEntityStore({
    filterQuery: userEntityStoreFilterQuery,
    pagination: { cursorStart: 0, querySize: 1 },
    skip: riskEntity !== EntityType.user || querySkip,
  });

  const data = riskEntity === EntityType.host ? hostData : userData;
  const loading = riskEntity === EntityType.host ? hostLoading : userLoading;
  const refetch = riskEntity === EntityType.host ? hostRefetch : userRefetch;
  const inspect = riskEntity === EntityType.host ? hostInspect : userInspect;
  const hasEngineBeenInstalled = riskEntity === EntityType.host ? hostHasEngine : userHasEngine;
  const hostRiskScore = hostData?.[0];
  const userRiskScore = userData?.[0];

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

  const privileges = useMissingRiskEnginePrivileges({ readonly: true });

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
          {hostRiskScore && riskEntity === EntityType.host && (
            <TopRiskScoreContributorsAlerts
              toggleStatus={contributorsToggleStatus}
              toggleQuery={toggleContributorsQuery}
              riskScore={hostRiskScore}
              riskEntity={EntityType.host}
              loading={loading}
            />
          )}
          {userRiskScore && riskEntity === EntityType.user && (
            <TopRiskScoreContributorsAlerts
              toggleStatus={contributorsToggleStatus}
              toggleQuery={toggleContributorsQuery}
              riskScore={userRiskScore}
              riskEntity={EntityType.user}
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
