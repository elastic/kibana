/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiDarkVars as darkTheme, euiLightVars as lightTheme } from '@kbn/ui-theme';
import React from 'react';

import type { DescriptionList } from '../../../../../common/utility_types';
import { useDarkMode } from '../../../../common/lib/kibana';
import type {
  FlowTargetSourceDest,
  NetworkDetailsStrategyResponse,
} from '../../../../../common/search_strategy';
import type { networkModel } from '../../store';
import { getEmptyTagValue } from '../../../../common/components/empty_value';

import {
  autonomousSystemRenderer,
  hostIdRenderer,
  hostNameRenderer,
  locationRenderer,
  reputationRenderer,
  whoisRenderer,
} from '../../../../timelines/components/field_renderers/field_renderers';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../common/components/first_last_seen/first_last_seen';
import * as i18n from './translations';
import { OverviewWrapper } from '../../../../common/components/page';
import { Loader } from '../../../../common/components/loader';
import type { Anomalies, NarrowDateRange } from '../../../../common/components/ml/types';
import { AnomalyScores } from '../../../../common/components/ml/score/anomaly_scores';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../../../common/machine_learning/has_ml_user_permissions';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import type { SourcererScopeName } from '../../../../sourcerer/store/model';

export interface IpOverviewProps {
  anomaliesData: Anomalies | null;
  contextID?: string; // used to provide unique draggable context when viewing in the side panel
  data: NetworkDetailsStrategyResponse['networkDetails'];
  endDate: string;
  flowTarget: FlowTargetSourceDest;
  id: string;
  ip: string;
  isInDetailsSidePanel: boolean;
  isLoadingAnomaliesData: boolean;
  loading: boolean;
  narrowDateRange: NarrowDateRange;
  scopeId: SourcererScopeName;
  startDate: string;
  type: networkModel.NetworkType;
  indexPatterns: string[];
  jobNameById: Record<string, string | undefined>;
}

export const IpOverview = React.memo<IpOverviewProps>(
  ({
    contextID,
    id,
    ip,
    data,
    isInDetailsSidePanel = false, // Rather than duplicate the component, alter the structure based on it's location
    loading,
    flowTarget,
    startDate,
    endDate,
    isLoadingAnomaliesData,
    anomaliesData,
    narrowDateRange,
    scopeId,
    indexPatterns,
    jobNameById,
  }) => {
    const capabilities = useMlCapabilities();
    const userPermissions = hasMlUserPermissions(capabilities);
    const darkMode = useDarkMode();
    const typeData = data[flowTarget];
    const column: DescriptionList[] = [
      {
        title: i18n.LOCATION,
        description: locationRenderer(
          [`${flowTarget}.geo.city_name`, `${flowTarget}.geo.region_name`],
          data,
          contextID
        ),
      },
      {
        title: i18n.AUTONOMOUS_SYSTEM,
        description: typeData
          ? autonomousSystemRenderer(typeData.autonomousSystem, flowTarget, contextID)
          : getEmptyTagValue(),
      },
    ];

    const firstColumn: DescriptionList[] = userPermissions
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
      : column;

    const descriptionLists: Readonly<DescriptionList[][]> = [
      firstColumn,
      [
        {
          title: i18n.FIRST_SEEN,
          description: (
            <FirstLastSeen
              indexPatterns={indexPatterns}
              field={`${flowTarget}.ip`}
              value={ip}
              type={FirstLastSeenType.FIRST_SEEN}
            />
          ),
        },
        {
          title: i18n.LAST_SEEN,
          description: (
            <FirstLastSeen
              indexPatterns={indexPatterns}
              field={`${flowTarget}.ip`}
              value={ip}
              type={FirstLastSeenType.LAST_SEEN}
            />
          ),
        },
      ],
      [
        {
          title: i18n.HOST_ID,
          description:
            typeData && data.host
              ? hostIdRenderer({
                  host: data.host,
                  ipFilter: ip,
                  contextID,
                  scopeId,
                })
              : getEmptyTagValue(),
        },
        {
          title: i18n.HOST_NAME,
          description:
            typeData && data.host
              ? hostNameRenderer(scopeId, data.host, ip, contextID)
              : getEmptyTagValue(),
        },
      ],
      [
        { title: i18n.WHOIS, description: whoisRenderer(ip) },
        { title: i18n.REPUTATION, description: reputationRenderer(ip) },
      ],
    ];

    return (
      <InspectButtonContainer>
        <OverviewWrapper direction={isInDetailsSidePanel ? 'column' : 'row'}>
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
    );
  }
);

IpOverview.displayName = 'IpOverview';
