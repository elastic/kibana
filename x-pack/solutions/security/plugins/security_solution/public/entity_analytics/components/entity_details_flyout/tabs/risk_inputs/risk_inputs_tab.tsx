/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiAccordion,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTable,
  EuiTableFooter,
  EuiTableFooterCell,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import dateMath from '@kbn/datemath';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { get } from 'lodash/fp';
import {
  EntityDetailsLeftPanelTab,
  RiskScoreLeftPanelSubTab,
} from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { CriticalityLevel } from '../../../../../../common/entity_analytics/asset_criticality/types';
import { getWatchlistName } from '../../../../../../common/entity_analytics/watchlists/constants';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { formatRiskScore } from '../../../../common';
import { withMockedRiskContributions } from './mock_risk_contributions';
import type {
  InputAlert,
  UseRiskContributingAlertsResult,
} from '../../../../hooks/use_risk_contributing_alerts';
import { useRiskContributingAlerts } from '../../../../hooks/use_risk_contributing_alerts';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';

import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { RiskScoreState } from '../../../../api/hooks/use_risk_score';
import { useGetWatchlists } from '../../../../api/hooks/use_get_watchlists';
import { useRiskScoreHistory } from '../../../../api/hooks/use_risk_score_history';
import { RiskScoreTimeline } from '../../../risk_score_timeline';
import type { RiskScoreTimelinePointSelection } from '../../../risk_score_timeline';
import type { RiskScoreHistoryEntry } from '../../../../../../common/api/entity_analytics';
import { getRiskLevel } from '../../../../../../common/entity_analytics/risk_engine/risk_levels';
import type {
  EntityRiskScore,
  EntityType,
  RiskStats,
} from '../../../../../../common/search_strategy';
import type { ESQuery } from '../../../../../../common/typed_json';
import { buildEntityNameFilter } from '../../../../../../common/search_strategy';
import { AssetCriticalityBadge } from '../../../asset_criticality';
import { RiskInputsUtilityBar } from '../../components/utility_bar';
import { ActionColumn } from '../../components/action_column';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { useResolutionGroup } from '../../../entity_resolution/hooks/use_resolution_group';
import { getEntityId, getEntityField, getEntityName } from '../../../entity_resolution/helpers';
import { useStableExpandableFlyoutState } from '../../../../../flyout/shared/hooks/use_stable_expandable_flyout_state';
import { useEntityFromStore } from '../../../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import {
  buildResolutionRiskScoreFromEntityRecord,
  buildRiskScoreStateFromEntityRecord,
  getRiskFromEntityRecord,
} from '../../../../../flyout/entity_details/shared/entity_store_risk_utils';
import { getEntityData, getItems } from '../../../risk_summary_flyout/common';

