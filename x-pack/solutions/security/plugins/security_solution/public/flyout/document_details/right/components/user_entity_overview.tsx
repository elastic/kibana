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
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { MISCONFIGURATION_INSIGHT_USER_ENTITY_OVERVIEW } from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { buildEuidCspPreviewOptions } from '../../../../cloud_security_posture/utils/build_euid_csp_preview_options';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { buildUserNamesFilter } from '../../../../../common/search_strategy';
import type { ESQuery } from '../../../../../common/typed_json';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useNonClosedAlerts } from '../../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { useDocumentDetailsContext } from '../../shared/context';
import type { EntityStoreRecord } from '../../../entity_details/shared/hooks/use_entity_from_store';
import { getRiskFromEntityRecord } from '../../../entity_details/shared/entity_store_risk_utils';
import { PreferenceFormattedDateFromPrimitive } from '../../../../common/components/formatted_date';
import type { DescriptionList } from '../../../../../common/utility_types';
import type { IdentityFields } from '../../shared/utils';
import {
  getField,
  isRiskSeverity,
  mergeLegacyIdentityWhenStoreEntityMissing,
  normalizeRiskLevel,
} from '../../shared/utils';
import { CellActions } from '../../shared/components/cell_actions';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../../common/components/first_last_seen/first_last_seen';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { DescriptionListStyled } from '../../../../common/components/page';
import { OverviewDescriptionList } from '../../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import {
  LAST_SEEN,
  USER_DOMAIN,
  USER_RISK_LEVEL,
} from '../../../../overview/components/user_overview/translations';
import {
  ENTITIES_USER_OVERVIEW_ALERT_COUNT_TEST_ID,
  ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID,
  ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID,
  ENTITIES_USER_OVERVIEW_LINK_TEST_ID,
  ENTITIES_USER_OVERVIEW_LOADING_TEST_ID,
  ENTITIES_USER_OVERVIEW_MISCONFIGURATIONS_TEST_ID,
  ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID,
  ENTITIES_USER_OVERVIEW_TEST_ID,
} from './test_ids';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { RiskScoreDocTooltip } from '../../../../overview/components/common';
import { PreviewLink } from '../../../shared/components/preview_link';
import { MisconfigurationsInsight } from '../../shared/components/misconfiguration_insight';
import { AlertCountInsight } from '../../shared/components/alert_count_insight';
import { useNavigateToUserDetails } from '../../../entity_details/user_right/hooks/use_navigate_to_user_details';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../../overview/components/detection_response/alerts_by_status/types';
import { useSelectedPatterns } from '../../../../data_view_manager/hooks/use_selected_patterns';

const USER_ICON = 'user';
const USER_ENTITY_OVERVIEW_ID = 'user-entity-overview';

export interface UserEntityOverviewProps {
  userName: string;
  identityFields: Record<string, string>;
  /**
   * When provided (e.g. from parent EntitiesOverview), use this record for risk/display
   * so Overview section uses the same entity store data used to decide visibility.
   */
  entityRecord?: EntityStoreRecord | null;
}

export const USER_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.user.userPreviewTitle', {
    defaultMessage: 'Preview user details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * User preview content for the entities preview in right flyout. It contains ip addresses and risk level
 */
