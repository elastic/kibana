/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuItemType } from '@kbn/app-menu';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { DuplicateOptions } from '../../../../../common/detection_engine/rule_management/constants';
import { ENABLE_RULE_CHANGES_HISTORY_SETTING, APP_UI_ID } from '../../../../../common/constants';
import { hasMlAdminPermissions } from '../../../../../common/machine_learning/has_ml_admin_permissions';
import { hasMlLicense } from '../../../../../common/machine_learning/has_ml_license';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { SecurityPageName } from '../../../../app/types';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import {
  getEditRuleUrl,
  getRuleChangesHistoryUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useGetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import {
  canEditRuleWithActions,
  explainLackOfPermission,
} from '../../../../common/utils/privileges';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import type { Rule } from '../../../rule_management/logic';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import { useDownloadExportedRules } from '../../../rule_management/logic/bulk_actions/use_download_exported_rules';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useScheduleRuleRun } from '../../../rule_gaps/logic/use_schedule_rule_run';
import type { TimeRange } from '../../../rule_gaps/types';
import * as actionI18n from '../../../common/translations';
import * as i18n from './translations';
import { useAddRuleToChatMenuItem } from './use_add_rule_to_chat_menu_item';

/** A refresh is often faster than a frame, so its loading state is kept visible for at least this long. */
const MIN_REFRESH_FEEDBACK_MS = 500;

interface UseRuleDetailsMenuProps {
  rule: Rule | null;
  ruleId: string;
  ruleLoading: boolean;
  isExistingRule: boolean;
  hasActionsPrivileges: boolean;
  refreshRule: () => void;
  snoozeMenuItem: AppMenuItemType;
  showBulkDuplicateExceptionsConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}

