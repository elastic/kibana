/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { noop } from 'lodash/fp';

import { EuiPanel } from '@elastic/eui';
import { EntityType } from '../../../common/search_strategy';
import { UserRiskScoreQueryId } from '../common/utils';
import { useUserRiskScoreKpiFromEntityStore } from '../api/hooks/use_user_risk_score_kpi_from_entity_store';
import { useUserRiskScoresFromEntityStore } from '../api/hooks/use_user_risk_scores_from_entity_store';
import { EnableRiskScore } from './enable_risk_score';
import type { UsersComponentsQueryProps } from '../../explore/users/pages/navigation/types';
import { manageQuery } from '../../common/components/page/manage_query';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import type { State } from '../../common/store';
import { UserRiskScoreTable } from './user_risk_score_table';
import { usersSelectors } from '../../explore/users/store';
import { useQueryToggle } from '../../common/containers/query_toggle';
import { useMissingRiskEnginePrivileges } from '../hooks/use_missing_risk_engine_privileges';
import { RiskEnginePrivilegesCallOut } from './risk_engine_privileges_callout';
import { useUpsellingComponent } from '../../common/hooks/use_upselling';
import { RiskScoresNoDataDetected } from './risk_score_no_data_detected';

const UserRiskScoreTableManage = manageQuery(UserRiskScoreTable);

export const UserRiskScoreQueryTabBody = ({
  deleteQuery,
  filterQuery,
  setQuery,
  skip,
  type,
}: UsersComponentsQueryProps) => {
  const getUserRiskScoreSelector = useMemo(() => usersSelectors.userRiskScoreSelector(), []);
  const { activePage, limit, sort } = useDeepEqualSelector((state: State) =>
    getUserRiskScoreSelector(state)
  );
  const getUserRiskScoreFilterQuerySelector = useMemo(
    () => usersSelectors.userRiskScoreSeverityFilterSelector(),
    []
  );
  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    getUserRiskScoreFilterQuerySelector(state)
  );
  const pagination = useMemo(
    () => ({
      cursorStart: activePage * limit,
      querySize: limit,
    }),
    [activePage, limit]
  );

  const { toggleStatus } = useQueryToggle(UserRiskScoreQueryId.USERS_BY_RISK);
  const [querySkip, setQuerySkip] = useState(skip || !toggleStatus);
  useEffect(() => {
    setQuerySkip(!toggleStatus);
  }, [toggleStatus]);

  const privileges = useMissingRiskEnginePrivileges({ readonly: true });

  const { data, inspect, hasEngineBeenInstalled, loading, refetch, totalCount } =
    useUserRiskScoresFromEntityStore({
      filterQuery: filterQuery as string,
      pagination,
      skip: querySkip,
      sort,
    });

  const { severityCount, loading: isKpiLoading } = useUserRiskScoreKpiFromEntityStore({
    filterQuery: filterQuery as string,
    skip: querySkip,
  });

  const isDisabled = !hasEngineBeenInstalled && !loading;
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

  if (isDisabled) {
    return (
      <EuiPanel hasBorder>
        <EnableRiskScore isDisabled={isDisabled} entityType={EntityType.user} />
      </EuiPanel>
    );
  }

  if (
    !loading &&
    hasEngineBeenInstalled &&
    severitySelectionRedux.length === 0 &&
    data &&
    data.length === 0
  ) {
    return <RiskScoresNoDataDetected entityType={EntityType.user} />;
  }

  return (
    <>
      <UserRiskScoreTableManage
        deleteQuery={deleteQuery}
        data={data ?? []}
        id={UserRiskScoreQueryId.USERS_BY_RISK}
        inspect={inspect}
        isInspect={false}
        loading={loading || isKpiLoading}
        loadPage={noop} // It isn't necessary because PaginatedTable updates redux store and we load the page when activePage updates on the store
        refetch={refetch}
        setQuery={setQuery}
        setQuerySkip={setQuerySkip}
        severityCount={severityCount}
        totalCount={totalCount}
        type={type}
      />
    </>
  );
};

UserRiskScoreQueryTabBody.displayName = 'UserRiskScoreQueryTabBody';
