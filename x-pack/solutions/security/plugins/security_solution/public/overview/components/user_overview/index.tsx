/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiDarkVars as darkTheme, euiLightVars as lightTheme } from '@kbn/ui-theme';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { buildUserNamesFilter } from '../../../../common/search_strategy';
import { RiskScoreHeaderTitle } from '../../../entity_analytics/components/risk_score_header_title';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { FIRST_RECORD_PAGINATION } from '../../../entity_analytics/common';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { DescriptionList } from '../../../../common/utility_types';
import { useDarkMode } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/default_renderer';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../common/components/first_last_seen/first_last_seen';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { Loader } from '../../../common/components/loader';
import { NetworkDetailsLink } from '../../../common/components/links';
import { hasMlUserPermissions } from '../../../../common/machine_learning/has_ml_user_permissions';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { AnomalyScores } from '../../../common/components/ml/score/anomaly_scores';
import type { Anomalies, NarrowDateRange } from '../../../common/components/ml/types';
import { DescriptionListStyled, OverviewWrapper } from '../../../common/components/page';

import * as i18n from './translations';

import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../entity_analytics/components/severity/common';
import type { UserItem } from '../../../../common/search_strategy/security_solution/users/common';
import { RiskScoreDocTooltip } from '../common';

export interface UserSummaryProps {
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  scopeId?: string;
  data: UserItem;
  id: string;
  isInDetailsSidePanel: boolean;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  anomaliesData: Anomalies | null;
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
  userName: string;
  indexPatterns: string[];
  jobNameById: Record<string, string | undefined>;
}

const UserRiskOverviewWrapper = styled(EuiFlexGroup)`
  padding-top: ${({ theme: { euiTheme } }) => euiTheme.size.m};
  width: ${({ $width }: { $width: string }) => $width};
`;

export const USER_OVERVIEW_RISK_SCORE_QUERY_ID = 'riskInputsTabQuery';