export interface RiskInputsTabProps<T extends EntityType> {
  entityType: T;
  entityName: string;
  entityId?: string;
  /** Navigates to the alert preview for a risk-input row. */
  onShowAlert: (id: string, indexName: string) => void;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const EXPAND_ALERT_TEST_ID = 'risk-input-alert-preview-button';
export const RISK_INPUTS_TAB_QUERY_ID = 'RiskInputsTabQuery';

/** Max rows shown in the contributing-alerts table (remainder goes in the footer). */
const TOP_CONTRIBUTING_ALERTS_LIMIT = 10;

/** Em dash used when a contributor has no value (unassigned criticality, no watchlists). */
const EMPTY_CONTRIBUTION_VALUE = '–';

interface RiskScorePanelProps extends FlyoutPanelProps {
  params: {
    path: {
      tab: EntityDetailsLeftPanelTab.RISK_INPUTS;
      subTab?: RiskScoreLeftPanelSubTab;
    };
  };
}

function isRiskScoreFlyoutPanelProps(
  panelLeft: FlyoutPanelProps | undefined
): panelLeft is RiskScorePanelProps {
  const params = panelLeft?.params;
  if (!params || typeof params !== 'object' || !('path' in params)) {
    return false;
  }

  const path = params.path as { tab?: unknown; subTab?: unknown };
  if (path?.tab !== EntityDetailsLeftPanelTab.RISK_INPUTS) {
    return false;
  }

  return (
    path.subTab === undefined ||
    (typeof path.subTab === 'string' &&
      Object.values(RiskScoreLeftPanelSubTab).includes(path.subTab as RiskScoreLeftPanelSubTab))
  );
}

export const RiskInputsTab = <T extends EntityType>({
  entityType,
  entityName,
  entityId,
  onShowAlert,
}: RiskInputsTabProps<T>) => {
  const panels = useStableExpandableFlyoutState();
  const subTab = isRiskScoreFlyoutPanelProps(panels.left)
    ? panels.left.params.path.subTab
    : undefined;

  const { data: watchlists } = useGetWatchlists();

  const entityFilterQuery = useMemo(
    () =>
      entityId
        ? ({
            bool: {
              filter: [{ term: { [`${entityType}.risk.id_value`]: entityId } }],
              must_not: [{ term: { [`${entityType}.risk.score_type`]: 'resolution' } }],
            },
          } as ESQuery)
        : buildEntityNameFilter(entityType, [entityName]),
    [entityId, entityName, entityType]
  );

  const {
    data: riskScoreData,
    error: riskScoreError,
    loading: loadingRiskScore,
    inspect: inspectRiskScore,
    refetch,
  } = useRiskScore<EntityType>({
    riskEntity: entityType,
    filterQuery: entityFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: entityFilterQuery === undefined,
  });

  const { data: resolutionGroup } = useResolutionGroup(entityId ?? '', {
    enabled: Boolean(entityId),
  });
  const hasRealResolutionGroup = (resolutionGroup?.group_size ?? 0) > 1;
  const resolutionTargetEntityId = useMemo(
    () => (resolutionGroup?.target ? getEntityId(resolutionGroup.target) : undefined),
    [resolutionGroup?.target]
  );
  const shouldFetchResolutionRiskScore =
    hasRealResolutionGroup && Boolean(resolutionTargetEntityId);
  const resolutionFilterQuery = useMemo(
    () =>
      shouldFetchResolutionRiskScore && resolutionTargetEntityId
        ? ({
            bool: {
              filter: [
                { term: { [`${entityType}.risk.id_value`]: resolutionTargetEntityId } },
                { term: { [`${entityType}.risk.score_type`]: 'resolution' } },
              ],
            },
          } as ESQuery)
        : undefined,
    [entityType, resolutionTargetEntityId, shouldFetchResolutionRiskScore]
  );
  const {
    data: resolutionRiskScoreData,
    loading: loadingResolutionRiskScore,
    inspect: inspectResolutionRiskScore,
    refetch: refetchResolutionRiskScore,
  } = useRiskScore<EntityType>({
    riskEntity: entityType,
    filterQuery: resolutionFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: !shouldFetchResolutionRiskScore,
  });

  const entityRiskScore = riskScoreData && riskScoreData.length > 0 ? riskScoreData[0] : undefined;
  const resolutionRiskScore =
    resolutionRiskScoreData && resolutionRiskScoreData.length > 0
      ? resolutionRiskScoreData[0]
      : undefined;
  const hasResolutionScore = hasRealResolutionGroup && Boolean(resolutionRiskScore);

  const watchlistNamesById = useMemo(() => {
    const map = new Map<string, string>();
    (watchlists ?? []).forEach((watchlist) => {
      if (watchlist.id) {
        map.set(watchlist.id, watchlist.name);
      }
    });
    return map;
  }, [watchlists]);

  if (riskScoreError) {
    return (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorTitle"
            defaultMessage="Something went wrong"
          />
        }
        color="danger"
        iconType="error"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorBody"
            defaultMessage="Error while fetching risk inputs. Please try again later."
          />
        </p>
      </EuiCallOut>
    );
  }

