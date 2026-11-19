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
  EuiIcon,
  EuiSkeletonText,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import get from 'lodash/get';
import { i18n } from '@kbn/i18n';
import {
  MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW,
  VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { buildHostNamesFilter } from '../../../../../common/search_strategy';
import type { HostEntity } from '../../../../../common/api/entity_analytics';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { getRiskFromEntityRecord } from '../../../../flyout/entity_details/shared/entity_store_risk_utils';
import { PreferenceFormattedDateFromPrimitive } from '../../../../common/components/formatted_date';
import type { DescriptionList } from '../../../../../common/utility_types';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DescriptionListStyled } from '../../../../common/components/page';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { IdentityFields } from '../../../../flyout/document_details/shared/utils';
import {
  getField,
  isRiskSeverity,
  mergeLegacyIdentityWhenStoreEntityMissing,
  normalizeRiskLevel,
} from '../../../../flyout/document_details/shared/utils';
import {
  noopCellActionRenderer,
  type CellActionRenderer,
} from '../../../shared/components/cell_actions';
import {
  FAMILY,
  HOST_RISK_LEVEL,
  LAST_SEEN,
} from '../../../../overview/components/host_overview/translations';
import {
  ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LINK_TEST_ID,
  ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_HOST_OVERVIEW_OS_FAMILY_TEST_ID,
  ENTITIES_HOST_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_HOST_OVERVIEW_TEST_ID,
  ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID,
} from './test_ids';
import { RiskScoreDocTooltip } from '../../../../overview/components/common';
import { MisconfigurationsInsight } from './misconfiguration_insight';
import { VulnerabilitiesInsight } from './vulnerabilities_insight';
import { AlertCountInsight } from './alert_count_insight';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../../overview/components/detection_response/alerts_by_status/types';

const HOST_ICON = 'storage';
const HOST_ENTITY_OVERVIEW_ID = 'host-entity-overview';

export interface HostEntityOverviewProps {
  /**
   * Host name
   */
  hostName: string;
  /**
   * Entity identifiers for looking up host related ip addresses and risk level
   */
  identityFields?: Record<string, string>;
  /**
   * When provided (e.g. from parent EntitiesOverview), use this record for risk/display
   * so Overview section uses the same entity store data used to decide visibility.
   */
  entityRecord?: HostEntity | null;
  /**
   * Scope id used by cell actions and preview link.
   */
  scopeId?: string;
  /**
   * Renderer for cell actions on field values. Falls back to a no-op when not provided.
   */
  renderCellActions?: CellActionRenderer;
}

/**
 * Host preview content for the entities preview in right flyout. It contains ip addresses and risk level
 */
export const HostEntityOverview: React.FC<HostEntityOverviewProps> = ({
  hostName,
  identityFields,
  entityRecord,
  scopeId = '',
  renderCellActions = noopCellActionRenderer,
}) => {
  const { from, to } = useGlobalTime();

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

  const hostIdentityFields = useMemo(() => {
    const legacyFields =
      hostName != null && hostName !== '' ? { 'host.name': hostName } : ({} as IdentityFields);
    return mergeLegacyIdentityWhenStoreEntityMissing(identityFields ?? {}, legacyFields);
  }, [hostName, identityFields]);

  const riskFromEntityRecord = useMemo(
    () => (entityRecord != null ? getRiskFromEntityRecord(entityRecord) : null),
    [entityRecord]
  );

  const { data: hostRisk, loading: isRiskScoreLoading } = useRiskScore({
    filterQuery,
    riskEntity: EntityType.host,
    skip: riskFromEntityRecord != null || hostName == null,
    timerange,
  });
  const hostRiskFromSearch = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;

  const hostRiskData = useMemo(() => {
    if (entityRecord) {
      const riskFromRecord = getRiskFromEntityRecord(entityRecord);
      if (riskFromRecord != null) {
        return {
          host: {
            name: hostName,
            risk: {
              calculated_level: riskFromRecord.calculated_level ?? 'Unknown',
              calculated_score: riskFromRecord.calculated_score,
              calculated_score_norm: riskFromRecord.calculated_score_norm,
            },
          },
        };
      }
    }
    return hostRiskFromSearch;
  }, [entityRecord, hostName, hostRiskFromSearch]);

  const isAuthorized = true;

  const hostOSFamilyValue = useMemo(() => {
    if (entityRecord != null) {
      return getField(get(entityRecord, 'host.os.family'));
    }
    return null;
  }, [entityRecord]);
  const hostOSFamily: DescriptionList[] = useMemo(
    () => [
      {
        title: FAMILY,
        description: hostOSFamilyValue
          ? renderCellActions({
              field: 'host.os.family',
              value: hostOSFamilyValue,
              scopeId,
              children: <>{hostOSFamilyValue}</>,
            }) ?? getEmptyTagValue()
          : getEmptyTagValue(),
      },
    ],
    [hostOSFamilyValue, renderCellActions, scopeId]
  );

  const hostLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: LAST_SEEN,
        description:
          hostName != null && hostName !== '' ? (
            entityRecord?.entity?.lifecycle?.last_activity ? (
              <PreferenceFormattedDateFromPrimitive
                value={entityRecord.entity.lifecycle.last_activity}
              />
            ) : (
              getEmptyTagValue()
            )
          ) : (
            getEmptyTagValue()
          ),
      },
    ],
    [hostName, entityRecord?.entity?.lifecycle?.last_activity]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const isLoading = riskFromEntityRecord == null && isRiskScoreLoading;

  const [hostRiskLevel] = useMemo(() => {
    const level = hostRiskData?.host?.risk?.calculated_level;
    const severity = level != null ? normalizeRiskLevel(level) ?? (level as RiskSeverity) : null;
    return [
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
            {severity && isRiskSeverity(severity) ? (
              <RiskScoreLevel severity={severity} />
            ) : hostRiskData?.host?.risk != null ? (
              <RiskScoreLevel severity="Unknown" />
            ) : (
              getEmptyTagValue()
            )}
          </>
        ),
      },
    ];
  }, [hostRiskData]);

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
            <EuiIcon type={HOST_ICON} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText
              data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
              css={css`
                font-size: ${xsFontSize};
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              {hostName}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isLoading ? (
        <EuiSkeletonText
          data-test-subj={ENTITIES_HOST_OVERVIEW_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.document.insights.entities.hostLoadingAriaLabel',
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
        entityRecord={entityRecord}
        identityFields={hostIdentityFields}
        entityType={EntityType.host}
        queryId={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-${HOST_ENTITY_OVERVIEW_ID}`}
        data-test-subj={ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID}
      />
      <MisconfigurationsInsight
        identityFields={hostIdentityFields}
        data-test-subj={ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID}
        telemetryKey={MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
      <VulnerabilitiesInsight
        identityFields={hostIdentityFields}
        data-test-subj={ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID}
        telemetryKey={VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
