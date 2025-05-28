/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import styled from '@emotion/styled';
import { useDispatch } from 'react-redux';
import { capitalize } from 'lodash/fp';
import { FormattedMessage } from '@kbn/i18n-react';
import { SEVERITY_COLOR } from '../../../overview/components/detection_response/utils';
import { LinkAnchor, useGetSecuritySolutionLinkProps } from '../../../common/components/links';
import {
  Direction,
  EntityType,
  RiskScoreFields,
  RiskSeverity,
} from '../../../../common/search_strategy';
import { getTabsOnHostsUrl } from '../../../common/components/link_to/redirect_to_hosts';
import { SecurityPageName } from '../../../app/types';
import { HostsTableType, HostsType } from '../../../explore/hosts/store/model';
import { hostsActions } from '../../../explore/hosts/store';
import { usersActions } from '../../../explore/users/store';
import { getTabsOnUsersUrl } from '../../../common/components/link_to/redirect_to_users';
import { UsersTableType } from '../../../explore/users/store/model';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { FormattedCount } from '../../../common/components/formatted_number';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { useRiskScoreKpi } from '../../api/hooks/use_risk_score_kpi';
import type { SeverityCount } from '../severity/types';

const StyledEuiTitle = styled(EuiTitle)`
  color: ${SEVERITY_COLOR.critical};
`;

// This is not used by the inspect feature but required by the refresh button
const HOST_RISK_QUERY_ID = 'hostRiskScoreKpiQuery';
const USER_RISK_QUERY_ID = 'userRiskScoreKpiQuery';

export const RiskAnalyticsHeader = () => {
  const { from, to } = useGlobalTime();
  const { filterQuery } = useGlobalFilterQuery();
  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const {
    severityCount: hostsSeverityCount,
    loading: hostRiskLoading,
    inspect: inspectHostRiskScore,
    refetch: refetchHostRiskScore,
  } = useRiskScoreKpi({
    timerange,
    riskEntity: EntityType.host,
    filterQuery,
  });

  const {
    severityCount: usersSeverityCount,
    loading: userRiskLoading,
    refetch: refetchUserRiskScore,
    inspect: inspectUserRiskScore,
  } = useRiskScoreKpi({
    filterQuery,
    timerange,
    riskEntity: EntityType.user,
  });

  const dispatch = useDispatch();
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;

  const [goToHostRiskTabFilteredByCritical, hostRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.hosts,
      path: getTabsOnHostsUrl(HostsTableType.risk),
      onClick: () => {
        dispatch(
          hostsActions.updateHostRiskScoreSeverityFilter({
            severitySelection: [RiskSeverity.Critical],
            hostsType: HostsType.page,
          })
        );

        dispatch(
          hostsActions.updateHostRiskScoreSort({
            sort: { field: RiskScoreFields.hostRiskScore, direction: Direction.desc },
            hostsType: HostsType.page,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const [goToUserRiskTabFilteredByCritical, userRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.risk),
      onClick: () => {
        dispatch(
          usersActions.updateUserRiskScoreSeverityFilter({
            severitySelection: [RiskSeverity.Critical],
          })
        );

        dispatch(
          usersActions.updateTableSorting({
            sort: { field: RiskScoreFields.userRiskScore, direction: Direction.desc },
            tableType: UsersTableType.risk,
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const { deleteQuery, setQuery } = useGlobalTime();

  useQueryInspector({
    queryId: USER_RISK_QUERY_ID,
    loading: userRiskLoading,
    refetch: refetchUserRiskScore,
    setQuery,
    deleteQuery,
    inspect: inspectUserRiskScore,
  });

  useQueryInspector({
    queryId: HOST_RISK_QUERY_ID,
    loading: hostRiskLoading,
    refetch: refetchHostRiskScore,
    setQuery,
    deleteQuery,
    inspect: inspectHostRiskScore,
  });

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup justifyContent="spaceAround" responsive={false}>
        {isPlatinumOrTrialLicense && (
          <>
            <EuiFlexItem grow={false}>
              <CriticalEntitiesCount
                entityType={EntityType.host}
                severityCount={hostsSeverityCount}
                onClick={goToHostRiskTabFilteredByCritical}
                href={hostRiskTabUrl}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CriticalEntitiesCount
                entityType={EntityType.user}
                severityCount={usersSeverityCount}
                onClick={goToUserRiskTabFilteredByCritical}
                href={userRiskTabUrl}
              />
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const CriticalEntitiesCount = ({
  entityType,
  severityCount,
  href,
  onClick,
}: {
  severityCount?: SeverityCount;
  href?: string;
  onClick?: React.MouseEventHandler;
  entityType: EntityType;
}) => {
  const CriticalEntitiesText = (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.header.criticalEntities"
      defaultMessage="Critical {entityType}"
      values={{ entityType: capitalize(entityType) }}
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <EuiFlexItem className="eui-textCenter">
        <StyledEuiTitle data-test-subj={`critical_${entityType}s_quantity`} size="l">
          <span>
            {severityCount ? <FormattedCount count={severityCount[RiskSeverity.Critical]} /> : '-'}
          </span>
        </StyledEuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        {href || onClick ? (
          <LinkAnchor onClick={onClick} href={href} data-test-subj={`critical_${entityType}s_link`}>
            {CriticalEntitiesText}
          </LinkAnchor>
        ) : (
          CriticalEntitiesText
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