  return (
    <RiskInputsTabContent
      // using subTab as key to force re-render the tab content when the subTab changes
      key={subTab}
      subTab={subTab}
      entityType={entityType}
      entityName={entityName}
      entityId={entityId}
      entityRiskScore={entityRiskScore}
      resolutionRiskScore={resolutionRiskScore}
      hasResolutionScore={hasResolutionScore}
      loadingRiskScore={loadingRiskScore}
      loadingResolutionRiskScore={loadingResolutionRiskScore}
      inspectRiskScore={inspectRiskScore}
      inspectResolutionRiskScore={inspectResolutionRiskScore}
      refetch={refetch}
      refetchResolutionRiskScore={refetchResolutionRiskScore}
      resolutionGroup={resolutionGroup}
      watchlistNamesById={watchlistNamesById}
      onShowAlert={onShowAlert}
    />
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';

interface RiskInputsTabContentProps<T extends EntityType> {
  subTab?: RiskScoreLeftPanelSubTab;
  entityType: T;
  entityName: string;
  entityId: string | undefined;
  entityRiskScore: EntityRiskScore<T> | undefined;
  resolutionRiskScore: EntityRiskScore<T> | undefined;
  hasResolutionScore: boolean;
  loadingRiskScore: boolean;
  loadingResolutionRiskScore: boolean;
  inspectRiskScore: RiskScoreState<EntityType>['inspect'];
  inspectResolutionRiskScore: RiskScoreState<EntityType>['inspect'];
  refetch: RiskScoreState<EntityType>['refetch'];
  refetchResolutionRiskScore: RiskScoreState<EntityType>['refetch'];
  resolutionGroup: ReturnType<typeof useResolutionGroup>['data'];
  watchlistNamesById: Map<string, string>;
  onShowAlert: (id: string, indexName: string) => void;
}

const RiskInputsTabContent = <T extends EntityType>({
  subTab,
  entityType,
  entityName,
  entityId,
  entityRiskScore,
  resolutionRiskScore,
  hasResolutionScore,
  loadingRiskScore,
  loadingResolutionRiskScore,
  inspectRiskScore,
  inspectResolutionRiskScore,
  refetch,
  refetchResolutionRiskScore,
  resolutionGroup,
  watchlistNamesById,
  onShowAlert,
}: RiskInputsTabContentProps<T>) => {
  const { setQuery, deleteQuery } = useGlobalTime();
  const euidApi = useEntityStoreEuidApi();
  const [selectedItems, setSelectedItems] = useState<InputAlert[]>([]);
  const [userSelectedView, setUserSelectedView] = useState(subTab);
  const [historyRange, setHistoryRange] = useState(DEFAULT_HISTORY_RANGE);
  const [selectedPoint, setSelectedPoint] = useState<RiskScoreTimelinePointSelection | undefined>(
    undefined
  );
  const selectedTimestamp = selectedPoint?.timestamp;
  const isRiskScoreHistoryEnabled = useIsExperimentalFeatureEnabled('riskScoreHistoryEnabled');

  const defaultView =
    !loadingRiskScore && !entityRiskScore && hasResolutionScore
      ? RiskScoreLeftPanelSubTab.RESOLUTION
      : RiskScoreLeftPanelSubTab.ENTITY;
  const selectedView = userSelectedView ?? defaultView;

  const isResolutionView =
    selectedView === RiskScoreLeftPanelSubTab.RESOLUTION && hasResolutionScore;

  const entityFromStore = useEntityFromStore({
    entityId,
    entityType,
    skip: !entityId,
  });

  // Authoritative scores from entity store (same source as the right-flyout metrics).
  const storeEntityScore = useMemo(() => {
    if (!entityFromStore.entityRecord) {
      return undefined;
    }
    return getRiskFromEntityRecord(entityFromStore.entityRecord);
  }, [entityFromStore.entityRecord]);

  const storeResolutionScore = useMemo(() => {
    if (!entityFromStore.entityRecord) {
      return undefined;
    }
    const resolution = buildResolutionRiskScoreFromEntityRecord(
      entityType,
      entityFromStore.entityRecord
    );
    return resolution?.[entityType]?.risk;
  }, [entityFromStore.entityRecord, entityType]);

  /**
   * Full risk-score row matching the right-flyout Risk score section (including
   * asset-criticality contribution of 1 when present on the entity store record).
   */
  const storeLatestRiskScore = useMemo((): EntityRiskScore<T> | undefined => {
    if (!entityFromStore.entityRecord) {
      return undefined;
    }
    if (isResolutionView) {
      return buildResolutionRiskScoreFromEntityRecord(entityType, entityFromStore.entityRecord);
    }
    return buildRiskScoreStateFromEntityRecord(entityType, entityFromStore.entityRecord, {
      refetch: entityFromStore.refetch,
      isLoading: entityFromStore.isLoading,
      error: entityFromStore.error,
    }).data?.[0];
  }, [
    entityFromStore.entityRecord,
    entityFromStore.refetch,
    entityFromStore.isLoading,
    entityFromStore.error,
    entityType,
    isResolutionView,
  ]);

  const timelineCurrentScore = isResolutionView ? storeResolutionScore : storeEntityScore;

  // The resolution-group history lives in the same time-series stream as the
  // entity history, keyed by the resolution target's id with `score_type=resolution`.
  // Switch the timeline's identity and score type by the active sub-tab so the
  // chart and point-in-time contributions follow the view.
  const resolutionTargetEntityId = resolutionGroup?.target
    ? getEntityId(resolutionGroup.target)
    : undefined;
  const historyEntityId = isResolutionView ? resolutionTargetEntityId : entityId;
  const historyScoreType: RiskScoreHistoryEntry['score_type'] = isResolutionView
    ? 'resolution'
    : 'base';
  const historyEntityName =
    isResolutionView && resolutionGroup?.target
      ? getEntityName(resolutionGroup.target) || entityName
      : entityName;

  const showTimeline = isRiskScoreHistoryEnabled && historyEntityId !== undefined;
  const pitSelectionActive = showTimeline && selectedTimestamp !== undefined;

  const { data: pitHistoryData, isFetching: pitFetching } = useRiskScoreHistory({
    entityType,
    entityId: historyEntityId,
    from: selectedTimestamp,
    to: selectedTimestamp,
    scoreType: historyScoreType,
    includeContributions: true,
    skip: !pitSelectionActive,
  });

  const pitEntry = pitSelectionActive ? pitHistoryData?.entries[0] : undefined;
  const pitRiskScore = useMemo(() => {
    if (!pitSelectionActive || historyEntityId === undefined || selectedPoint === undefined) {
      return undefined;
    }
    // Prefer a real history doc when the API has one for this hour.
    if (pitEntry !== undefined) {
      return mkEntityRiskScore(entityType, historyEntityName, historyEntityId, pitEntry);
    }
    // Densified chart hours often have no ES doc — synthesize from the chart score
    // so Contributions update instead of staying on the latest store score.
    const syntheticEntry: RiskScoreHistoryEntry = {
      '@timestamp': selectedPoint.timestamp,
      calculated_score_norm: selectedPoint.scoreNorm,
      calculated_score: selectedPoint.scoreNorm,
      calculated_level: getRiskLevel(selectedPoint.scoreNorm),
      inputs: [],
    };
    return mkEntityRiskScore(entityType, historyEntityName, historyEntityId, syntheticEntry);
  }, [
    pitSelectionActive,
    historyEntityId,
    selectedPoint,
    pitEntry,
    entityType,
    historyEntityName,
  ]);

  const onHistoryRangeChange = useCallback((range: { from: string; to: string }) => {
    setHistoryRange(range);
    setSelectedPoint((current) =>
      current !== undefined && isTimestampWithinRange(current.timestamp, range)
        ? current
        : undefined
    );
  }, []);

  const onViewChange = useCallback((id: string) => {
    setUserSelectedView(id as RiskScoreLeftPanelSubTab);
    setSelectedPoint(undefined);
  }, []);

  const latestRiskScore = isResolutionView ? resolutionRiskScore : entityRiskScore;
  // Latest / last chart point: use entity-store contributions (matches right flyout).
  // Always run through the mock helper so a non-zero score never has empty alerts.
  // While a historical hour is selected, never fall back to the store "latest" score.
  const activeRiskScore = useMemo(() => {
    if (pitSelectionActive) {
      return withMockedRiskContributions(entityType, pitRiskScore);
    }
    const base = storeLatestRiskScore ?? latestRiskScore;
    return withMockedRiskContributions(entityType, base);
  }, [entityType, pitSelectionActive, pitRiskScore, latestRiskScore, storeLatestRiskScore]);

  // Always show when the contributions were calculated — latest on open, selected hour when drilled in.
  const contributionsTimestamp = useMemo(() => {
    if (selectedTimestamp !== undefined) {
      return selectedTimestamp;
    }
    return (
      activeRiskScore?.[entityType]?.risk?.['@timestamp'] ?? activeRiskScore?.['@timestamp']
    );
  }, [selectedTimestamp, activeRiskScore, entityType]);

  const activeInspectRiskScore = isResolutionView ? inspectResolutionRiskScore : inspectRiskScore;
  const activeRiskScoreLoading =
    (isResolutionView ? loadingResolutionRiskScore : loadingRiskScore) ||
    (pitSelectionActive && pitFetching);
  const activeRiskScoreRefetch = isResolutionView ? refetchResolutionRiskScore : refetch;

  useQueryInspector({
    deleteQuery,
    inspect: activeInspectRiskScore,
    loading: activeRiskScoreLoading,
    queryId: RISK_INPUTS_TAB_QUERY_ID,
    refetch: activeRiskScoreRefetch,
    setQuery,
  });

  const alertsResult = useRiskContributingAlerts<T>({ riskScore: activeRiskScore, entityType });
  // Mock contribution inputs won't resolve to real alert docs; fall back to the
  // input description so the Alerts table still shows usable rule names.
  // Always surface at most the top 10 contributors, sorted by contribution desc.
  const alerts = useMemo((): UseRiskContributingAlertsResult => {
    if (!alertsResult.data) {
      return alertsResult;
    }
    const enriched = alertsResult.data.map((row) => {
      const ruleName = row.alert?.[ALERT_RULE_NAME];
      if (ruleName) {
        return row;
      }
      const fromDescription = row.input.description?.replace(
        /^Generated from Detection Engine Rule:\s*/i,
        ''
      );
      return {
        ...row,
        alert: {
          ...row.alert,
          [ALERT_RULE_NAME]: fromDescription || row.input.description || row._id,
        },
      };
    });

    const topContributing = [...enriched]
      .sort(
        (a, b) => (b.input.contribution_score ?? 0) - (a.input.contribution_score ?? 0)
      )
      .slice(0, TOP_CONTRIBUTING_ALERTS_LIMIT);

    return {
      ...alertsResult,
      data: topContributing,
    };
  }, [alertsResult]);

  const extraAlertsFooter = useMemo(
    () => getExtraAlertsFooterMessage(activeRiskScore, alerts, entityType),
    [activeRiskScore, alerts, entityType]
  );

  const entityNameByEuid = useMemo(() => {
    const map = new Map<string, string>();
    if (!resolutionGroup) return map;
    [resolutionGroup.target, ...resolutionGroup.aliases].forEach((entity) => {
      const entityIdValue = getEntityId(entity);
      if (entityIdValue) {
        map.set(entityIdValue, getEntityName(entity) || entityIdValue);
      }
    });
    return map;
  }, [resolutionGroup]);

  const alertEntityById = useMemo(() => {
    const map = new Map<string, string>();
    if (!isResolutionView || !euidApi || !alerts.data) return map;
    alerts.data.forEach((alert) => {
      const sourceEntityId =
        alert.input.entity_id ?? euidApi.euid.getEuidFromObject(entityType, alert.rawSource);
      if (sourceEntityId) {
        map.set(alert._id, entityNameByEuid.get(sourceEntityId) ?? sourceEntityId);
      }
    });
    return map;
  }, [alerts.data, entityNameByEuid, entityType, euidApi, isResolutionView]);

  const euiTableSelectionProps = useMemo(
    () => ({
      initialSelected: [],
      selectable: () => true,
      onSelectionChange: setSelectedItems,
    }),
    []
  );

  const inputColumns: Array<EuiBasicTableColumn<InputAlert>> = useMemo(() => {
    const columns: Array<EuiBasicTableColumn<InputAlert>> = [
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actionsColumn"
            defaultMessage="Actions"
          />
        ),
        width: '72px',
        render: (data: InputAlert) => (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            responsive={false}
            data-test-subj="risk-input-alert-actions"
          >
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'xpack.securitySolution.flyout.right.alertPreview.ariaLabel',
                  {
                    defaultMessage: 'Preview alert with id {id}',
                    values: { id: data._id },
                  }
                )}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="expand"
                  data-test-subj={EXPAND_ALERT_TEST_ID}
                  onClick={() => onShowAlert(data._id, data.input.index)}
                  aria-label={i18n.translate(
                    'xpack.securitySolution.flyout.right.alertPreview.ariaLabel',
                    {
                      defaultMessage: 'Preview alert with id {id}',
                      values: { id: data._id },
                    }
                  )}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <ActionColumn input={data} />
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'input.timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.dateColumn"
            defaultMessage="Date"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        width: isResolutionView ? '20%' : '30%',
        render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
      },
      {
        field: 'alert',
        'data-test-subj': 'risk-input-table-description-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.riskInputColumn"
            defaultMessage="Rule name"
          />
        ),
        truncateText: true,
        mobileOptions: { show: true },
        sortable: true,
        render: (alert: InputAlert['alert']) => get(ALERT_RULE_NAME, alert),
      },
      {
        field: 'input.contribution_score',
        'data-test-subj': 'risk-input-table-contribution-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
            defaultMessage="Contribution"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        align: 'right',
        render: formatContribution,
      },
    ];

