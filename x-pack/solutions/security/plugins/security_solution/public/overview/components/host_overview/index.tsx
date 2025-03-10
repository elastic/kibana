/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { euiDarkVars as darkTheme, euiLightVars as lightTheme } from '@kbn/ui-theme';
import { getOr } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import { RiskScoreHeaderTitle } from '../../../entity_analytics/components/risk_score_header_title';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../common/components/page/manage_query';
import { FIRST_RECORD_PAGINATION } from '../../../entity_analytics/common';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import { buildHostNamesFilter, type HostItem } from '../../../../common/search_strategy';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { DescriptionList } from '../../../../common/utility_types';
import { useDarkMode } from '../../../common/lib/kibana';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { hostIdRenderer } from '../../../timelines/components/field_renderers/field_renderers';
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
import { EndpointOverview } from './endpoint_overview';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../entity_analytics/components/severity/common';
import { RiskScoreDocTooltip } from '../common';

interface HostSummaryProps {
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  scopeId?: string;
  data: HostItem;
  id: string;
  isInDetailsSidePanel: boolean;
  loading: boolean;
  isLoadingAnomaliesData: boolean;
  indexNames: string[];
  anomaliesData: Anomalies | null;
  startDate: string;
  endDate: string;
  narrowDateRange: NarrowDateRange;
  hostName: string;
  jobNameById: Record<string, string | undefined>;
}

const HostRiskOverviewWrapper = styled(EuiFlexGroup)`
  padding-top: ${({ theme: { euiTheme } }) => euiTheme.size.m};
  width: ${({ $width }: { $width: string }) => $width};
`;

export const HOST_OVERVIEW_RISK_SCORE_QUERY_ID = 'riskInputsTabQuery';

export const HostOverview = React.memo<HostSummaryProps>(
  ({
    anomaliesData,
    contextID,
    scopeId,
    data,
    endDate,
    id,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    isLoadingAnomaliesData,
    indexNames,
    loading,
    narrowDateRange,
    startDate,
    hostName,
    jobNameById,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const darkMode = useDarkMode();
    const filterQuery = useMemo(
      () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
      [hostName]
    );
    const { deleteQuery, setQuery } = useGlobalTime();

    const {
      data: hostRisk,
      isAuthorized,
      inspect: inspectRiskScore,
      loading: loadingRiskScore,
      refetch: refetchRiskScore,
    } = useRiskScore({
      filterQuery,
      riskEntity: EntityType.host,
      skip: hostName == null,
      onlyLatest: false,
      pagination: FIRST_RECORD_PAGINATION,
    });

    useQueryInspector({
      deleteQuery,
      inspect: inspectRiskScore,
      loading: loadingRiskScore,
      queryId: HOST_OVERVIEW_RISK_SCORE_QUERY_ID,
      refetch: refetchRiskScore,
      setQuery,
    });

    const getDefaultRenderer = useCallback(
      (fieldName: string, fieldData: HostItem) => (
        <DefaultFieldRenderer
          rowItems={getOr([], fieldName, fieldData)}
          attrName={fieldName}
          idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
          scopeId={scopeId}
        />
      ),
      [contextID, scopeId]
    );

    const [hostRiskScore, hostRiskLevel] = useMemo(() => {
      const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
      return [
        {
          title: (
            <RiskScoreHeaderTitle title={i18n.HOST_RISK_SCORE} riskScoreEntity={EntityType.host} />
          ),
          description: (
            <>
              {hostRiskData
                ? Math.round(hostRiskData.host.risk.calculated_score_norm)
                : getEmptyTagValue()}
            </>
          ),
        },
        {
          title: (
            <EuiFlexGroup alignItems="flexEnd" gutterSize="none">
              <EuiFlexItem grow={false}>
                <RiskScoreHeaderTitle
                  title={i18n.HOST_RISK_LEVEL}
                  riskScoreEntity={EntityType.host}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <RiskScoreDocTooltip anchorPosition="upCenter" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          description: (
            <>
              {hostRiskData ? (
                <RiskScoreLevel
                  severity={hostRiskData.host.risk.calculated_level}
                  hideBackgroundColor
                />
              ) : (
                getEmptyTagValue()
              )}
            </>
          ),
        },
      ];
    }, [hostRisk]);

    const column: DescriptionList[] = useMemo(
      () => [
        {
          title: i18n.HOST_ID,
          description:
            data && data.host
              ? hostIdRenderer({ host: data.host, noLink: true, scopeId })
              : getEmptyTagValue(),
        },
        {
          title: i18n.FIRST_SEEN,
          description: (
            <FirstLastSeen
              indexPatterns={indexNames}
              field={'host.name'}
              value={hostName}
              type={FirstLastSeenType.FIRST_SEEN}
            />
          ),
        },
        {
          title: i18n.LAST_SEEN,
          description: (
            <FirstLastSeen
              indexPatterns={indexNames}
              field={'host.name'}
              value={hostName}
              type={FirstLastSeenType.LAST_SEEN}
            />
          ),
        },
      ],
      [data, scopeId, indexNames, hostName]
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
            title: i18n.IP_ADDRESSES,
            description: (
              <DefaultFieldRenderer
                rowItems={getOr([], 'host.ip', data)}
                attrName={'host.ip'}
                idPrefix={contextID ? `host-overview-${contextID}` : 'host-overview'}
                scopeId={scopeId}
                render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
              />
            ),
          },
          {
            title: i18n.MAC_ADDRESSES,
            description: getDefaultRenderer('host.mac', data),
          },
          { title: i18n.PLATFORM, description: getDefaultRenderer('host.os.platform', data) },
        ],
        [
          { title: i18n.OS, description: getDefaultRenderer('host.os.name', data) },
          { title: i18n.FAMILY, description: getDefaultRenderer('host.os.family', data) },
          { title: i18n.VERSION, description: getDefaultRenderer('host.os.version', data) },
          { title: i18n.ARCHITECTURE, description: getDefaultRenderer('host.architecture', data) },
        ],
        [
          {
            title: i18n.CLOUD_PROVIDER,
            description: getDefaultRenderer('cloud.provider', data),
          },
          {
            title: i18n.REGION,
            description: getDefaultRenderer('cloud.region', data),
          },
          {
            title: i18n.INSTANCE_ID,
            description: getDefaultRenderer('cloud.instance.id', data),
          },
          {
            title: i18n.MACHINE_TYPE,
            description: getDefaultRenderer('cloud.machine.type', data),
          },
        ],
      ],
      [contextID, scopeId, data, firstColumn, getDefaultRenderer]
    );
    return (
      <>
        <InspectButtonContainer>
          <OverviewWrapper
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="host-overview"
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
          <HostRiskOverviewWrapper
            gutterSize={isInDetailsSidePanel ? 'm' : 'none'}
            direction={isInDetailsSidePanel ? 'column' : 'row'}
            data-test-subj="host-risk-overview"
            $width={isInDetailsSidePanel ? '100%' : '50%'}
          >
            <EuiFlexItem>
              <DescriptionListStyled listItems={[hostRiskScore]} />
            </EuiFlexItem>
            <EuiFlexItem>
              <DescriptionListStyled listItems={[hostRiskLevel]} />
            </EuiFlexItem>
          </HostRiskOverviewWrapper>
        )}

        {data && data.endpoint != null ? (
          <>
            <EuiHorizontalRule />
            <OverviewWrapper direction={isInDetailsSidePanel ? 'column' : 'row'}>
              <EndpointOverview contextID={contextID} data={data.endpoint} scopeId={scopeId} />

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
          </>
        ) : null}
      </>
    );
  }
);

HostOverview.displayName = 'HostOverview';
