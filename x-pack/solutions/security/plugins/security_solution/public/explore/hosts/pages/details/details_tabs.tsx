/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { TableId } from '@kbn/securitysolution-data-table';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskDetailsTabBody } from '../../../../entity_analytics/components/risk_details_tab_body';
import { HostsType, HostsTableType } from '../../store/model';
import { AnomaliesQueryTabBody } from '../../../../common/containers/anomalies/anomalies_query_tab_body';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { AnomaliesHostTable } from '../../../../common/components/ml/tables/anomalies_host_table';
import { EventsQueryTabBody } from '../../../../common/components/events_tab';

import type { HostDetailsTabsProps } from './types';

import {
  AuthenticationsQueryTabBody,
  UncommonProcessQueryTabBody,
  SessionsTabBody,
} from '../navigation';

export const HostDetailsTabs = React.memo<HostDetailsTabsProps>(
  ({
    detailName,
    filterQuery,
    indexNames,
    indexPattern,
    hostDetailsPagePath,
    hostDetailsFilter,
  }) => {
    const { from, to, isInitializing, deleteQuery, setQuery } = useGlobalTime();

    const tabProps = {
      deleteQuery,
      endDate: to,
      filterQuery,
      skip: isInitializing || filterQuery === undefined,
      setQuery,
      startDate: from,
      type: HostsType.details,
      indexPattern,
      indexNames,
      hostName: detailName,
    };

    return (
      <Routes>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.authentications})`}>
          <AuthenticationsQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}>
          <UncommonProcessQueryTabBody {...tabProps} />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.anomalies})`}>
          <AnomaliesQueryTabBody {...tabProps} AnomaliesTableComponent={AnomaliesHostTable} />
        </Route>

        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.events})`}>
          <EventsQueryTabBody
            additionalFilters={hostDetailsFilter}
            tableId={TableId.hostsPageEvents}
            {...tabProps}
          />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.risk})`}>
          <RiskDetailsTabBody
            {...tabProps}
            riskEntity={RiskScoreEntity.host}
            entityName={tabProps.hostName}
          />
        </Route>
        <Route path={`${hostDetailsPagePath}/:tabName(${HostsTableType.sessions})`}>
          <SessionsTabBody {...tabProps} />
        </Route>
      </Routes>
    );
  }
);

HostDetailsTabs.displayName = 'HostDetailsTabs';