    if (isResolutionView) {
      columns.splice(3, 0, {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.entityColumn"
            defaultMessage="Entity"
          />
        ),
        width: '25%',
        render: (data: InputAlert) => alertEntityById.get(data._id) ?? '-',
      });
    }

    return columns;
  }, [alertEntityById, isResolutionView, onShowAlert]);

  const alertsFooterColSpan =
    inputColumns.length + 1; /* +1 for the selection checkbox column */

  const riskInputsAlertSection = (
    <EuiAccordion
      id="risk-inputs-top-contributing-alerts"
      initialIsOpen={false}
      data-test-subj="risk-input-alerts-accordion"
      buttonContent={i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.riskInputs.showTopAlertsAccordion',
        { defaultMessage: 'Show top contributing alerts' }
      )}
    >
      <EuiSpacer size="m" />
      <RiskInputsUtilityBar riskInputs={selectedItems} />
      <EuiInMemoryTable
        compressed
        loading={(activeRiskScoreLoading || alerts.loading) && (alerts.data?.length ?? 0) === 0}
        items={alerts.data || []}
        columns={inputColumns}
        sorting
        selection={euiTableSelectionProps}
        itemId="_id"
        tableCaption={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.riskInputs.alertsTableCaption',
          {
            defaultMessage: 'Alerts contributing to the risk score',
          }
        )}
      />
      {extraAlertsFooter !== undefined && (
        <EuiTable
          compressed
          responsiveBreakpoint={false}
          data-test-subj="risk-input-extra-alerts-footer"
        >
          <EuiTableFooter>
            {/* 32px spacer so the message is inset from the table's left edge */}
            <EuiTableFooterCell width={32} />
            <EuiTableFooterCell colSpan={alertsFooterColSpan - 1}>
              {extraAlertsFooter}
            </EuiTableFooterCell>
          </EuiTableFooter>
        </EuiTable>
      )}
    </EuiAccordion>
  );

  return (
    <>
      {hasResolutionScore && (
        <>
          <EuiButtonGroup
            color="primary"
            isFullWidth
            legend={i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.riskInputs.scoreViewLegend',
              { defaultMessage: 'Risk score view' }
            )}
            buttonSize="compressed"
            options={[
              {
                id: RiskScoreLeftPanelSubTab.ENTITY,
                label: i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.riskInputs.entityScoreViewLabel',
                  { defaultMessage: 'Entity risk score' }
                ),
              },
              {
                id: RiskScoreLeftPanelSubTab.RESOLUTION,
                label: i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.riskInputs.resolutionScoreViewLabel',
                  { defaultMessage: 'Resolution group risk score' }
                ),
              },
            ]}
            idSelected={selectedView}
            onChange={onViewChange}
            data-test-subj="risk-input-score-view-toggle"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {showTimeline && historyEntityId !== undefined && (
        <>
          <RiskScoreTimeline
            entityType={entityType}
            entityId={historyEntityId}
            from={historyRange.from}
            to={historyRange.to}
            scoreType={historyScoreType}
            currentScoreNorm={timelineCurrentScore?.calculated_score_norm}
            currentScoreLevel={
              timelineCurrentScore?.calculated_level as RiskScoreHistoryEntry['calculated_level']
            }
            selectedTimestamp={selectedTimestamp}
            onPointSelect={setSelectedPoint}
            onRangeChange={onHistoryRangeChange}
          />
          <EuiSpacer size="xl" />
        </>
      )}
      <ContextsSection<T>
        loading={activeRiskScoreLoading}
        riskScore={activeRiskScore}
        entityType={entityType}
        isResolutionView={isResolutionView}
        resolutionGroup={resolutionGroup}
        watchlistNamesById={watchlistNamesById}
        contributionsTimestamp={contributionsTimestamp}
        isHistoricalSelection={pitSelectionActive}
        onBackToLatest={() => setSelectedPoint(undefined)}
      />
      <EuiSpacer size="m" />
      {riskInputsAlertSection}
      <EuiSpacer size="l" />
    </>
  );
};