export const UserOverview = React.memo<UserSummaryProps>(
  ({
    anomaliesData,
    contextID,
    scopeId,
    data,
    id,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    isLoadingAnomaliesData,
    loading,
    narrowDateRange,
    startDate,
    endDate,
    userName,
    indexPatterns,
    jobNameById,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const darkMode = useDarkMode();
    const filterQuery = useMemo(
      () => (userName ? buildUserNamesFilter([userName]) : undefined),
      [userName]
    );
    const { deleteQuery, setQuery } = useGlobalTime();

    const {
      data: userRisk,
      isAuthorized,
      inspect: inspectRiskScore,
      loading: loadingRiskScore,
      refetch: refetchRiskScore,
    } = useRiskScore({
      filterQuery,
      skip: userName == null,
      riskEntity: EntityType.user,
      onlyLatest: false,
      pagination: FIRST_RECORD_PAGINATION,
    });

    useQueryInspector({
      deleteQuery,
      inspect: inspectRiskScore,
      loading: loadingRiskScore,
      queryId: USER_OVERVIEW_RISK_SCORE_QUERY_ID,
      refetch: refetchRiskScore,
      setQuery,
    });

    const getDefaultRenderer = useCallback(
      (fieldName: string, fieldData: UserItem) => (
        <DefaultFieldRenderer
          rowItems={getOr([], fieldName, fieldData)}
          attrName={fieldName}
          idPrefix={contextID ? `user-overview-${contextID}` : 'user-overview'}
          scopeId={scopeId}
        />
      ),
      [contextID, scopeId]
    );

    const [userRiskScore, userRiskLevel] = useMemo(() => {
      const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
      return [
        {
          title: (
            <RiskScoreHeaderTitle title={i18n.USER_RISK_SCORE} riskScoreEntity={EntityType.user} />
          ),
          description: (
            <>
              {userRiskData
                ? Math.round(userRiskData.user.risk.calculated_score_norm)
                : getEmptyTagValue()}
            </>
          ),
        },
        {
          title: (
            <EuiFlexGroup alignItems="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false}>
                <RiskScoreHeaderTitle
                  title={i18n.USER_RISK_LEVEL}
                  riskScoreEntity={EntityType.user}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RiskScoreDocTooltip anchorPosition="upCenter" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          description: (
            <>
              {userRiskData ? (
                <RiskScoreLevel
                  severity={userRiskData.user.risk.calculated_level}
                  hideBackgroundColor
                />
              ) : (
                getEmptyTagValue()
              )}
            </>
          ),
        },
      ];
    }, [userRisk]);

    const column = useMemo(
      () => [
        {
          title: i18n.USER_ID,
          description: data && data.user ? getDefaultRenderer('user.id', data) : getEmptyTagValue(),
        },
        {
          title: i18n.USER_DOMAIN,
          description:
            data && data.user ? getDefaultRenderer('user.domain', data) : getEmptyTagValue(),
        },
      ],
      [data, getDefaultRenderer]
    );

    const firstColumn = useMemo(
      () =>
        userPermissions
          ? [
              ...column,
              {
                title: i18n.MAX_ANOMALY_SCORE_BY_JOB,
                description: (
                  <AnomalyScores
                    anomalies={anomaliesData}
                    startDate={startDate}
                    endDate={endDate}
                    isLoading={isLoadingAnomaliesData}
                    narrowDateRange={narrowDateRange}
                    jobNameById={jobNameById}
                  />
                ),
              },
            ]
          : column,
      [
        anomaliesData,
        column,
        endDate,
        isLoadingAnomaliesData,
        narrowDateRange,
        startDate,
        userPermissions,
        jobNameById,
      ]
    );

    const descriptionLists: Readonly<DescriptionList[][]> = useMemo(
      () => [
        firstColumn,
        [
          {
            title: i18n.FIRST_SEEN,
            description: (
              <FirstLastSeen
                indexPatterns={indexPatterns}
                field={'user.name'}
                value={userName}
                type={FirstLastSeenType.FIRST_SEEN}
              />
            ),
          },
          {
            title: i18n.LAST_SEEN,
            description: (
              <FirstLastSeen
                indexPatterns={indexPatterns}
                field={'user.name'}
                value={userName}
                type={FirstLastSeenType.LAST_SEEN}
              />
            ),
          },
        ],
        [
          {
            title: i18n.HOST_OS,
            description: getDefaultRenderer('host.os.name', data),
          },

          {
            title: i18n.HOST_FAMILY,
            description: getDefaultRenderer('host.os.family', data),
          },
          {
            title: i18n.HOST_IP,
            description: (
              <DefaultFieldRenderer
                rowItems={getOr([], 'host.ip', data)}
                attrName={'host.ip'}
                idPrefix={contextID ? `user-overview-${contextID}` : 'user-overview'}
                scopeId={scopeId}
                render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
              />
            ),
          },
        ],
      ],
      [data, indexPatterns, getDefaultRenderer, contextID, scopeId, userName, firstColumn]
    );
    return (
      <>
        <InspectButtonContainer>
          <OverviewWrapper
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="user-overview"
          >
            {!isInDetailsSidePanel && (
              <InspectButton queryId={id} title={i18n.INSPECT_TITLE} inspectIndex={0} />
            )}
            {descriptionLists.map((descriptionList, index) => (
              <OverviewDescriptionList descriptionList={descriptionList} key={index} />
            ))}

            {loading && (
              <Loader
                overlay
                overlayBackground={
                  darkMode ? darkTheme.euiPageBackgroundColor : lightTheme.euiPageBackgroundColor
                }
                size="xl"
              />
            )}
          </OverviewWrapper>
        </InspectButtonContainer>
        {isAuthorized && (
          <UserRiskOverviewWrapper
            gutterSize={isInDetailsSidePanel ? 'm' : 'none'}
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="user-risk-overview"
            $width={isInDetailsSidePanel ? '100%' : '66.6%'}
          >
            <EuiFlexItem>
              <DescriptionListStyled listItems={[userRiskScore]} />
            </EuiFlexItem>
            <EuiFlexItem>
              <DescriptionListStyled listItems={[userRiskLevel]} />
            </EuiFlexItem>
          </UserRiskOverviewWrapper>
        )}
      </>
    );
  }
);

UserOverview.displayName = 'UserOverview';
