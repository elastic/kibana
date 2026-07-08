/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */
// TODO: Disabling complexity is temporary till this component is refactored as part of lists UI integration

import type { EuiResizeObserverProps } from '@elastic/eui';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiResizeObserver,
  EuiSpacer,
  EuiWindowEvent,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import { Route, Routes } from '@kbn/shared-ux-router';
import moment from 'moment';
import type {
  AppHeaderBadge,
  AppHeaderMetadataItem,
  AppHeaderMetadataItems,
} from '@kbn/app-header';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';

import { noop } from 'lodash/fp';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConnectedProps } from 'react-redux';
import { connect, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { Dispatch } from 'redux';
import { isTab } from '@kbn/timelines-plugin/public';
import {
  dataTableActions,
  dataTableSelectors,
  FILTER_OPEN,
  tableDefaults,
  TableId,
} from '@kbn/securitysolution-data-table';
import { PageScope } from '../../../../data_view_manager/constants';
import { RuleCustomizationsContextProvider } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useGroupTakeActionsItems } from '../../../../detections/hooks/alerts_table/use_group_take_action_items';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import {
  defaultGroupStatsAggregations,
  defaultGroupStatsRenderer,
  defaultGroupTitleRenderers,
} from '../../../../detections/components/alerts_table/grouping_settings';
import { EndpointExceptionsViewer } from '../../../endpoint_exceptions/endpoint_exceptions_viewer';
import { AlertsTable } from '../../../../detections/components/alerts_table';
import { GroupedAlertsTable } from '../../../../detections/components/alerts_table/alerts_grouping';
import { useDataTableFilters } from '../../../../common/hooks/use_data_table_filters';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import {
  useDeepEqualSelector,
  useShallowEqualSelector,
} from '../../../../common/hooks/use_selector';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import type { UpdateDateRange } from '../../../../common/components/charts/common';
import {
  getDetectionEngineUrl,
  getRuleDetailsTabUrl,
  getRulesUrl,
  getEditRuleUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { SiemSearchBar } from '../../../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { useListsConfig } from '../../../../detections/containers/detection_engine/lists/use_lists_config';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { StepAboutRuleToggleDetails } from '../../../rule_creation/components/step_about_rule_details';
import { AlertsHistogramPanel } from '../../../../detections/components/alerts_kpis/alerts_histogram_panel';
import { useUserData } from '../../../../detections/components/user_info';
import { StepRuleActionsReadOnly } from '../../../rule_creation/components/step_rule_actions';
import {
  buildAlertsFilter,
  buildAlertStatusFilter,
  buildShowBuildingBlockFilter,
  buildThreatMatchFilter,
} from '../../../../detections/components/alerts_table/default_config';
import { StepPanel } from '../../../rule_creation/components/step_panel';
import {
  getMachineLearningJobId,
  getStepsData,
  redirectToDetections,
} from '../../../common/helpers';
import { RuleVersion, RuleRevision } from '../../../../detections/components/rules/rule_info';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { inputsSelectors } from '../../../../common/store/inputs';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { RuleDetailsAppHeader } from './rule_details_app_header';
import type { UseRuleActionsMenuItemsParams } from './rule_actions_overflow/use_rule_actions_menu_items';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { SecurityPageName } from '../../../../app/types';
import { APP_UI_ID, ENABLE_RULE_CHANGES_HISTORY_SETTING } from '../../../../../common/constants';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';
import { Display } from '../../../../explore/hosts/pages/display';
import {
  focusUtilityBarAction,
  onTimelineTabKeyPressed,
  resetKeyboardFocus,
} from '../../../../timelines/components/timeline/helpers';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
  isBoolean,
} from '../../../../common/utils/privileges';
import { RuleStatusFailedCallOut } from '../../../common/components/rule_execution_status';
import {
  getStatusColor,
  getStatusText,
} from '../../../common/components/rule_execution_status/utils';
import { ExecutionResultsTable } from './execution_results/execution_results_table';
import { RuleBackfillsInfo } from '../../../rule_gaps/components/rule_backfills_info';
import { RuleGaps } from '../../../rule_gaps/components/rule_gaps';
import * as ruleI18n from '../../../common/translations';
// eslint-disable-next-line no-restricted-imports
import { LegacyUrlConflictCallOut } from './legacy_url_conflict_callout';
import * as i18n from './translations';
import { NeedAdminForUpdateRulesCallOut } from '../../../rule_management/components/callouts/need_admin_for_update_rules_callout';
import { MissingDetectionsPrivilegesCallOut } from '../../../../detections/components/callouts/missing_detections_privileges_callout';
import { useRuleWithFallback } from '../../../rule_management/logic/use_rule_with_fallback';
import type { AlertsStackByField } from '../../../../detections/components/alerts_kpis/common/types';
import { type RuleResponse, type Status } from '../../../../../common/api/detection_engine';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import { AlertsTableFilterGroup } from '../../../../detections/components/alerts_table/alerts_filter_group';
import { useSignalHelpers } from '../../../../sourcerer/containers/use_signal_helpers';
import { ExceptionsViewer } from '../../../rule_exceptions/components/all_exception_items_table';
import { useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useStartMlJobs } from '../../../rule_management/logic/use_start_ml_jobs';
import { useBulkDuplicateExceptionsConfirmation } from '../../../rule_management_ui/components/rules_table/bulk_actions/use_bulk_duplicate_confirmation';
import { BulkActionDuplicateExceptionsConfirmation } from '../../../rule_management_ui/components/rules_table/bulk_actions/bulk_duplicate_exceptions_confirmation';
import { useAsyncConfirmation } from '../../../rule_management_ui/components/rules_table/rules_table/use_async_confirmation';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { RuleDefinitionSection } from '../../../rule_management/components/rule_details/rule_definition_section';
import { RuleScheduleSection } from '../../../rule_management/components/rule_details/rule_schedule_section';
import { ModifiedRuleBadge } from '../../../rule_management/components/rule_details/modified_rule_badge';
import { ManualRuleRunModal } from '../../../rule_gaps/components/manual_rule_run';
import { useManualRuleRunConfirmation } from '../../../rule_gaps/components/manual_rule_run/use_manual_rule_run_confirmation';
// eslint-disable-next-line no-restricted-imports
import { useLegacyUrlRedirect } from './use_redirect_legacy_url';
import { RuleDetailTabs, useRuleDetailsTabs } from './use_rule_details_tabs';
import { useRuleDetailsHeaderTabs } from './use_rule_details_header_tabs';
import { useRuleEnabledSwitch } from './use_rule_enabled_switch';
import { useAddRuleToChatAction } from './use_add_rule_to_chat_action';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useRuleUpdateCallout } from '../../../rule_management/hooks/use_rule_update_callout';
import { useDeprecatedRuleDetailsCallout } from '../../../rule_management/components/rule_deprecation';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { CpsMlRuleCallout } from '../../../rule_management_ui/components/cps_ml_rule_callout/callout';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FiltersGlobal } from '../../../../common/components/filters_global';