interface ContextsSectionProps<T extends EntityType> {
  riskScore?: EntityRiskScore<T>;
  entityType: T;
  loading: boolean;
  isResolutionView: boolean;
  resolutionGroup?: {
    target: Record<string, unknown>;
    aliases: Array<Record<string, unknown>>;
  };
  watchlistNamesById: Map<string, string>;
  /** ISO timestamp for the contributions currently shown (latest or selected hour). */
  contributionsTimestamp?: string;
  /** True when the tables reflect a historical chart selection. */
  isHistoricalSelection?: boolean;
  onBackToLatest?: () => void;
}

const ContextsSection = <T extends EntityType>({
  riskScore,
  loading,
  entityType,
  isResolutionView,
  resolutionGroup,
  watchlistNamesById,
  contributionsTimestamp,
  isHistoricalSelection = false,
  onBackToLatest,
}: ContextsSectionProps<T>) => {
  const isPrivmonModifierEnabled = useIsExperimentalFeatureEnabled(
    'enableRiskScorePrivmonModifier'
  );
  const isWatchlistEnabled = useIsExperimentalFeatureEnabled('entityAnalyticsWatchlistEnabled');

  const memberEntities = useMemo(
    () => (resolutionGroup ? [resolutionGroup.target, ...resolutionGroup.aliases] : []),
    [resolutionGroup]
  );
  const watchlistEntityNames = useMemo(() => {
    const map = new Map<string, string[]>();

    if (!isResolutionView) {
      return map;
    }

    memberEntities.forEach((member) => {
      const entityName = getEntityName(member) || getEntityId(member) || '-';
      const watchlistsValue = getEntityField(member, 'entity.attributes.watchlists');
      if (!Array.isArray(watchlistsValue)) {
        return;
      }

      watchlistsValue.forEach((watchlistId) => {
        if (typeof watchlistId !== 'string') {
          return;
        }

        const matchingEntities = map.get(watchlistId) ?? [];
        if (!matchingEntities.includes(entityName)) {
          matchingEntities.push(entityName);
        }
        map.set(watchlistId, matchingEntities);
      });
    });

    return map;
  }, [isResolutionView, memberEntities]);
  const criticalityEntityNames = useMemo(() => {
    const map = new Map<string, string[]>();

    if (!isResolutionView) {
      return map;
    }

    memberEntities.forEach((member) => {
      const entityName = getEntityName(member) || getEntityId(member) || '-';
      const criticalityLevel = getEntityField(member, 'asset.criticality');

      if (typeof criticalityLevel !== 'string') {
        return;
      }

      const matchingEntities = map.get(criticalityLevel) ?? [];
      if (!matchingEntities.includes(entityName)) {
        matchingEntities.push(entityName);
      }
      map.set(criticalityLevel, matchingEntities);
    });

    return map;
  }, [isResolutionView, memberEntities]);

  const entityData = useMemo(
    () => getEntityData(entityType, riskScore),
    [entityType, riskScore]
  );

  // Same Alerts score/count as the right-flyout Risk score contributions table.
  const alertsContribution = useMemo(() => {
    const [alertsRow] = getItems(entityData, isPrivmonModifierEnabled, isWatchlistEnabled);
    return alertsRow;
  }, [entityData, isPrivmonModifierEnabled, isWatchlistEnabled]);

  const contributions = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    const modifiers = riskScore[entityType].risk.modifiers ?? [];
    const criticality = modifiers.find((mod) => mod.type === 'asset_criticality');
    const watchlists = modifiers.filter((mod) => mod.type === 'watchlist');

    const criticalityMetadata = criticality?.metadata as
      | {
          criticality_level?: CriticalityLevel;
          contributor_euid?: string;
        }
      | undefined;

    return {
      criticality: {
        level: criticalityMetadata?.criticality_level ?? null,
        contribution: criticality?.contribution ?? 0,
        contributorEUID:
          typeof criticalityMetadata?.contributor_euid === 'string'
            ? criticalityMetadata.contributor_euid
            : undefined,
      },
      watchlists,
    };
  }, [entityType, riskScore]);

  if (contributions === undefined || alertsContribution === undefined) {
    return null;
  }
  const { criticality, watchlists } = contributions;

  const items: ContextRow[] = [];

  items.push({
    field: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.alertsField"
        defaultMessage="Alerts"
      />
    ),
    value:
      (alertsContribution.count ?? 0) > 0 ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.alertsValue"
          defaultMessage="{count, plural, one {# alert} other {# alerts}}"
          values={{ count: alertsContribution.count }}
        />
      ) : (
        EMPTY_CONTRIBUTION_VALUE
      ),
    contribution: formatContribution(alertsContribution.score),
    entities: '',
  });

  // Prefer the attribution persisted on the score document: the current-state
  // join below is wrong for historical scores once a member's criticality
  // changes. Scores written before attribution existed fall back to the join.
  const hasCriticality = criticality.level != null;
  const contributorMember =
    hasCriticality && criticality.contributorEUID !== undefined
      ? memberEntities.find((member) => getEntityId(member) === criticality.contributorEUID)
      : undefined;
  const contributorName =
    hasCriticality && criticality.contributorEUID !== undefined
      ? (contributorMember && getEntityName(contributorMember)) || criticality.contributorEUID
      : undefined;
  const relatedEntities = isResolutionView
    ? hasCriticality
      ? contributorName ??
        (criticality.level != null
          ? criticalityEntityNames.get(criticality.level)?.join(', ')
          : undefined) ??
        '-'
      : '-'
    : '';
  items.push({
    field: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityField"
        defaultMessage="Asset criticality"
      />
    ),
    value: hasCriticality ? (
      <AssetCriticalityBadge
        criticalityLevel={criticality.level!}
        dataTestSubj="risk-inputs-asset-criticality-badge"
        textSize="xs"
      />
    ) : (
      EMPTY_CONTRIBUTION_VALUE
    ),
    contribution: formatContribution(hasCriticality ? criticality.contribution : 0),
    entities: relatedEntities,
  });

  if (watchlists.length > 0) {
    watchlists.forEach((watchlist) => {
      const watchlistMetadata = watchlist.metadata as
        | {
            watchlist_id?: string;
            watchlist_name?: string;
            is_privileged_user?: boolean;
          }
        | undefined;
      const watchlistId =
        typeof watchlistMetadata?.watchlist_id === 'string' ? watchlistMetadata.watchlist_id : '';
      const watchlistLabel =
        (typeof watchlistMetadata?.watchlist_name === 'string' &&
          watchlistMetadata.watchlist_name) ||
        (watchlistId
          ? watchlistNamesById.get(watchlistId) ?? getWatchlistName(watchlistId)
          : i18n.translate(
              'xpack.securitySolution.flyout.entityDetails.riskInputs.unknownWatchlistLabel',
              {
                defaultMessage: 'Unknown watchlist',
              }
            ));

      items.push({
        field: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.watchlistField"
            defaultMessage="Watchlist"
          />
        ),
        value: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.watchlistValue"
            defaultMessage="{watchlistName}{privilegedTag}"
            values={{
              watchlistName: watchlistLabel,
              privilegedTag: watchlistMetadata?.is_privileged_user
                ? i18n.translate(
                    'xpack.securitySolution.flyout.entityDetails.riskInputs.privilegedWatchlistSuffix',
                    {
                      defaultMessage: ' (privileged user)',
                    }
                  )
                : '',
            }}
          />
        ),
        contribution: formatContribution(watchlist.contribution),
        entities: isResolutionView ? watchlistEntityNames.get(watchlistId)?.join(', ') ?? '-' : '',
      });
    });
  } else if (isWatchlistEnabled) {
    // Always surface the Watchlist contributor row, even when the entity is not
    // on any watchlist — Value/Contribution stay empty (`–` / `0.00`).
    items.push({
      field: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.watchlistField"
          defaultMessage="Watchlist"
        />
      ),
      value: EMPTY_CONTRIBUTION_VALUE,
      contribution: formatContribution(0),
      entities: isResolutionView ? '-' : '',
    });
  }

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        gutterSize="s"
        responsive={false}
        data-test-subj="risk-input-contexts-header"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs" data-test-subj="risk-input-contexts-title">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTitle"
                defaultMessage="Contributions"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {isHistoricalSelection && onBackToLatest !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="returnKey"
                  onClick={onBackToLatest}
                  data-test-subj="riskInputsTabBackToLatest"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.entityAnalytics.riskScoreTimeline.backToLatest"
                    defaultMessage="Back to latest"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {contributionsTimestamp !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="xs"
                  responsive={false}
                  data-test-subj="riskInputsTabContributionsTimestamp"
                >
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="clock" size="s" color="subdued" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" color="default">
                      <PreferenceFormattedDate value={new Date(contributionsTimestamp)} />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        compressed={true}
        loading={loading && items.length === 0}
        data-test-subj="risk-input-contexts-table"
        columns={getContextColumns(isResolutionView)}
        items={items}
        tableCaption={i18n.translate(
          'xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTableCaption',
          {
            defaultMessage: 'Contributions to the risk score',
          }
        )}
      />
    </>
  );
};