export const UserEntityOverview: React.FC<UserEntityOverviewProps> = ({
  userName,
  identityFields,
  entityRecord,
}) => {
  const { scopeId } = useDocumentDetailsContext();
  const { from, to } = useGlobalTime();
  const { selectedPatterns: oldSelectedPatterns } = useSourcererDataView();
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const euidApi = useEntityStoreEuidApi();

  const newDataViewPickerEnabled = useIsExperimentalFeatureEnabled('newDataViewPickerEnabled');
  const experimentalSelectedPatterns = useSelectedPatterns();

  const selectedPatterns = newDataViewPickerEnabled
    ? experimentalSelectedPatterns
    : oldSelectedPatterns;

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const userIdentityFields = useMemo(() => {
    const legacyFields =
      userName != null && userName !== '' ? { 'user.name': userName } : ({} as IdentityFields);
    if (!entityStoreV2Enabled) {
      return legacyFields;
    }
    return mergeLegacyIdentityWhenStoreEntityMissing(identityFields ?? {}, legacyFields);
  }, [entityStoreV2Enabled, userName, identityFields]);

  const riskScoreFilterQuery = useMemo(
    () => (userName ? (buildUserNamesFilter([userName]) as ESQuery) : undefined),
    [userName]
  );

  const riskFromEntityRecord = useMemo(
    () => (entityRecord != null ? getRiskFromEntityRecord(entityRecord) : null),
    [entityRecord]
  );

  const [isUserDetailsLoading, { userDetails }] = useObservedUserDetails({
    userName,
    entityId: entityStoreV2Enabled ? entityRecord?.entity?.id : undefined,
    endDate: to,
    indexNames: selectedPatterns,
    startDate: from,
    skip: entityStoreV2Enabled,
  });

  const {
    data: userRisk,
    isAuthorized: isRiskScoreAuthorized,
    loading: isRiskScoreLoading,
  } = useRiskScore({
    filterQuery: riskScoreFilterQuery,
    riskEntity: EntityType.user,
    skip: entityStoreV2Enabled,
    timerange,
  });
  const userRiskFromSearch = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;

  const userRiskData = useMemo(() => {
    if (entityStoreV2Enabled && entityRecord) {
      const riskFromRecord = getRiskFromEntityRecord(entityRecord);
      if (riskFromRecord != null) {
        return {
          user: {
            name: userName,
            risk: {
              calculated_level: riskFromRecord.calculated_level ?? 'Unknown',
              calculated_score: riskFromRecord.calculated_score,
              calculated_score_norm: riskFromRecord.calculated_score_norm,
            },
          },
        };
      }
    }
    return userRiskFromSearch;
  }, [entityStoreV2Enabled, entityRecord, userName, userRiskFromSearch]);

  const isRiskScoreExist = !!userRiskData?.user?.risk;
  const isAuthorized = entityStoreV2Enabled ? true : isRiskScoreAuthorized;

  const userCspIdentityDoc = entityRecord ?? userIdentityFields;
  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEuidCspPreviewOptions('user', userCspIdentityDoc, euidApi, {
      entityStoreV2Enabled,
      legacyIdentityFields: userIdentityFields,
    })
  );
  const { hasNonClosedAlerts } = useNonClosedAlerts({
    identityFields: userIdentityFields,
    entityType: EntityType.user,
    to,
    from,
    queryId: USER_ENTITY_OVERVIEW_ID,
  });

  const openDetailsPanel = useNavigateToUserDetails({
    userName,
    identityFields: userIdentityFields,
    entityId: entityRecord?.entity?.id,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode: true, // setting to true to always open a new user flyout
    contextID: 'UserEntityOverview',
  });

  const userDetailsForDomain = entityStoreV2Enabled ? entityRecord : userDetails;
  const userDomainValue = useMemo(
    () => getField(getOr([], 'user.domain', userDetailsForDomain)),
    [userDetailsForDomain]
  );
  const userDomain: DescriptionList[] = useMemo(
    () => [
      {
        title: USER_DOMAIN,
        description: userDomainValue ? (
          <CellActions field={'user.domain'} value={userDomainValue}>
            {userDomainValue}
          </CellActions>
        ) : (
          getEmptyTagValue()
        ),
      },
    ],
    [userDomainValue]
  );

  const userLastSeen: DescriptionList[] = useMemo(
    () => [
      {
        title: LAST_SEEN,
        description:
          userName != null && userName !== '' ? (
            entityStoreV2Enabled && entityRecord?.entity?.lifecycle?.last_activity ? (
              <PreferenceFormattedDateFromPrimitive
                value={entityRecord.entity.lifecycle.last_activity}
              />
            ) : !entityStoreV2Enabled ? (
              <FirstLastSeen
                indexPatterns={selectedPatterns}
                field="user.name"
                value={userName}
                type={FirstLastSeenType.LAST_SEEN}
              />
            ) : (
              getEmptyTagValue()
            )
          ) : (
            getEmptyTagValue()
          ),
      },
    ],
    [
      userName,
      selectedPatterns,
      entityStoreV2Enabled,
      entityRecord?.entity?.lifecycle?.last_activity,
    ]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const isLoading = entityStoreV2Enabled
    ? riskFromEntityRecord == null && isRiskScoreLoading
    : isUserDetailsLoading || isRiskScoreLoading;

  const [userRiskLevel] = useMemo(() => {
    const level = userRiskData?.user?.risk?.calculated_level;
    const severity = level != null ? normalizeRiskLevel(level) ?? (level as RiskSeverity) : null;
    return [
      {
        title: (
          <EuiFlexGroup alignItems="flexEnd" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>{USER_RISK_LEVEL}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <RiskScoreDocTooltip />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
        description: (
          <>
            {severity && isRiskSeverity(severity) ? (
              <RiskScoreLevel severity={severity} />
            ) : userRiskData?.user?.risk != null ? (
              <RiskScoreLevel severity="Unknown" />
            ) : (
              getEmptyTagValue()
            )}
          </>
        ),
      },
    ];
  }, [userRiskData]);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      responsive={false}
      data-test-subj={ENTITIES_USER_OVERVIEW_TEST_ID}
    >
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={USER_ICON} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PreviewLink
              field="user.name"
              value={userName}
              entityId={entityRecord?.entity?.id}
              scopeId={scopeId}
              data-test-subj={ENTITIES_USER_OVERVIEW_LINK_TEST_ID}
            >
              <EuiText
                css={css`
                  font-size: ${xsFontSize};
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                {userName}
              </EuiText>
            </PreviewLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {isLoading ? (
          <EuiSkeletonText
            contentAriaLabel={i18n.translate(
              'xpack.securitySolution.flyout.right.insights.entities.userLoadingAriaLabel',
              { defaultMessage: 'user overview' }
            )}
            data-test-subj={ENTITIES_USER_OVERVIEW_LOADING_TEST_ID}
          />
        ) : (
          <EuiFlexGroup responsive={false}>
            <EuiFlexItem>
              <OverviewDescriptionList
                dataTestSubj={ENTITIES_USER_OVERVIEW_DOMAIN_TEST_ID}
                descriptionList={userDomain}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              {isAuthorized ? (
                <DescriptionListStyled
                  data-test-subj={ENTITIES_USER_OVERVIEW_RISK_LEVEL_TEST_ID}
                  listItems={[userRiskLevel]}
                />
              ) : (
                <OverviewDescriptionList
                  dataTestSubj={ENTITIES_USER_OVERVIEW_LAST_SEEN_TEST_ID}
                  descriptionList={userLastSeen}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      <AlertCountInsight
        identityFields={userIdentityFields}
        entityType={EntityType.user}
        queryId={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-${USER_ENTITY_OVERVIEW_ID}`}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_USER_OVERVIEW_ALERT_COUNT_TEST_ID}
      />
      <MisconfigurationsInsight
        identityFields={userIdentityFields}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_USER_OVERVIEW_MISCONFIGURATIONS_TEST_ID}
        telemetryKey={MISCONFIGURATION_INSIGHT_USER_ENTITY_OVERVIEW}
      />
    </EuiFlexGroup>
  );
};