const RULE_EXCEPTION_LIST_TYPES = [
  ExceptionListTypeEnum.DETECTION,
  ExceptionListTypeEnum.RULE_DEFAULT,
];

/**
 * Need a 100% height here to account for the graph/analyze tool, which sets no explicit height parameters, but fills the available space.
 */
const StyledFullHeightContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;

/**
 * Wrapper for the About, Definition and Schedule sections.
 * - Allows for overflow wrapping of extremely long text, that might otherwise break the layout.
 */
const RuleFieldsSectionWrapper = styled.div`
  overflow-wrap: anywhere;
`;

/**
 * Styled EuiFlexItem component that occupies a predetermined percentage of the parent container.
 */
const StyledEuiFlexItem = styled(EuiFlexItem)`
  min-width: 0px;
  flex-basis: ${({ flexBasis }) => (flexBasis ? `${flexBasis}%` : 'auto')};
`;

const defaultGroupingOptions = [
  {
    label: i18n.SOURCE_ADDRESS,
    key: 'source.address',
  },
  {
    label: i18n.USER_NAME,
    key: 'user.name',
  },
  {
    label: i18n.HOST_NAME,
    key: 'host.name',
  },
  {
    label: i18n.DESTINATION_ADDRESS,
    key: 'destination.address',
  },
];

const DEFAULT_PANEL_HEADER_OPTIONS = {
  border: true,
  hideSubtitle: true,
} as const;

/**
 * Cutoff at which the About and Definition sections stack vertically to prevent content squishing (600px for About and 400px for Definition)
 */
const ABOUT_CONTENT_STACK_WIDTH_THRESHOLD = 1000;

const mapDispatchToProps = (dispatch: Dispatch) => ({
  clearSelected: ({ id }: { id: string }) => dispatch(dataTableActions.clearSelected({ id })),
  clearEventsLoading: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsLoading({ id })),
  clearEventsDeleted: ({ id }: { id: string }) =>
    dispatch(dataTableActions.clearEventsDeleted({ id })),
});
const connector = connect(null, mapDispatchToProps);

