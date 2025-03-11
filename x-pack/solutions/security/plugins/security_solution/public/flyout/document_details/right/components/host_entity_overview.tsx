/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
  useEuiTheme,
  useEuiFontSize,
  EuiSkeletonText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import {
  MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW,
  VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { useNonClosedAlerts } from '../../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { buildHostNamesFilter } from '../../../../../common/search_strategy';
import { HOST_NAME_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { useDocumentDetailsContext } from '../../shared/context';
import type { DescriptionList } from '../../../../../common/utility_types';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../common/components/first_last_seen/first_last_seen';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DescriptionListStyled } from '../../../../common/components/page';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { getField } from '../../shared/utils';
import { CellActions } from '../../shared/components/cell_actions';
import {
  FAMILY,
  LAST_SEEN,
  HOST_RISK_LEVEL,
} from '../../../../overview/components/host_overview/translations';
import {
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID,
} from './test_ids';
import { RiskScoreDocTooltip } from '../../../../overview/components/common';
import { PreviewLink } from '../../../shared/components/preview_link';
import { MisconfigurationsInsight } from '../../shared/components/misconfiguration_insight';
import { VulnerabilitiesInsight } from '../../shared/components/vulnerabilities_insight';
import { AlertCountInsight } from '../../shared/components/alert_count_insight';
import { useNavigateToHostDetails } from '../../../entity_details/host_right/hooks/use_navigate_to_host_details';

const HOST_ICON = 'storage';
const HOST_ENTITY_OVERVIEW_ID = 'host-entity-overview';

export interface HostEntityOverviewProps {
  /**
   * Host name for looking up host related ip addresses and risk level
   */
  hostName: string;
}

export const HOST_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.host.hostPreviewTitle', {
    defaultMessage: 'Preview host details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * Host preview content for the entities preview in right flyout. It contains ip addresses and risk level
 */
export const HostEntityOverview: React.FC<HostEntityOverviewProps> = ({ hostName }) => {
  const { scopeId } = useDocumentDetailsContext();
  const { from, to } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const filterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const {
    data: hostRisk,
    isAuthorized,
    loading: isRiskScoreLoading,
  } = useRiskScore({
    filterQuery,
    riskEntity: EntityType.host,
    skip: hostName == null,
    timerange,
  });
  const hostRiskData = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;
  const isRiskScoreExist = !!hostRiskData?.host.risk;

  const [isHostDetailsLoading, { hostDetails }] = useHostDetails({
    hostName,
    indexNames: selectedPatterns,
    startDate: from,
    endDate: to,
  });

  const hostOSFamilyValue = useMemo(
    () => getField(getOr([], 'host.os.family', hostDetails)),
    [hostDetails]
  );
  const hostOSFamily: DescriptionList[] = useMemo(
    () => [
      {
        title: FAMILY,
        description: hostOSFamilyValue ? (
          <CellActions field={'host.os.family'} value={hostOSFamilyValue}>
            {hostOSFamilyValue}
          </CellActions>
        ) : (
          getEmptyTagValue()
        ),
      },
    ],
    [hostOSFamilyValue]
  );

  const hostLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: LAST_SEEN,
        description: (
          <FirstLastSeen
            indexPatterns={selectedPatterns}
            field={HOST_NAME_FIELD_NAME}
            value={hostName}
            type={FirstLastSeenType.LAST_SEEN}
          />
        ),
      },
    ],
    [hostName, selectedPatterns]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const [hostRiskLevel] = useMemo(
    () => [
      {
        title: (
          <EuiFlexGroup alignItems="flexEnd" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>{HOST_RISK_LEVEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RiskScoreDocTooltip />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        description: (
          <>
            {hostRiskData ? (
              <RiskScoreLevel severity={hostRiskData.host.risk.calculated_level} />
            ) : (
              getEmptyTagValue()
            )}
          </>
        ),
      },
    ],
    [hostRiskData]
  );

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    field: EntityIdentifierFields.hostName,
    value: hostName,
    to,
    from,
    queryId: HOST_ENTITY_OVERVIEW_ID,
  });
  const { hasMisconfigurationFindings } = useHasMisconfigurations('host.name', hostName);
  const { hasVulnerabilitiesFindings } = useHasVulnerabilities('host.name', hostName);

  const { openDetailsPanel } = useNavigateToHostDetails({
    hostName,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    isPreviewMode: true, // setting to true to always open a new host flyout
    contextID: 'HostEntityOverview',
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj={ENTITIES_HOST_OVERVIEW_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={HOST_ICON} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewLink
              field={HOST_NAME_FIELD_NAME}
              value={hostName}
              scopeId={scopeId}
              data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
            >
              <EuiText
                css={css`
                  font-size: ${xsFontSize};
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                {hostName}
              </EuiText>
            </PreviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isRiskScoreLoading || isHostDetailsLoading ? (
        <EuiSkeletonText
          data-test-subj={ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.right.insights.entities.hostLoadingAriaLabel',
            { defaultMessage: 'host overview' }
          )}
        />
      ) : (
        <EuiFlexItem>
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <OverviewDescriptionList
                dataTestSubj={ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID}
                descriptionList={hostOSFamily}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {isAuthorized ? (
                <DescriptionListStyled
                  data-test-subj={ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID}
                  listItems={[hostRiskLevel]}
                />
              ) : (
                <OverviewDescriptionList
                  dataTestSubj={ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID}
                  descriptionList={hostLastSeen}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <AlertCountInsight
        fieldName={'host.name'}
        name={hostName}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID}
      />
      <MisconfigurationsInsight
        fieldName={'host.name'}
        name={hostName}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID}
        telemetryKey={MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
      <VulnerabilitiesInsight
        hostName={hostName}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID}
        telemetryKey={VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
