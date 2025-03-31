/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuid } from 'uuid';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { MISCONFIGURATION_INSIGHT_USER_DETAILS } from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { useHasMisconfigurations } from '@kbn/cloud-security-posture/src/hooks/use_has_misconfigurations';
import { useNonClosedAlerts } from '../../../../cloud_security_posture/hooks/use_non_closed_alerts';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import type { RelatedHost } from '../../../../../common/search_strategy/security_solution/related_entities/related_hosts';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { UserOverview } from '../../../../overview/components/user_overview';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { EntityIdentifierFields, EntityType } from '../../../../../common/entity_analytics/types';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/default_renderer';
import { CellActions } from '../../shared/components/cell_actions';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { useObservedUserDetails } from '../../../../explore/users/containers/users/observed_details';
import { useUserRelatedHosts } from '../../../../common/containers/related_entities/related_hosts';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import {
  USER_DETAILS_ALERT_COUNT_TEST_ID,
  USER_DETAILS_MISCONFIGURATIONS_TEST_ID,
  USER_DETAILS_RELATED_HOSTS_IP_LINK_TEST_ID,
  USER_DETAILS_RELATED_HOSTS_LINK_TEST_ID,
  USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID,
  USER_DETAILS_TEST_ID,
} from './test_ids';
import {
  HOST_IP_FIELD_NAME,
  HOST_NAME_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { ENTITY_RISK_LEVEL } from '../../../../entity_analytics/components/risk_score/translations';
import { useHasSecurityCapability } from '../../../../helper_hooks';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../right/components/user_entity_overview';
import { PreviewLink } from '../../../shared/components/preview_link';
import type { NarrowDateRange } from '../../../../common/components/ml/types';
import { MisconfigurationsInsight } from '../../shared/components/misconfiguration_insight';
import { AlertCountInsight } from '../../shared/components/alert_count_insight';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';
import { useNavigateToUserDetails } from '../../../entity_details/user_right/hooks/use_navigate_to_user_details';
import { useRiskScore } from '../../../../entity_analytics/api/hooks/use_risk_score';
import { buildUserNamesFilter } from '../../../../../common/search_strategy';

const USER_DETAILS_ID = 'entities-users-details';
const RELATED_HOSTS_ID = 'entities-users-related-hosts';
const USER_DETAILS_INSIGHTS_ID = 'user-details-insights';

const UserOverviewManage = manageQuery(UserOverview);
const RelatedHostsManage = manageQuery(InspectButtonContainer);

export interface UserDetailsProps {
  /**
   * User name for the entities details
   */
  userName: string;
  /**
   * timestamp of alert or event
   */
  timestamp: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * User details and related users, displayed in the document details expandable flyout left section under the Insights tab, Entities tab
 */
export const UserDetails: React.FC<UserDetailsProps> = ({ userName, timestamp, scopeId }) => {
  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();
  const dispatch = useDispatch();
  const { telemetry } = useKibana().services;
  // create a unique, but stable (across re-renders) query id
  const userDetailsQueryId = useMemo(() => `${USER_DETAILS_ID}-${uuid()}`, []);
  const relatedHostsQueryId = useMemo(() => `${RELATED_HOSTS_ID}-${uuid()}`, []);

  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;
  const isEntityAnalyticsAuthorized = isPlatinumOrTrialLicense && hasEntityAnalyticsCapability;

  const { openPreviewPanel } = useExpandableFlyoutApi();

  const timerange = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to]
  );

  const narrowDateRange = useCallback<NarrowDateRange>(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  const openUserPreview = useCallback(() => {
    openPreviewPanel({
      id: UserPreviewPanelKey,
      params: {
        userName,
        scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'preview',
    });
  }, [openPreviewPanel, userName, scopeId, telemetry]);

  const filterQuery = useMemo(
    () => (userName ? buildUserNamesFilter([userName]) : undefined),
    [userName]
  );

  const { data: userRisk } = useRiskScore({
    filterQuery,
    riskEntity: EntityType.user,
    timerange,
  });
  const userRiskData = userRisk && userRisk.length > 0 ? userRisk[0] : undefined;
  const isRiskScoreExist = !!userRiskData?.user.risk;

  const { hasMisconfigurationFindings } = useHasMisconfigurations(
    EntityIdentifierFields.userName,
    userName
  );
  const { hasNonClosedAlerts } = useNonClosedAlerts({
    field: EntityIdentifierFields.userName,
    value: userName,
    to,
    from,
    queryId: USER_DETAILS_INSIGHTS_ID,
  });

  const { openDetailsPanel } = useNavigateToUserDetails({
    userName,
    scopeId,
    isRiskScoreExist,
    hasMisconfigurationFindings,
    hasNonClosedAlerts,
    isPreviewMode: true, // setting to true to always open a new user flyout
    contextID: USER_DETAILS_INSIGHTS_ID,
  });

  const [isUserLoading, { inspect, userDetails, refetch }] = useObservedUserDetails({
    id: userDetailsQueryId,
    startDate: from,
    endDate: to,
    userName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const {
    loading: isRelatedHostLoading,
    inspect: inspectRelatedHosts,
    relatedHosts,
    totalCount,
    refetch: refetchRelatedHosts,
  } = useUserRelatedHosts({
    userName,
    indexNames: selectedPatterns,
    from: timestamp, // related hosts are hosts this user has successfully authenticated onto AFTER alert time
    skip: selectedPatterns.length === 0,
  });

  const relatedHostsColumns: Array<EuiBasicTableColumn<RelatedHost>> = useMemo(
    () => [
      {
        field: 'host',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsNameColumnLabel"
            defaultMessage="Name"
          />
        ),
        render: (host: string) => (
          <EuiText grow={false} size="xs">
            <CellActions field={HOST_NAME_FIELD_NAME} value={host}>
              <PreviewLink
                field={HOST_NAME_FIELD_NAME}
                value={host}
                scopeId={scopeId}
                data-test-subj={USER_DETAILS_RELATED_HOSTS_LINK_TEST_ID}
              />
            </CellActions>
          </EuiText>
        ),
      },
      {
        field: 'ip',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsIpColumnLabel"
            defaultMessage="Ip addresses"
          />
        ),
        render: (ips: string[]) => {
          return (
            <DefaultFieldRenderer
              rowItems={ips}
              attrName={HOST_IP_FIELD_NAME}
              idPrefix={''}
              render={(ip) =>
                ip == null ? (
                  getEmptyTagValue()
                ) : (
                  <PreviewLink
                    field={HOST_IP_FIELD_NAME}
                    value={ip}
                    scopeId={scopeId}
                    data-test-subj={USER_DETAILS_RELATED_HOSTS_IP_LINK_TEST_ID}
                  />
                )
              }
              scopeId={scopeId}
            />
          );
        },
      },
      ...(isEntityAnalyticsAuthorized
        ? [
            {
              field: 'risk',
              name: ENTITY_RISK_LEVEL(EntityType.host),
              truncateText: false,
              mobileOptions: { show: true },
              sortable: false,
              render: (riskScore: RiskSeverity) => {
                if (riskScore != null) {
                  return <RiskScoreLevel severity={riskScore} />;
                }
                return getEmptyTagValue();
              },
            },
          ]
        : []),
    ],
    [isEntityAnalyticsAuthorized, scopeId]
  );

  const relatedHostsCount = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="storage" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <EuiText>
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsCountLabel"
                defaultMessage="Related hosts: {count}"
                values={{ count: totalCount }}
              />
            </EuiText>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [totalCount]
  );

  const pagination: {} = {
    pageSize: 4,
    showPerPageOptions: false,
  };

  const userLink = useMemo(
    () => ({
      callback: openUserPreview,
      tooltip: i18n.translate(
        'xpack.securitySolution.flyout.left.insights.entities.user.userPreviewTitle',
        { defaultMessage: 'Preview user' }
      ),
    }),
    [openUserPreview]
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.userDetailsTitle"
            defaultMessage="User"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpandablePanel
        header={{
          title: userName,
          iconType: 'user',
          headerContent: relatedHostsCount,
          link: userLink,
        }}
        expand={{
          expandable: true,
          expandedOnFirstRender: true,
        }}
        data-test-subj={USER_DETAILS_TEST_ID}
      >
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.entities.userDetailsInfoTitle"
              defaultMessage="User information"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="s" />
        <AnomalyTableProvider
          criteriaFields={hostToCriteria(userDetails)}
          startDate={from}
          endDate={to}
          skip={isInitializing}
        >
          {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
            <UserOverviewManage
              id={userDetailsQueryId}
              isInDetailsSidePanel={false}
              data={userDetails}
              anomaliesData={anomaliesData}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              loading={isUserLoading}
              startDate={from}
              endDate={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              refetch={refetch}
              inspect={inspect}
              userName={userName}
              indexPatterns={selectedPatterns}
              jobNameById={jobNameById}
            />
          )}
        </AnomalyTableProvider>
        <EuiSpacer size="s" />
        <EuiHorizontalRule margin="s" />
        <EuiFlexGrid responsive={false} columns={3} gutterSize="xl">
          <AlertCountInsight
            fieldName={'user.name'}
            name={userName}
            direction="column"
            openDetailsPanel={openDetailsPanel}
            data-test-subj={USER_DETAILS_ALERT_COUNT_TEST_ID}
          />
          <MisconfigurationsInsight
            fieldName={'user.name'}
            name={userName}
            direction="column"
            openDetailsPanel={openDetailsPanel}
            data-test-subj={USER_DETAILS_MISCONFIGURATIONS_TEST_ID}
            telemetryKey={MISCONFIGURATION_INSIGHT_USER_DETAILS}
          />
        </EuiFlexGrid>
        <EuiSpacer size="l" />
        <EuiPanel hasBorder={true}>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsTitle"
                    defaultMessage="Related hosts"
                  />
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsTooltip"
                    defaultMessage="After this event, {userName} logged into these hosts. Check if this activity is normal."
                    values={{ userName }}
                  />
                }
              >
                <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <RelatedHostsManage
            id={relatedHostsQueryId}
            inspect={inspectRelatedHosts}
            loading={isRelatedHostLoading}
            setQuery={setQuery}
            deleteQuery={deleteQuery}
            refetch={refetchRelatedHosts}
          >
            <EuiInMemoryTable
              columns={relatedHostsColumns}
              items={relatedHosts}
              loading={isRelatedHostLoading}
              data-test-subj={USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID}
              pagination={pagination}
              message={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsNoDataDescription"
                  defaultMessage="No hosts identified"
                />
              }
            />
            <InspectButton
              queryId={relatedHostsQueryId}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.insights.entities.relatedHostsInspectButtonTitle"
                  defaultMessage="Related hosts"
                />
              }
              inspectIndex={0}
            />
          </RelatedHostsManage>
        </EuiPanel>
      </ExpandablePanel>
    </>
  );
};
