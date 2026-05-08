/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiText,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import get from 'lodash/get';
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import {
  MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW,
  VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useHasVulnerabilities } from '@kbn/cloud-security-posture/src/hooks/use_has_vulnerabilities';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { buildEuidCspPreviewOptions } from '../../../cloud_security_posture/utils/build_euid_csp_preview_options';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useNonClosedAlerts } from '../../../cloud_security_posture/hooks/use_non_closed_alerts';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { buildHostNamesFilter } from '../../../../common/search_strategy';
import { HOST_NAME_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { useRiskScore } from '../../../entity_analytics/api/hooks/use_risk_score';
import type { EntityStoreRecord } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { getRiskFromEntityRecord } from '../../../flyout/entity_details/shared/entity_store_risk_utils';
import { PreferenceFormattedDateFromPrimitive } from '../../../common/components/formatted_date';
import type { DescriptionList } from '../../../../common/utility_types';
import {
  FirstLastSeen,
  FirstLastSeenType,
} from '../../../common/components/first_last_seen/first_last_seen';
import { EntityType } from '../../../../common/entity_analytics/types';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { DescriptionListStyled } from '../../../common/components/page';
import { OverviewDescriptionList } from '../../../common/components/overview_description_list';
import { RiskScoreLevel } from '../../../entity_analytics/components/severity/common';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import type { IdentityFields } from '../../../flyout/document_details/shared/utils';
import {
  getField,
  isRiskSeverity,
  mergeLegacyIdentityWhenStoreEntityMissing,
  normalizeRiskLevel,
} from '../../../flyout/document_details/shared/utils';
import {
  noopCellActionRenderer,
  type CellActionRenderer,
} from '../../shared/components/cell_actions';
import {
  FAMILY,
  HOST_RISK_LEVEL,
  LAST_SEEN,
} from '../../../overview/components/host_overview/translations';
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
import { RiskScoreDocTooltip } from '../../../overview/components/common';
import { PreviewLink } from '../../../flyout/shared/components/preview_link';
import { MisconfigurationsInsight } from '../../../flyout/document_details/shared/components/misconfiguration_insight';
import { VulnerabilitiesInsight } from '../../../flyout/document_details/shared/components/vulnerabilities_insight';
import { AlertCountInsight } from '../../../flyout/document_details/shared/components/alert_count_insight';
import { useNavigateToHostDetails } from '../../../flyout/entity_details/host_right/hooks/use_navigate_to_host_details';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from '../../../overview/components/detection_response/alerts_by_status/types';
import { useSelectedPatterns } from '../../../data_view_manager/hooks/use_selected_patterns';

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
  entityRecord?: EntityStoreRecord | null;
  /**
   * Scope id used by cell actions and preview link.
   */
  scopeId?: string;
  /**
   * Renderer for cell actions on field values. Falls back to a no-op when not provided.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * When provided, overrides the default expandable-flyout-based navigation.
   * Required for flyout_v2, where the expandable-flyout actions have no listener.
   * Called with `undefined` for the host name link and with a path for alert/misconfig links.
   */
  onShowDetails?: (path?: EntityDetailsPath) => void;
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
export const HostEntityOverview: React.FC<HostEntityOverviewProps> = ({
  hostName,
  identityFields,
  entityRecord: entityRecordProp,
  scopeId = '',
  renderCellActions = noopCellActionRenderer,
  onShowDetails,
}) => {
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

  const filterQuery = useMemo(
    () => (hostName ? buildHostNamesFilter([hostName]) : undefined),
    [hostName]
  );

  const hostIdentityFields = useMemo(() => {
    const legacyFields =
      hostName != null && hostName !== '' ? { 'host.name': hostName } : ({} as IdentityFields);
    if (!entityStoreV2Enabled) {
      return legacyFields;
    }
    return mergeLegacyIdentityWhenStoreEntityMissing(identityFields ?? {}, legacyFields);
  }, [entityStoreV2Enabled, hostName, identityFields]);

  const storeHostEntityId = hostIdentityFields['entity.id'];

  const entityFromStore = useEntityFromStore({
    entityId: storeHostEntityId,
    identityFields: hostIdentityFields,
    entityType: 'host',
    skip: !entityStoreV2Enabled || entityRecordProp != null,
  });
  const entityRecord = entityRecordProp ?? entityFromStore.entityRecord;

  const riskFromEntityRecord = useMemo(
    () => (entityRecord != null ? getRiskFromEntityRecord(entityRecord) : null),
    [entityRecord]
  );

  const {
    data: hostRisk,
    isAuthorized: isRiskScoreAuthorized,
    loading: isRiskScoreLoading,
  } = useRiskScore({
    filterQuery,
    riskEntity: EntityType.host,
    skip: (entityStoreV2Enabled && riskFromEntityRecord != null) || hostName == null,
    timerange,
  });
  const hostRiskFromSearch = hostRisk && hostRisk.length > 0 ? hostRisk[0] : undefined;

  const [isHostDetailsLoading, { hostDetails }] = useHostDetails({
    hostName,
    entityId: entityStoreV2Enabled ? storeHostEntityId : undefined,
    indexNames: selectedPatterns,
    startDate: from,
    endDate: to,
  });

  const hostRiskData = useMemo(() => {
    if (entityStoreV2Enabled && entityRecord) {
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
  }, [entityStoreV2Enabled, entityRecord, hostName, hostRiskFromSearch]);

  const isRiskScoreExist = !!hostRiskData?.host?.risk;
  const isAuthorized = entityStoreV2Enabled ? true : isRiskScoreAuthorized;

  const hostOSFamilyValue = useMemo(() => {
    if (entityStoreV2Enabled && entityRecord != null) {
      return getField(get(entityRecord, 'host.os.family'));
    }
    if (entityStoreV2Enabled) {
      return null;
    }
    return getField(getOr([], 'host.os.family', hostDetails));
  }, [entityRecord, entityStoreV2Enabled, hostDetails]);
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
            entityStoreV2Enabled && entityFromStore.lastSeen ? (
              <PreferenceFormattedDateFromPrimitive value={entityFromStore.lastSeen} />
            ) : !entityStoreV2Enabled ? (
              <FirstLastSeen
                indexPatterns={selectedPatterns}
                field={HOST_NAME_FIELD_NAME}
                value={hostName}
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
    [hostName, selectedPatterns, entityStoreV2Enabled, entityFromStore.lastSeen]
  );

  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const isLoading = entityStoreV2Enabled
    ? entityFromStore.isLoading || (riskFromEntityRecord == null && isRiskScoreLoading)
    : isRiskScoreLoading || isHostDetailsLoading;

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

  const { hasNonClosedAlerts } = useNonClosedAlerts({
    identityFields: hostIdentityFields,
    entityType: EntityType.host,
    to,
    from,
    queryId: HOST_ENTITY_OVERVIEW_ID,
  });
  const hostCspIdentityDoc = entityRecord ?? hostIdentityFields;
  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    buildEuidCspPreviewOptions('host', hostCspIdentityDoc, euidApi, {
      entityStoreV2Enabled,
      legacyIdentityFields: hostIdentityFields,
    })
  );
  const { hasVulnerabilitiesFindings } = useHasVulnerabilities(
    buildEuidCspPreviewOptions('host', hostCspIdentityDoc, euidApi, {
      entityStoreV2Enabled,
      legacyIdentityFields: hostIdentityFields,
    })
  );

  const navigateToHostDetails = useNavigateToHostDetails({
    hostName,
    entityId: entityRecord?.entity?.id,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasVulnerabilitiesFindings,
    hasNonClosedAlerts,
    isPreviewMode: true, // setting to true to always open a new host flyout
    contextID: 'HostEntityOverview',
  });
  const openDetailsPanel = onShowDetails ?? navigateToHostDetails;

  const handleNameClick = useCallback(() => onShowDetails?.(), [onShowDetails]);
  const nameTextStyles = css`
    font-size: ${xsFontSize};
    font-weight: ${euiTheme.font.weight.bold};
  `;
  const nameText = <EuiText css={nameTextStyles}>{hostName}</EuiText>;

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
            {onShowDetails ? (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.securitySolution.flyout.document.insights.entities.hostPreviewTooltip',
                  { defaultMessage: 'Show host details' }
                )}
              >
                <EuiLink
                  onClick={handleNameClick}
                  data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
                >
                  {nameText}
                </EuiLink>
              </EuiToolTip>
            ) : (
              <PreviewLink
                field="host.name"
                value={hostName}
                entityId={entityRecord?.entity?.id}
                scopeId={scopeId}
                data-test-subj={ENTITIES_HOST_OVERVIEW_LINK_TEST_ID}
              >
                {nameText}
              </PreviewLink>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {isLoading ? (
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
        entityRecord={entityRecord}
        identityFields={hostIdentityFields}
        entityType={EntityType.host}
        queryId={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-${HOST_ENTITY_OVERVIEW_ID}`}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_ALERT_COUNT_TEST_ID}
      />
      <MisconfigurationsInsight
        identityFields={hostIdentityFields}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_MISCONFIGURATIONS_TEST_ID}
        telemetryKey={MISCONFIGURATION_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
      <VulnerabilitiesInsight
        identityFields={hostIdentityFields}
        openDetailsPanel={openDetailsPanel}
        data-test-subj={ENTITIES_HOST_OVERVIEW_VULNERABILITIES_TEST_ID}
        telemetryKey={VULNERABILITIES_INSIGHT_HOST_ENTITY_OVERVIEW}
      />
    </EuiFlexGroup>
  );
};

HostEntityOverview.displayName = 'HostEntityOverview';