interface ContextRow {
  field: ReactNode;
  value: ReactNode;
  contribution: string;
  entities: string;
}

const getContextColumns = (isResolutionView: boolean): Array<EuiBasicTableColumn<ContextRow>> => {
  const columnCount = isResolutionView ? 4 : 3;
  const equalWidth = `${100 / columnCount}%`;

  const columns: Array<EuiBasicTableColumn<ContextRow>> = [
    {
      field: 'field',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.fieldColumn"
          defaultMessage="Risk input"
        />
      ),
      width: equalWidth,
      render: (field: ContextRow['field']) => field,
    },
    {
      field: 'value',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.valueColumn"
          defaultMessage="Value"
        />
      ),
      width: equalWidth,
      render: (val: ContextRow['value']) => val,
    },
  ];

  if (isResolutionView) {
    columns.push({
      field: 'entities',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.entityColumn"
          defaultMessage="Entity"
        />
      ),
      width: equalWidth,
      render: (entities: ContextRow['entities']) => entities || '-',
    });
  }

  columns.push({
    field: 'contribution',
    width: equalWidth,
    align: 'right',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
        defaultMessage="Contribution"
      />
    ),
    render: (score: ContextRow['contribution']) => score,
  });

  return columns;
};

const getExtraAlertsFooterMessage = <T extends EntityType>(
  riskScore: EntityRiskScore<T> | undefined,
  alerts: UseRiskContributingAlertsResult,
  entityType: T
): ReactNode | undefined => {
  const totals = !riskScore
    ? { count: 0, score: 0 }
    : {
        count: riskScore[entityType].risk.category_1_count,
        score: riskScore[entityType].risk.category_1_score,
      };

  const displayed = {
    count: alerts.data?.length || 0,
    score: alerts.data?.reduce((sum, { input }) => sum + (input.contribution_score || 0), 0) || 0,
  };

  if (displayed.count >= totals.count) {
    return undefined;
  }

  return (
    <span data-test-subj="risk-input-extra-alerts-message">
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.extraAlertsMessage"
        defaultMessage="{count} more alerts contributed {score} to the calculated risk score"
        values={{
          count: totals.count - displayed.count,
          score: formatContribution(totals.score - displayed.score),
        }}
      />
    </span>
  );
};

