/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useDispatch } from 'react-redux';
import { EntityType } from '../../../../common/entity_analytics/types';
import { getTabsOnUsersUrl } from '../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../explore/users/store/model';

import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { HostsTableType, HostsType } from '../../../explore/hosts/store/model';
import { usersActions } from '../../../explore/users/store';
import { hostsActions } from '../../../explore/hosts/store';
import { SecurityPageName } from '../../../app/types';

export const useEntityInfo = (riskEntity: EntityType) => {
  const dispatch = useDispatch();

  const tableQueryIds = {
    tableQueryId: `${riskEntity}RiskDashboardTable`,
    kpiQueryId: `${riskEntity}HeaderRiskScoreKpiQuery`,
  };

  if (riskEntity === EntityType.host) {
    return {
      linkProps: {
        deepLinkId: SecurityPageName.hosts,
        path: getTabsOnHostsUrl(HostsTableType.risk),
        onClick: () => {
          dispatch(
            hostsActions.updateHostRiskScoreSeverityFilter({
              severitySelection: [],
              hostsType: HostsType.page,
            })
          );
        },
      },
      ...tableQueryIds,
    };
  } else if (riskEntity === EntityType.user) {
    return {
      linkProps: {
        deepLinkId: SecurityPageName.users,
        path: getTabsOnUsersUrl(UsersTableType.risk),
        onClick: () => {
          dispatch(
            usersActions.updateUserRiskScoreSeverityFilter({
              severitySelection: [],
            })
          );
        },
      },
      ...tableQueryIds,
    };
  }
  return {
    linkProps: undefined,
    ...tableQueryIds,
  };
};