export const useRuleDetailsMenu = ({
  rule,
  ruleId,
  ruleLoading,
  isExistingRule,
  hasActionsPrivileges,
  refreshRule,
  snoozeMenuItem,
  showBulkDuplicateExceptionsConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: UseRuleDetailsMenuProps): AppHeaderMenu => {
  const {
    application: { navigateToApp },
    telemetry,
  } = useKibana().services;
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: true });
  const { bulkExport } = useBulkExport();
  const downloadExportedRules = useDownloadExportedRules();
  const { scheduleRuleRun } = useScheduleRuleRun();
  const {
    actions: { openCustomizationsRevertFlyout },
    state: { doesBaseVersionExist },
  } = useRuleCustomizationsContext();
  const {
    rules: { edit: canEditRules, read: canReadRules },
    exceptions: { edit: canEditExceptions },
    manualRun: { edit: canManualRunRules },
    customHighlightedFields: { edit: canEditCustomHighlightedFields },
    investigationGuide: { edit: canEditInvestigationGuides },
  } = useUserPrivileges().rulesPrivileges;
  const ruleChangesHistoryFFEnabled = useIsExperimentalFeatureEnabled('ruleChangesHistoryEnabled');
  const [ruleChangesHistoryAdvancedSetting] = useUiSetting$<boolean>(
    ENABLE_RULE_CHANGES_HISTORY_SETTING
  );
  const isRuleChangesHistoryEnabled =
    ruleChangesHistoryFFEnabled && ruleChangesHistoryAdvancedSetting;
  const mlCapabilities = useMlCapabilities();
  const hasMlPermissions = hasMlLicense(mlCapabilities) && hasMlAdminPermissions(mlCapabilities);
  const addRuleToChatMenuItem = useAddRuleToChatMenuItem(rule);
  const [isRefreshFeedbackVisible, setIsRefreshFeedbackVisible] = useState(false);
  const refreshFeedbackTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isRefreshing = ruleLoading || isRefreshFeedbackVisible;

  useEffect(() => () => clearTimeout(refreshFeedbackTimeout.current), []);

  const refreshRuleWithFeedback = useCallback(() => {
    refreshRule();
    setIsRefreshFeedbackVisible(true);
    clearTimeout(refreshFeedbackTimeout.current);
    refreshFeedbackTimeout.current = setTimeout(
      () => setIsRefreshFeedbackVisible(false),
      MIN_REFRESH_FEEDBACK_MS
    );
  }, [refreshRule]);
  const canDuplicateRuleWithActions = canEditRuleWithActions(rule, hasActionsPrivileges);
  const isRuleEditButtonEnabled =
    canEditRules || canEditCustomHighlightedFields || canEditInvestigationGuides;
  const editDisabled =
    !isExistingRule || !isRuleEditButtonEnabled || (isMlRule(rule?.type) && !hasMlPermissions);

  return useMemo<AppHeaderMenu>(
    () => ({
      primaryActionItem: {
        id: 'editRule',
        label: actionI18n.EDIT_RULE_SETTINGS,
        iconType: 'controls',
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.rules,
          path: getEditRuleUrl(ruleId),
        }),
        disableButton: editDisabled,
        tooltipContent: explainLackOfPermission(
          rule,
          hasMlPermissions,
          hasActionsPrivileges,
          isRuleEditButtonEnabled
        ),
        testId: 'editRuleSettingsLink',
      },
      items: [
        {
          id: 'refreshRuleStatus',
          label: i18n.REFRESH_STATUS,
          iconType: 'refresh',
          isLoading: isRefreshing,
          disableButton: !isExistingRule || isRefreshing,
          testId: 'ruleLastExecutionStatusRefreshButton',
          run: refreshRuleWithFeedback,
        },
        ...(isRuleChangesHistoryEnabled
          ? [
              {
                id: 'ruleHistory',
                label: actionI18n.RULE_CHANGES_HISTORY,
                iconType: 'clock' as const,
                href: getSecuritySolutionUrl({
                  deepLinkId: SecurityPageName.rules,
                  path: getRuleChangesHistoryUrl(ruleId),
                }),
                testId: 'rules-details-history',
              },
            ]
          : []),
        snoozeMenuItem,
        ...(addRuleToChatMenuItem ? [addRuleToChatMenuItem] : []),
        ...(rule
          ? [
              {
                id: 'duplicateRule',
                label: actionI18n.DUPLICATE_RULE,
                iconType: 'copy' as const,
                overflow: true as const,
                disableButton: !isExistingRule || !canDuplicateRuleWithActions || !canEditRules,
                tooltipContent: !canDuplicateRuleWithActions
                  ? actionI18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
                  : undefined,
                testId: 'rules-details-duplicate-rule',
                run: async () => {
                  startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
                  const choice = canEditExceptions
                    ? await showBulkDuplicateExceptionsConfirmation()
                    : DuplicateOptions.withoutExceptions;
                  if (choice === null) return;
                  const result = await executeBulkAction({
                    type: BulkActionTypeEnum.duplicate,
                    ids: [rule.id],
                    duplicatePayload: {
                      include_exceptions:
                        choice === DuplicateOptions.withExceptions ||
                        choice === DuplicateOptions.withExceptionsExcludeExpiredExceptions,
                      include_expired_exceptions:
                        choice !== DuplicateOptions.withExceptionsExcludeExpiredExceptions,
                    },
                  });
                  const created = result?.attributes.results.created[0];
                  if (created) goToRuleEditPage(created.id, navigateToApp);
                },
              },
              {
                id: 'exportRule',
                label: actionI18n.EXPORT_RULE,
                iconType: 'upload' as const,
                overflow: true as const,
                disableButton: !isExistingRule || !canReadRules,
                testId: 'rules-details-export-rule',
                run: async () => {
                  startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
                  const response = await bulkExport({ ids: [rule.id] });
                  if (response) await downloadExportedRules(response);
                },
              },
              {
                id: 'manualRuleRun',
                label: actionI18n.MANUAL_RULE_RUN,
                iconType: 'play' as const,
                overflow: true as const,
                disableButton: !isExistingRule || !canManualRunRules || !rule.enabled,
                tooltipContent: !canManualRunRules
                  ? actionI18n.MANUAL_RULE_RUN_PERMISSIONS_TOOLTIP
                  : !rule.enabled
                  ? actionI18n.MANUAL_RULE_RUN_TOOLTIP
                  : undefined,
                testId: 'rules-details-manual-rule-run',
                run: async () => {
                  startTransaction({ name: SINGLE_RULE_ACTIONS.MANUAL_RULE_RUN });
                  const timeRange = await showManualRuleRunConfirmation();
                  telemetry.reportEvent(ManualRuleRunEventTypes.ManualRuleRunOpenModal, {
                    type: 'single',
                  });
                  if (timeRange) await scheduleRuleRun({ ruleIds: [rule.id], timeRange });
                },
              },
              ...(isCustomizedPrebuiltRule(rule)
                ? [
                    {
                      id: 'revertRule',
                      label: actionI18n.REVERT_RULE,
                      iconType: 'refreshTime' as const,
                      overflow: true as const,
                      disableButton: !isExistingRule || !canEditRules || !doesBaseVersionExist,
                      tooltipContent: !doesBaseVersionExist
                        ? actionI18n.REVERT_RULE_TOOLTIP_CONTENT
                        : undefined,
                      tooltipTitle: !doesBaseVersionExist
                        ? actionI18n.REVERT_RULE_TOOLTIP_TITLE
                        : undefined,
                      testId: 'rules-details-revert-rule',
                      run: openCustomizationsRevertFlyout,
                    },
                  ]
                : []),
              {
                id: 'deleteRule',
                label: actionI18n.DELETE_RULE,
                iconType: 'trash' as const,
                overflow: true as const,
                disableButton: !isExistingRule || !canEditRules,
                testId: 'rules-details-delete-rule',
                run: async () => {
                  if (!(await confirmDeletion())) return;
                  startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
                  await executeBulkAction({ type: BulkActionTypeEnum.delete, ids: [rule.id] });
                  navigateToApp(APP_UI_ID, {
                    deepLinkId: SecurityPageName.rules,
                    path: getRulesUrl(),
                  });
                },
              },
            ]
          : []),
      ],
    }),
    [
      rule,
      ruleId,
      hasMlPermissions,
      hasActionsPrivileges,
      isRefreshing,
      refreshRuleWithFeedback,
      snoozeMenuItem,
      addRuleToChatMenuItem,
      getSecuritySolutionUrl,
      editDisabled,
      isRuleEditButtonEnabled,
      isRuleChangesHistoryEnabled,
      isExistingRule,
      canDuplicateRuleWithActions,
      canEditRules,
      canEditExceptions,
      canReadRules,
      canManualRunRules,
      doesBaseVersionExist,
      startTransaction,
      showBulkDuplicateExceptionsConfirmation,
      executeBulkAction,
      navigateToApp,
      bulkExport,
      downloadExportedRules,
      showManualRuleRunConfirmation,
      telemetry,
      scheduleRuleRun,
      openCustomizationsRevertFlyout,
      confirmDeletion,
    ]
  );
};
