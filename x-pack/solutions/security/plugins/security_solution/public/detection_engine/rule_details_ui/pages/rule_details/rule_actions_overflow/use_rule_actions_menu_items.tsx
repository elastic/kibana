/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useRuleCustomizationsContext } from '../../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { isCustomizedPrebuiltRule } from '../../../../../../common/api/detection_engine';
import { useScheduleRuleRun } from '../../../../rule_gaps/logic/use_schedule_rule_run';
import type { TimeRange } from '../../../../rule_gaps/types';
import { APP_UI_ID, SecurityPageName } from '../../../../../../common';
import { ENABLE_RULE_CHANGES_HISTORY_SETTING } from '../../../../../../common/constants';
import { DuplicateOptions } from '../../../../../../common/detection_engine/rule_management/constants';
import { BulkActionTypeEnum } from '../../../../../../common/api/detection_engine/rule_management';
import {
  getRulesUrl,
  getRuleChangesHistoryUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { SINGLE_RULE_ACTIONS } from '../../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../../common/lib/apm/use_start_transaction';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { canEditRuleWithActions } from '../../../../../common/utils/privileges';
import type { Rule } from '../../../../rule_management/logic';
import { useBulkExport } from '../../../../rule_management/logic/bulk_actions/use_bulk_export';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useDownloadExportedRules } from '../../../../rule_management/logic/bulk_actions/use_download_exported_rules';
import * as i18nActions from '../../../../common/translations';
import { ManualRuleRunEventTypes } from '../../../../../common/lib/telemetry';

export interface UseRuleActionsMenuItemsParams {
  rule: Rule | null;
  ruleId: string; // RuleObjectId
  isDisabled: boolean;
  canDuplicateRuleWithActions: boolean;
  showBulkDuplicateExceptionsConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}

/**
 * Builds the overflow rule actions (history, duplicate, export, manual run, revert, delete) for the
 * rule details app header menu. Extracted from the former `RuleActionsOverflow` popover so the same
 * behavior is preserved while the actions live inside the shared app menu.
 */
