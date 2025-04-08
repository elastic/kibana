/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import _ from 'lodash';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import type { EntityIdentifierFields } from '../../../common/entity_analytics/types';
import { EntityType } from '../../../common/entity_analytics/types';
import {
  type GetRiskScoreSpikesResponse,
  type SpikeEntity,
} from '../../../common/api/entity_analytics';
import { FlyoutHeader } from '../shared/components/flyout_header';
import { FlyoutBody } from '../shared/components/flyout_body';
import { FlyoutRiskSummary } from '../../entity_analytics/components/risk_summary_flyout/risk_summary';
import { HOST_PANEL_RISK_SCORE_QUERY_ID } from '../entity_details/host_right';
import { USER_PANEL_RISK_SCORE_QUERY_ID } from '../entity_details/user_right';
import { SERVICE_PANEL_RISK_SCORE_QUERY_ID } from '../entity_details/service_right';
import type { RiskScoreState } from '../../entity_analytics/api/hooks/use_risk_score';
import { useRiskScore } from '../../entity_analytics/api/hooks/use_risk_score';
import { useNavigateToServiceDetails } from '../entity_details/service_right/hooks/use_navigate_to_service_details';
import { useNavigateToHostDetails } from '../entity_details/host_right/hooks/use_navigate_to_host_details';
import { useNavigateToUserDetails } from '../entity_details/user_right/hooks/use_navigate_to_user_details';

export interface RiskScoreSpikeDetailsExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'risk-score-spike-details';
  params: RiskScoreSpikeDetailsPanelProps;
}

export const RiskScoreSpikeDetailsPanelKey: RiskScoreSpikeDetailsExpandableFlyoutProps['key'] =
  'risk-score-spike-details';

export interface RiskScoreSpikeDetailsPanelProps extends Record<string, unknown> {
  spikes: GetRiskScoreSpikesResponse;
}

const useOpenDetailsPanel = ({
  entityType,
  identifierField,
  identifier,
  riskScoreState,
}: {
  identifierField: EntityIdentifierFields;
  identifier: string;
  entityType: EntityType;
  riskScoreState: RiskScoreState<typeof entityType>;
}) => {
  const scopeId = useMemo(() => {
    return `${entityType}-${identifier}`;
  }, [entityType, identifier]);

  const riskData =
    ((riskScoreState && riskScoreState?.data?.length) || 0) > 0
      ? riskScoreState!.data![0] // eslint-disable-line @typescript-eslint/no-non-null-assertion
      : undefined;

  const isRiskScoreExist = !!_.get(riskData, `${entityType}.risk`);

  const { hasMisconfigurationFindings } = useHasMisconfigurations(identifierField, identifier);
  const hasNonClosedAlerts = false;

  const { openDetailsPanel: openDetailsPanelUser } = useNavigateToUserDetails({
    userName: identifier,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode: true,
    contextID: 'UserEntityOverview',
  });

  const { openDetailsPanel: openDetailsPanelHost } = useNavigateToHostDetails({
    hostName: identifier,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings: false,
    hasNonClosedAlerts,
    isPreviewMode: true,
    contextID: 'HostEntityOverview',
  });

  const { openDetailsPanel: openDetailsPanelService } = useNavigateToServiceDetails({
    serviceName: identifier,
    scopeId,
    isRiskScoreExist,
    isPreviewMode: true,
    contextID: 'ServiceEntityOverview',
  });

  if (entityType === EntityType.user) {
    return openDetailsPanelUser;
  }
  if (entityType === EntityType.host) {
    return openDetailsPanelHost;
  }
  return openDetailsPanelService;
};

const SpikeSummaryPanel: React.FC<{ spike: SpikeEntity }> = ({ spike }) => {
  let entityType: EntityType = EntityType.host;
  let queryId: string = HOST_PANEL_RISK_SCORE_QUERY_ID;

  if (spike.identifierKey === 'user.name') {
    entityType = EntityType.user;
    queryId = USER_PANEL_RISK_SCORE_QUERY_ID;
  } else if (spike.identifierKey === 'service.name') {
    entityType = EntityType.service;
    queryId = SERVICE_PANEL_RISK_SCORE_QUERY_ID;
  }

  const filterQuery = useMemo(() => {
    return {
      terms: {
        [spike.identifierKey]: [spike.identifier],
      },
    };
  }, [spike.identifier, spike.identifierKey]);

  const riskScoreState = useRiskScore({
    riskEntity: entityType,
    filterQuery,
    onlyLatest: false,
    pagination: {
      cursorStart: 0,
      querySize: 1,
    },
  });

  const openDetailsPanel = useOpenDetailsPanel({
    identifierField: spike.identifierKey as EntityIdentifierFields,
    identifier: spike.identifier,
    entityType,
    riskScoreState,
  });

  let iconType = 'user';

  if (entityType === EntityType.host) {
    iconType = 'storage';
  } else if (entityType === EntityType.service) {
    iconType = 'apmApp';
  }

  return (
    <EuiFlexItem>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="m">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiText>
                      <h3>
                        <EuiIcon type={iconType} /> {spike.identifier}
                      </h3>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty size="s" iconType="magnifyWithPlus" iconSide="right">
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.viewDetails"
                        defaultMessage="Investigate with AI"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="flexStart" gutterSize="s">
                  {!!spike.baseline && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning" iconType="warning">
                        <FormattedMessage
                          id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spikeAboveBaseline"
                          defaultMessage="Score +{spike} above baseline"
                          values={{ spike: Math.round(spike.spike) }}
                        />
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                  {!spike.baseline && (
                    <>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="success" iconType="asterisk">
                          <FormattedMessage
                            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.newScore"
                            defaultMessage="New score"
                          />
                        </EuiBadge>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="danger" iconType="warning">
                          <FormattedMessage
                            id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.highFirstScore"
                            defaultMessage="High first score"
                          />
                        </EuiBadge>
                      </EuiFlexItem>
                    </>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FlyoutRiskSummary
              entityType={entityType}
              riskScoreData={riskScoreState}
              recalculatingScore={false}
              queryId={queryId}
              openDetailsPanel={openDetailsPanel}
              isPreviewMode={false}
              isLinkEnabled={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexItem>
  );
};

/**
 * Panel to be displayed in the RiskScoreSpikeDetails details expandable flyout right section
 */
export const RiskScoreSpikeDetailsPanel: FC<RiskScoreSpikeDetailsPanelProps> = memo(
  ({ spikes }) => {
    const { spikesAboveBaseline = [], newScoreSpikes = [] } = spikes;

    const combinedSpikes = [...spikesAboveBaseline, ...newScoreSpikes];
    return (
      <>
        <FlyoutHeader hasBorder>
          <EuiText>
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spikesTitle"
                defaultMessage="Risk score spikes detected"
              />
            </h2>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.scoreSpikesCallout.spikesDescription"
              defaultMessage="Some entities scores have recently increased significantly. This may indicate a change in the entity's behavior or a new threat."
            />
          </EuiText>
        </FlyoutHeader>
        <FlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            {combinedSpikes.map((spike: SpikeEntity) => (
              <SpikeSummaryPanel spike={spike} />
            ))}
          </EuiFlexGroup>
        </FlyoutBody>
      </>
    );
  }
);

RiskScoreSpikeDetailsPanel.displayName = 'RiskScoreSpikeDetailsPanel';