type DetectionEngineComponentProps = ConnectedProps<typeof connector>;

export const RuleDetailsPage = connector(
  memo(function RuleDetailsPage({
    clearEventsDeleted,
    clearEventsLoading,
    clearSelected,
  }: DetectionEngineComponentProps) {
    const ruleChangesHistoryFFEnabled = useIsExperimentalFeatureEnabled(
      'ruleChangesHistoryEnabled'
    );
    const [ruleChangesHistoryAdvancedSetting] = useUiSetting$<boolean>(
      ENABLE_RULE_CHANGES_HISTORY_SETTING,
      false
    );
    const isRuleChangesHistoryEnabled =
      ruleChangesHistoryFFEnabled && ruleChangesHistoryAdvancedSetting;

    const { application, timelines: timelinesUi, spaces: spacesApi } = useKibana().services;
    const {
      navigateToApp,
      capabilities: { actions },
    } = application;

    const dispatch = useDispatch();
    const containerElement = useRef<HTMLDivElement | null>(null);
    const getTable = useMemo(() => dataTableSelectors.getTableByIdSelector(), []);

    const updatedAt = useShallowEqualSelector(
      (state) => (getTable(state, TableId.alertsOnRuleDetailsPage) ?? tableDefaults).updated
    );
    const isAlertsLoading = useShallowEqualSelector(
      (state) => (getTable(state, TableId.alertsOnRuleDetailsPage) ?? tableDefaults).isLoading
    );
    const getGlobalFiltersQuerySelector = useMemo(
      () => inputsSelectors.globalFiltersQuerySelector(),
      []
    );
    const getGlobalQuerySelector = useMemo(() => inputsSelectors.globalQuerySelector(), []);
    const query = useDeepEqualSelector(getGlobalQuerySelector);
    const filters = useDeepEqualSelector(getGlobalFiltersQuerySelector);

    const { to, from } = useGlobalTime();
    const [
      {
        loading: userInfoLoading,
        isSignalIndexExists,
        isAuthenticated,
        hasEncryptionKey,
        signalIndexName,
        hasIndexWrite,
        hasIndexMaintenance,
      },
    ] = useUserData();
    const {
      rules: { edit: canEditRules },
      enableDisable: { edit: canEnableDisableRules },
      customHighlightedFields: { edit: canEditCustomHighlightedFields },
      investigationGuide: { edit: canEditInvestigationGuides },
    } = useUserPrivileges().rulesPrivileges;
    const { hasAlertsRead: canReadAlerts } = useAlertsPrivileges();
    const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
      useListsConfig();

    const { dataView, status } = useDataView(PageScope.alerts);

    const loading = userInfoLoading || listsConfigLoading;
    const { detailName: ruleId } = useParams<{
      detailName: string;
      tabName: string;
    }>();

    const {
      rule: maybeRule,
      refresh: refreshRule,
      loading: ruleLoading,
      isExistingRule,
    } = useRuleWithFallback(ruleId);

    const { pollForSignalIndex } = useSignalHelpers();
    const [rule, setRule] = useState<RuleResponse | null>(null);
    const [shouldStackAboutContent, setShouldStackAboutContent] = useState(false);
    const isLoading = useMemo(() => ruleLoading && rule == null, [rule, ruleLoading]);

    const { starting: isStartingJobs, startMlJobs } = useStartMlJobs();
    const startMlJobsIfNeeded = useCallback(async () => {
      if (rule) {
        await startMlJobs(getMachineLearningJobId(rule));
      }
    }, [rule, startMlJobs]);

    const pageTabs = useRuleDetailsTabs({ rule, ruleId, isExistingRule, canReadAlerts });

    const confirmModalTitleId = useGeneratedHtmlId();
    const [isDeleteConfirmationVisible, showDeleteConfirmation, hideDeleteConfirmation] =
      useBoolState();

    const [confirmDeletion, handleDeletionConfirm, handleDeletionCancel] = useAsyncConfirmation({
      onInit: showDeleteConfirmation,
      onFinish: hideDeleteConfirmation,
    });

    const { aboutRuleData, modifiedAboutRuleDetailsData, ruleActionsData } =
      rule != null
        ? getStepsData({ rule, detailsView: true })
        : {
            aboutRuleData: null,
            modifiedAboutRuleDetailsData: null,
            ruleActionsData: null,
          };

    const { showBuildingBlockAlerts, setShowBuildingBlockAlerts, showOnlyThreatIndicatorAlerts } =
      useDataTableFilters(TableId.alertsOnRuleDetailsPage);

    const mlCapabilities = useMlCapabilities();
    const { globalFullScreen } = useGlobalFullScreen();
    const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);
    // TODO: Refactor license check + hasMlAdminPermissions to common check
    const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);

    const hasActionsPrivileges = useMemo(() => {
      if (rule?.actions != null && rule?.actions.length > 0 && isBoolean(actions.show)) {
        return actions.show;
      }
      return true;
    }, [actions, rule?.actions]);

    const navigateToAlertsTab = useCallback(() => {
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.rules,
        path: getRuleDetailsTabUrl(ruleId ?? '', 'alerts', ''),
      });
    }, [navigateToApp, ruleId]);

    // persist rule until refresh is complete
    useEffect(() => {
      if (maybeRule != null) {
        setRule(maybeRule);
      }
    }, [maybeRule]);

    useLegacyUrlRedirect({ rule, spacesApi });

    const showUpdating = useMemo(
      () => status !== 'ready' || isAlertsLoading || loading,
      [status, isAlertsLoading, loading]
    );

    const [dateFormat] = useUiSetting$<string>('dateFormat');

    const lastExecution = rule?.execution_summary?.last_execution;
    const lastExecutionStatus = lastExecution?.status;
    const lastExecutionDate = lastExecution?.date ?? '';
    const lastExecutionMessage = lastExecution?.message ?? '';

    const headerTitle = rule?.name ?? '';

    const isRuleCustomizedPrebuilt = rule != null && isCustomizedPrebuiltRule(rule);

    const headerBadges = useMemo<AppHeaderBadge[]>(() => {
      const badges: AppHeaderBadge[] = [];

      if (!ruleLoading && !isExistingRule) {
        badges.push({
          label: i18n.DELETED_RULE,
          color: 'default',
          'data-test-subj': 'rule-details-deleted-badge',
        });
      }

      if (isRuleCustomizedPrebuilt) {
        badges.push({
          label: i18n.MODIFIED_RULE_BADGE_LABEL,
          renderCustomBadge: () => <ModifiedRuleBadge rule={rule} />,
        });
      }

      if (rule != null) {
        if (isRuleChangesHistoryEnabled) {
          if (rule.rule_source.type === 'external') {
            badges.push({
              label: `${i18n.RULE_VERSION_BADGE_LABEL} ${rule.version}`,
              renderCustomBadge: () => <RuleVersion version={rule.version} />,
            });
          }
          badges.push({
            label: `${i18n.RULE_REVISION_BADGE_LABEL} ${rule.revision}`,
            renderCustomBadge: () => <RuleRevision revision={rule.revision} />,
          });
        }
      }

      return badges;
    }, [ruleLoading, isExistingRule, isRuleCustomizedPrebuilt, rule, isRuleChangesHistoryEnabled]);

    const headerMetadata = useMemo<AppHeaderMetadataItems | undefined>(() => {
      if (rule == null) {
        return undefined;
      }

      const items: AppHeaderMetadataItem[] = [
        {
          type: 'text',
          label: i18n.CREATED_BY_LABEL,
          value: i18n.CREATED_UPDATED_BY_VALUE(
            rule.created_by,
            moment(rule.created_at).format(dateFormat)
          ),
          'data-test-subj': 'rule-details-created-by',
        },
      ];

      if (rule.updated_by != null) {
        items.push({
          type: 'text',
          label: i18n.UPDATED_BY_LABEL,
          value: i18n.CREATED_UPDATED_BY_VALUE(
            rule.updated_by,
            moment(rule.updated_at).format(dateFormat)
          ),
          'data-test-subj': 'rule-details-updated-by',
        });
      }

      const statusText = getStatusText(lastExecutionStatus);
      if (statusText != null && items.length < 3) {
        items.push({
          type: 'health',
          label: statusText,
          color: getStatusColor(lastExecutionStatus),
          'data-test-subj': 'ruleStatus',
        });
      }

      return items.slice(0, 3) as unknown as AppHeaderMetadataItems;
    }, [rule, dateFormat, lastExecutionStatus]);

    // Callback for when open/closed filter changes
    const onFilterGroupChangedCallback = useCallback(
      (newFilterGroup: Status) => {
        const tableId = TableId.alertsOnRuleDetailsPage;
        clearEventsLoading({ id: tableId });
        clearEventsDeleted({ id: tableId });
        clearSelected({ id: tableId });
        setFilterGroup(newFilterGroup);
      },
      [clearEventsLoading, clearEventsDeleted, clearSelected, setFilterGroup]
    );

    const isBuildingBlockTypeNotNull = rule?.building_block_type != null;
    // Set showBuildingBlockAlerts if rule is a Building Block Rule otherwise we won't show alerts
    useEffect(() => {
      setShowBuildingBlockAlerts(isBuildingBlockTypeNotNull);
    }, [isBuildingBlockTypeNotNull, setShowBuildingBlockAlerts]);

    const ruleRuleId = rule?.rule_id ?? '';
    const alertDefaultFilters = useMemo(
      () => [
        ...buildAlertsFilter(ruleRuleId ?? ''),
        ...buildShowBuildingBlockFilter(showBuildingBlockAlerts),
        ...buildAlertStatusFilter(filterGroup),
        ...buildThreatMatchFilter(showOnlyThreatIndicatorAlerts),
      ],
      [ruleRuleId, showBuildingBlockAlerts, showOnlyThreatIndicatorAlerts, filterGroup]
    );

    const alertMergedFilters = useMemo(
      () => [...alertDefaultFilters, ...filters],
      [alertDefaultFilters, filters]
    );

    const upgradeCallout = useRuleUpdateCallout({
      rule,
      message: ruleI18n.HAS_RULE_UPDATE_DETAILS_CALLOUT_MESSAGE,
      onUpgrade: refreshRule,
    });

    // Extract rule index if available on rule type
    let ruleIndex: string[] | undefined;
    if (rule != null && 'index' in rule && Array.isArray(rule.index)) {
      ruleIndex = rule.index;
    }

    const ruleError = useMemo(() => {
      return ruleLoading ? (
        <EuiFlexItem>
          <EuiLoadingSpinner size="m" data-test-subj="rule-status-loader" />
        </EuiFlexItem>
      ) : (
        <>
          <EuiSpacer size="m" />
          <RuleStatusFailedCallOut
            ruleNameForChat={rule?.name ?? ruleI18n.DETECTION_RULES_CONVERSATION_ID}
            ruleName={rule?.immutable ? rule?.name : undefined}
            dataSources={rule?.immutable ? ruleIndex : undefined}
            status={lastExecutionStatus}
            date={lastExecutionDate}
            message={lastExecutionMessage}
          />
        </>
      );
    }, [
      lastExecutionStatus,
      lastExecutionDate,
      lastExecutionMessage,
      ruleLoading,
      rule?.immutable,
      rule?.name,
      ruleIndex,
    ]);

    const updateDateRangeCallback = useCallback<UpdateDateRange>(
      ({ x }) => {
        if (!x) {
          return;
        }
        const [min, max] = x;
        dispatch(
          setAbsoluteRangeDatePicker({
            id: InputsModelId.global,
            from: new Date(min).toISOString(),
            to: new Date(max).toISOString(),
          })
        );
      },
      [dispatch]
    );

    const handleOnChangeEnabledRule = useCallback((enabled: boolean) => {
      setRule((currentRule) => (currentRule ? { ...currentRule, enabled } : currentRule));
    }, []);

    const onSkipFocusBeforeEventsTable = useCallback(() => {
      focusUtilityBarAction(containerElement.current);
    }, [containerElement]);

    const onSkipFocusAfterEventsTable = useCallback(() => {
      resetKeyboardFocus();
    }, []);

    const onKeyDown = useCallback(
      (keyboardEvent: React.KeyboardEvent) => {
        if (isTab(keyboardEvent)) {
          onTimelineTabKeyPressed({
            containerElement: containerElement.current,
            keyboardEvent,
            onSkipFocusBeforeEventsTable,
            onSkipFocusAfterEventsTable,
          });
        }
      },
      [containerElement, onSkipFocusBeforeEventsTable, onSkipFocusAfterEventsTable]
    );
    const currentAlertStatusFilterValue = useMemo(() => [filterGroup], [filterGroup]);
    const updatedAtValue = useMemo(() => {
      return timelinesUi.getLastUpdated({
        updatedAt: updatedAt || Date.now(),
        showUpdating,
      });
    }, [updatedAt, showUpdating, timelinesUi]);

    const renderGroupedAlertTable = useCallback(
      (groupingFilters: Filter[]) => {
        return (
          <AlertsTable
            tableType={TableId.alertsOnRuleDetailsPage}
            inputFilters={[...alertMergedFilters, ...groupingFilters]}
            onRuleChange={refreshRule}
          />
        );
      },
      [alertMergedFilters, refreshRule]
    );

    const onResize: EuiResizeObserverProps['onResize'] = useCallback(
      (dimensions) => {
        if (!dimensions) return;
        setShouldStackAboutContent(dimensions.width < ABOUT_CONTENT_STACK_WIDTH_THRESHOLD);
      },
      [setShouldStackAboutContent]
    );

    const {
      isBulkDuplicateConfirmationVisible,
      showBulkDuplicateConfirmation,
      cancelRuleDuplication,
      confirmRuleDuplication,
    } = useBulkDuplicateExceptionsConfirmation();

    const deprecationCallout = useDeprecatedRuleDetailsCallout({
      rule,
      confirmDeletion,
    });

    const {
      isManualRuleRunConfirmationVisible,
      showManualRuleRunConfirmation,
      cancelManualRuleRun,
      confirmManualRuleRun,
    } = useManualRuleRunConfirmation();

    const groupTakeActionItems = useGroupTakeActionsItems({
      currentStatus: currentAlertStatusFilterValue,
      showAlertStatusActions: Boolean(hasIndexWrite) && Boolean(hasIndexMaintenance),
    });

    const accordionExtraActionGroupStats = useMemo(
      () => ({
        aggregations: defaultGroupStatsAggregations,
        renderer: defaultGroupStatsRenderer,
      }),
      []
    );

    const isRuleEnabled = isExistingRule && (rule?.enabled ?? false);

    const isRuleEditButtonEnabled =
      canEditRules || canEditCustomHighlightedFields || canEditInvestigationGuides;

    const isRuleEditDisabled =
      !isExistingRule || !isRuleEditButtonEnabled || (isMlRule(rule?.type) && !hasMlPermissions);

    const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
    const { onClick: onBackToRulesClick, href: backToRulesHref } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });

    const headerTabs = useRuleDetailsHeaderTabs(pageTabs);

    const ruleEnabledSwitch = useRuleEnabledSwitch({
      id: rule?.id ?? '-1',
      enabled: isRuleEnabled,
      label: i18n.ENABLE_RULE,
      isDisabled:
        !rule ||
        !isExistingRule ||
        !canEditRuleWithActions(rule, hasActionsPrivileges) ||
        !canEnableDisableRules ||
        (isMlRule(rule?.type) && !hasMlPermissions),
      tooltipContent: explainLackOfPermission(
        rule,
        hasMlPermissions,
        hasActionsPrivileges,
        canEnableDisableRules
      ),
      startMlJobsIfNeeded,
      onEnabledChanged: handleOnChangeEnabledRule,
    });

    const addToChatAction = useAddRuleToChatAction(rule);

    const headerStaticItems = useMemo<AppMenuItemType[]>(
      () => [
        {
          id: 'editRuleSettings',
          label: ruleI18n.EDIT_RULE_SETTINGS,
          iconType: 'controls',
          order: 10,
          testId: 'editRuleSettingsLink',
          disableButton: isRuleEditDisabled,
          tooltipContent: explainLackOfPermission(
            rule,
            hasMlPermissions,
            hasActionsPrivileges,
            isRuleEditButtonEnabled
          ),
          run: () => {
            navigateToApp(APP_UI_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getEditRuleUrl(ruleId ?? ''),
            });
          },
        },
        {
          id: 'refreshRule',
          label: ruleI18n.REFRESH,
          iconType: 'refresh',
          order: 20,
          testId: 'ruleLastExecutionStatusRefreshButton',
          disableButton: !isExistingRule,
          run: () => {
            refreshRule();
          },
        },
      ],
      [
        isRuleEditDisabled,
        rule,
        hasMlPermissions,
        hasActionsPrivileges,
        isRuleEditButtonEnabled,
        navigateToApp,
        ruleId,
        isExistingRule,
        refreshRule,
      ]
    );

    const headerActionsParams = useMemo<UseRuleActionsMenuItemsParams>(
      () => ({
        rule,
        ruleId,
        isDisabled: !isExistingRule,
        canDuplicateRuleWithActions: canEditRuleWithActions(rule, hasActionsPrivileges),
        showBulkDuplicateExceptionsConfirmation: showBulkDuplicateConfirmation,
        showManualRuleRunConfirmation,
        confirmDeletion,
      }),
      [
        rule,
        ruleId,
        isExistingRule,
        hasActionsPrivileges,
        showBulkDuplicateConfirmation,
        showManualRuleRunConfirmation,
        confirmDeletion,
      ]
    );

    const headerBack = useMemo(
      () => ({
        href: backToRulesHref,
        onClick: onBackToRulesClick,
        label: ruleI18n.PAGE_TITLE,
      }),
      [backToRulesHref, onBackToRulesClick]
    );

    if (
      redirectToDetections(
        isSignalIndexExists,
        isAuthenticated,
        hasEncryptionKey,
        needsListsConfiguration
      )
    ) {
      navigateToApp(APP_UI_ID, {
        deepLinkId: SecurityPageName.alerts,
        path: getDetectionEngineUrl(),
      });
      return null;
    }

    const defaultRuleStackByOption: AlertsStackByField = 'event.category';

    const hasNotificationActions = ruleActionsData != null && ruleActionsData.actions.length > 0;
    const hasResponseActions =
      ruleActionsData != null && (ruleActionsData.responseActions || []).length > 0;
    const hasActions = hasNotificationActions || hasResponseActions;

    return (
      <>
        <NeedAdminForUpdateRulesCallOut />
        <MissingDetectionsPrivilegesCallOut />
        {isMlRule(rule?.type) && <CpsMlRuleCallout />}
        {upgradeCallout}
        {deprecationCallout}
        {isBulkDuplicateConfirmationVisible && (
          <BulkActionDuplicateExceptionsConfirmation
            onCancel={cancelRuleDuplication}
            onConfirm={confirmRuleDuplication}
            rulesCount={1}
          />
        )}
        {isDeleteConfirmationVisible && (
          <EuiConfirmModal
            title={ruleI18n.SINGLE_DELETE_CONFIRMATION_TITLE}
            aria-label={ruleI18n.SINGLE_DELETE_CONFIRMATION_TITLE}
            onCancel={handleDeletionCancel}
            onConfirm={() => handleDeletionConfirm()}
            confirmButtonText={ruleI18n.DELETE_CONFIRMATION_CONFIRM}
            cancelButtonText={ruleI18n.DELETE_CONFIRMATION_CANCEL}
            buttonColor="danger"
            defaultFocusedButton="confirm"
            data-test-subj="deleteRulesConfirmationModal"
            aria-labelledby={confirmModalTitleId}
            titleProps={{ id: confirmModalTitleId }}
          >
            {i18n.DELETE_CONFIRMATION_BODY}
          </EuiConfirmModal>
        )}
        {isManualRuleRunConfirmationVisible && (
          <ManualRuleRunModal onCancel={cancelManualRuleRun} onConfirm={confirmManualRuleRun} />
        )}
        <StyledFullHeightContainer onKeyDown={onKeyDown} ref={containerElement}>
          <EuiWindowEvent event="resize" handler={noop} />
          <RuleCustomizationsContextProvider rule={rule}>
            <SecuritySolutionPageWrapper noPadding={globalFullScreen}>
              <Display show={!globalFullScreen}>
                <RuleDetailsAppHeader
                  title={headerTitle}
                  back={headerBack}
                  badges={headerBadges}
                  metadata={headerMetadata}
                  tabs={headerTabs}
                  switchConfig={ruleEnabledSwitch}
                  primaryActionItem={addToChatAction}
                  staticItems={headerStaticItems}
                  actionsParams={headerActionsParams}
                />
                {ruleError}
                <LegacyUrlConflictCallOut rule={rule} spacesApi={spacesApi} />
              </Display>
              <div>
                <Routes>
                  <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.overview})`}>
                    <RuleFieldsSectionWrapper>
                      <EuiResizeObserver onResize={onResize}>
                        {(resizeRef) => (
                          <EuiFlexGroup
                            direction={shouldStackAboutContent ? 'column' : 'row'}
                            ref={resizeRef}
                          >
                            <StyledEuiFlexItem
                              data-test-subj="aboutRule"
                              component="section"
                              flexBasis={60}
                            >
                              {rule !== null && (
                                <StepAboutRuleToggleDetails
                                  loading={isLoading}
                                  stepData={aboutRuleData}
                                  stepDataDetails={modifiedAboutRuleDetailsData}
                                  rule={rule}
                                />
                              )}
                            </StyledEuiFlexItem>
                            <StyledEuiFlexItem grow={1} component="section" flexBasis={40}>
                              <EuiFlexGroup direction="column">
                                <EuiFlexItem
                                  component="section"
                                  grow={1}
                                  data-test-subj="defineRule"
                                >
                                  <StepPanel
                                    loading={isLoading}
                                    title={ruleI18n.DEFINITION}
                                    headerProps={DEFAULT_PANEL_HEADER_OPTIONS}
                                  >
                                    {rule !== null && !isStartingJobs && (
                                      <RuleDefinitionSection
                                        rule={rule}
                                        isInteractive
                                        dataTestSubj="definitionRule"
                                      />
                                    )}
                                  </StepPanel>
                                </EuiFlexItem>
                                <EuiFlexItem data-test-subj="schedule" component="section" grow={1}>
                                  <StepPanel
                                    loading={isLoading}
                                    title={ruleI18n.SCHEDULE}
                                    headerProps={DEFAULT_PANEL_HEADER_OPTIONS}
                                  >
                                    {rule != null && <RuleScheduleSection rule={rule} />}
                                  </StepPanel>
                                </EuiFlexItem>
                                {hasActions && (
                                  <EuiFlexItem
                                    data-test-subj="actions"
                                    component="section"
                                    grow={1}
                                  >
                                    <StepPanel
                                      loading={isLoading}
                                      title={ruleI18n.ACTIONS}
                                      headerProps={DEFAULT_PANEL_HEADER_OPTIONS}
                                    >
                                      <StepRuleActionsReadOnly
                                        addPadding={false}
                                        defaultValues={ruleActionsData}
                                      />
                                    </StepPanel>
                                  </EuiFlexItem>
                                )}
                              </EuiFlexGroup>
                            </StyledEuiFlexItem>
                          </EuiFlexGroup>
                        )}
                      </EuiResizeObserver>
                    </RuleFieldsSectionWrapper>
                  </Route>
                  {canReadAlerts && (
                    <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.alerts})`}>
                      <>
                        <FiltersGlobal>
                          <SiemSearchBar
                            dataView={dataView}
                            pollForSignalIndex={pollForSignalIndex}
                            id={InputsModelId.global}
                          />
                        </FiltersGlobal>
                        <EuiSpacer />
                        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                          <EuiFlexItem grow={false}>
                            <AlertsTableFilterGroup
                              status={filterGroup}
                              onFilterGroupChanged={onFilterGroupChangedCallback}
                            />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>{updatedAtValue}</EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiSpacer size="l" />
                        <Display show={!globalFullScreen}>
                          <AlertsHistogramPanel
                            filters={alertMergedFilters}
                            signalIndexName={signalIndexName}
                            defaultStackByOption={defaultRuleStackByOption}
                            updateDateRange={updateDateRangeCallback}
                          />
                          <EuiSpacer />
                        </Display>
                        {ruleId != null && (
                          <GroupedAlertsTable
                            accordionButtonContent={defaultGroupTitleRenderers}
                            accordionExtraActionGroupStats={accordionExtraActionGroupStats}
                            dataView={dataView}
                            defaultFilters={alertMergedFilters}
                            defaultGroupingOptions={defaultGroupingOptions}
                            from={from}
                            globalFilters={filters}
                            globalQuery={query}
                            groupTakeActionItems={groupTakeActionItems}
                            loading={loading}
                            renderChildComponent={renderGroupedAlertTable}
                            tableId={TableId.alertsOnRuleDetailsPage}
                            to={to}
                          />
                        )}
                      </>
                    </Route>
                  )}
                  <Route path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.exceptions})`}>
                    <ExceptionsViewer
                      rule={rule}
                      listTypes={RULE_EXCEPTION_LIST_TYPES}
                      onRuleChange={refreshRule}
                      isViewReadOnly={!isExistingRule}
                      data-test-subj="exceptionTab"
                    />
                  </Route>
                  <Route
                    path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.endpointExceptions})`}
                  >
                    <EndpointExceptionsViewer
                      rule={rule}
                      onRuleChange={refreshRule}
                      isViewReadOnly={!isExistingRule}
                      data-test-subj="endpointExceptionsTab"
                    />
                  </Route>
                  <Route
                    path={`/rules/id/:detailName/:tabName(${RuleDetailTabs.executionResults})`}
                  >
                    <>
                      <ExecutionResultsTable
                        ruleId={ruleId}
                        navigateToAlertsTab={navigateToAlertsTab}
                      />
                      <EuiSpacer size="xl" />
                      <RuleGaps ruleId={ruleId} enabled={isRuleEnabled} />
                      <EuiSpacer size="xl" />
                      <RuleBackfillsInfo ruleId={ruleId} />
                    </>
                  </Route>
                </Routes>
              </div>
            </SecuritySolutionPageWrapper>
          </RuleCustomizationsContextProvider>
        </StyledFullHeightContainer>
        <SpyRoute
          pageName={SecurityPageName.rules}
          state={{ ruleName: rule?.name, isExistingRule }}
        />
      </>
    );
  })
);