export const useRuleActionsMenuItems = ({
  rule,
  ruleId,
  isDisabled,
  canDuplicateRuleWithActions,
  showBulkDuplicateExceptionsConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: UseRuleActionsMenuItemsParams): AppMenuItemType[] => {
  const {
    application: { navigateToApp },
    telemetry,
  } = useKibana().services;
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: true });
  const { bulkExport } = useBulkExport();
  const downloadExportedRules = useDownloadExportedRules();
  const { scheduleRuleRun } = useScheduleRuleRun();
  const {
    rules: { edit: canEditRules, read: canReadRules },
    exceptions: { edit: canEditExceptions },
    manualRun: { edit: canManualRunRules },
  } = useUserPrivileges().rulesPrivileges;

  const {
    actions: { openCustomizationsRevertFlyout },
    state: { doesBaseVersionExist },
  } = useRuleCustomizationsContext();

  const ruleChangesHistoryFFEnabled = useIsExperimentalFeatureEnabled('ruleChangesHistoryEnabled');
  const [ruleChangesHistoryAdvancedSetting] = useUiSetting$<boolean>(
    ENABLE_RULE_CHANGES_HISTORY_SETTING,
    false
  );
  const isRuleChangesHistoryEnabled =
    ruleChangesHistoryFFEnabled && ruleChangesHistoryAdvancedSetting;

  return useMemo<AppMenuItemType[]>(() => {
    const items: AppMenuItemType[] = [];

    if (isRuleChangesHistoryEnabled) {
      items.push({
        id: 'ruleChangesHistory',
        label: i18nActions.RULE_CHANGES_HISTORY,
        iconType: 'clock',
        order: 100,
        overflow: true,
        testId: 'rules-details-history',
        run: () => {
          // We can't use SecurityPageName.rulesChangesHistory here for deepLinkId as deep linking
          // doesn't support path parameters.
          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRuleChangesHistoryUrl(ruleId),
          });
        },
      });
    }

    if (rule != null) {
      items.push({
        id: 'duplicateRule',
        label: i18nActions.DUPLICATE_RULE,
        iconType: 'copy',
        order: 200,
        overflow: true,
        testId: 'rules-details-duplicate-rule',
        disableButton: isDisabled || !canDuplicateRuleWithActions || !canEditRules,
        tooltipContent: !canEditRuleWithActions(rule, canDuplicateRuleWithActions)
          ? i18nActions.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES
          : undefined,
        run: async () => {
          startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
          const modalDuplicationConfirmationResult = canEditExceptions
            ? await showBulkDuplicateExceptionsConfirmation()
            : DuplicateOptions.withoutExceptions;
          if (modalDuplicationConfirmationResult === null) {
            return;
          }
          const result = await executeBulkAction({
            type: BulkActionTypeEnum.duplicate,
            ids: [rule.id],
            duplicatePayload: {
              include_exceptions:
                modalDuplicationConfirmationResult === DuplicateOptions.withExceptions ||
                modalDuplicationConfirmationResult ===
                  DuplicateOptions.withExceptionsExcludeExpiredExceptions,
              include_expired_exceptions: !(
                modalDuplicationConfirmationResult ===
                DuplicateOptions.withExceptionsExcludeExpiredExceptions
              ),
            },
          });

          const createdRules = result?.attributes.results.created;
          if (createdRules?.length) {
            goToRuleEditPage(createdRules[0].id, navigateToApp);
          }
        },
      });

      items.push({
        id: 'exportRule',
        label: i18nActions.EXPORT_RULE,
        iconType: 'upload',
        order: 300,
        overflow: true,
        testId: 'rules-details-export-rule',
        disableButton: isDisabled || !canReadRules,
        run: async () => {
          startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
          const response = await bulkExport({ ids: [rule.id] });
          if (response) {
            await downloadExportedRules(response);
          }
        },
      });

      items.push({
        id: 'manualRuleRun',
        label: i18nActions.MANUAL_RULE_RUN,
        iconType: 'play',
        order: 400,
        overflow: true,
        testId: 'rules-details-manual-rule-run',
        disableButton: isDisabled || !canManualRunRules || !rule.enabled,
        tooltipContent: !canManualRunRules
          ? i18nActions.MANUAL_RULE_RUN_PERMISSIONS_TOOLTIP
          : !rule.enabled
          ? i18nActions.MANUAL_RULE_RUN_TOOLTIP
          : undefined,
        run: async () => {
          startTransaction({ name: SINGLE_RULE_ACTIONS.MANUAL_RULE_RUN });
          const modalManualRuleRunConfirmationResult = await showManualRuleRunConfirmation();
          telemetry.reportEvent(ManualRuleRunEventTypes.ManualRuleRunOpenModal, {
            type: 'single',
          });
          if (modalManualRuleRunConfirmationResult === null) {
            return;
          }
          await scheduleRuleRun({
            ruleIds: [rule.id],
            timeRange: modalManualRuleRunConfirmationResult,
          });
        },
      });

      if (isCustomizedPrebuiltRule(rule)) {
        items.push({
          id: 'revertRule',
          label: i18nActions.REVERT_RULE,
          iconType: 'refreshTime',
          order: 500,
          overflow: true,
          testId: 'rules-details-revert-rule',
          disableButton: isDisabled || !canEditRules || !doesBaseVersionExist,
          tooltipContent: !doesBaseVersionExist
            ? i18nActions.REVERT_RULE_TOOLTIP_CONTENT
            : undefined,
          tooltipTitle: !doesBaseVersionExist ? i18nActions.REVERT_RULE_TOOLTIP_TITLE : undefined,
          run: () => {
            openCustomizationsRevertFlyout();
          },
        });
      }

      items.push({
        id: 'deleteRule',
        label: i18nActions.DELETE_RULE,
        iconType: 'trash',
        order: 600,
        overflow: true,
        isDestructive: true,
        testId: 'rules-details-delete-rule',
        disableButton: isDisabled || !canEditRules,
        run: async () => {
          if ((await confirmDeletion()) === false) {
            // User has canceled deletion
            return;
          }

          startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
          await executeBulkAction({
            type: BulkActionTypeEnum.delete,
            ids: [rule.id],
          });

          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRulesUrl(),
          });
        },
      });
    }

    return items;
  }, [
    rule,
    ruleId,
    isRuleChangesHistoryEnabled,
    isDisabled,
    canDuplicateRuleWithActions,
    canEditRules,
    canReadRules,
    canManualRunRules,
    doesBaseVersionExist,
    startTransaction,
    canEditExceptions,
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
  ]);
};