const formatContribution = (value: number): string => {
  const fixedValue = formatRiskScore(value);

  // prevent +0.00 for values like 0.0001
  if (fixedValue === '0.00') {
    return fixedValue;
  }

  if (value > 0) {
    return `+${fixedValue}`;
  }

  return fixedValue;
};

const DEFAULT_HISTORY_RANGE = { from: 'now-30d', to: 'now' };

const isTimestampWithinRange = (
  timestamp: string | undefined,
  range: { from: string; to: string }
): boolean => {
  if (timestamp === undefined) {
    return false;
  }

  const ms = new Date(timestamp).getTime();
  const min = dateMath.parse(range.from)?.valueOf();
  const max = dateMath.parse(range.to, { roundUp: true })?.valueOf();
  return (min === undefined || ms >= min) && (max === undefined || ms <= max);
};

/**
 * Builds the `EntityRiskScore` wrapper the contribution tables consume from a
 * point-in-time history entry, so a selected historical record can replace the
 * latest record as the tables' source.
 */
const mkEntityRiskScore = <T extends EntityType>(
  entityType: T,
  entityName: string,
  entityId: string,
  entry: RiskScoreHistoryEntry
): EntityRiskScore<T> => ({
  '@timestamp': entry['@timestamp'],
  // TypeScript cannot relate a computed key to a generic type parameter
  // ({ [k]: v } widens to an index signature), and Record<T, V> would be
  // unsatisfiable if T were a union. T is always a single entity type per
  // flyout, so the assertion states an invariant the type system can't express.
  ...({ [entityType]: { name: entityName, risk: toRiskStats(entry, entityId) } } as Record<
    T,
    { name: string; risk: RiskStats }
  >),
});

const toRiskStats = (entry: RiskScoreHistoryEntry, entityId: string): RiskStats => ({
  '@timestamp': entry['@timestamp'],
  id_field: 'entity.id',
  id_value: entityId,
  calculated_level: entry.calculated_level,
  calculated_score: entry.calculated_score ?? 0,
  calculated_score_norm: entry.calculated_score_norm,
  category_1_score: entry.category_1_score ?? 0,
  category_1_count: entry.category_1_count ?? 0,
  ...(entry.category_2_score !== undefined && { category_2_score: entry.category_2_score }),
  ...(entry.category_2_count !== undefined && { category_2_count: entry.category_2_count }),
  ...(entry.criticality_level !== undefined && { criticality_level: entry.criticality_level }),
  ...(entry.score_type !== undefined && { score_type: entry.score_type }),
  ...(entry.modifiers !== undefined && { modifiers: entry.modifiers }),
  inputs: entry.inputs ?? [],
  notes: [],
  rule_risks: [],
  multipliers: [],
});
