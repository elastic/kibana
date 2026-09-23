/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import moment from 'moment-timezone';
import { noop } from 'lodash/fp';
import { AppHeader } from '@kbn/app-header';
import type {
  AppHeaderBadge,
  AppHeaderMenu,
  AppHeaderMetadataItems,
  AppHeaderTab,
} from '@kbn/app-header';
import { i18n as i18nCore } from '@kbn/i18n';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import {
  APP_UI_ID,
  ENABLE_RULE_CHANGES_HISTORY_SETTING,
  SECURITY_RULE_ATTACHMENT_ID,
  SecurityAgentBuilderAttachments,
} from '../../../../../common/constants';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine/model/rule_schema/utils';
import { DuplicateOptions } from '../../../../../common/detection_engine/rule_management/constants';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import { SecurityPageName } from '../../../../app/types';
import {
  getEditRuleUrl,
  getRuleChangesHistoryUrl,
  getRuleDetailsTabUrl,
  getRulesUrl,
} from '../../../../common/components/link_to/redirect_to_detection_engine';
import {
  useDateFormat,
  useKibana,
  useTimeZone,
  useUiSetting$,
} from '../../../../common/lib/kibana';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { canEditRuleWithActions } from '../../../../common/utils/privileges';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useBoolState } from '../../../../common/hooks/use_bool_state';
import { ADD_TO_CHAT } from '../../../../agent_builder/components/translations';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { RULE_EXPLORATION_ATTACHMENT_PROMPT } from '../../../../agent_builder/components/prompts';
import { stripServerFields } from '../../../common/ai_rule_creation_handler';
import {
  getCapitalizedStatusText,
  getStatusColor,
} from '../../../common/components/rule_execution_status/utils';
import * as ruleI18n from '../../../common/translations';
import * as ruleStatusI18n from '../../../common/components/rule_execution_status/translations';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useDownloadExportedRules } from '../../../rule_management/logic/bulk_actions/use_download_exported_rules';
import { useScheduleRuleRun } from '../../../rule_gaps/logic/use_schedule_rule_run';
import type { TimeRange } from '../../../rule_gaps/types';
import { useRuleCustomizationsContext } from '../../../rule_management/components/rule_details/rule_customizations_diff/rule_customizations_context';
import { useRuleSnoozeSettings } from '../../../rule_management/components/rule_snooze_badge/use_rule_snooze_settings';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../../../rule_management/api/hooks/use_fetch_rules_snooze_settings_query';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';
import { UNKNOWN_TEXT } from '../../../../detections/components/rules/rule_info/translations';
import type { NavTab } from '../../../../common/components/navigation/types';
import type { RuleDetailTabs } from './use_rule_details_tabs';
import { RULE_DETAILS_TAB_NAME } from './use_rule_details_tabs';
import * as pageI18n from './translations';

const BACK_TO_RULES = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.backToRules',
  { defaultMessage: 'Rules' }
);

const SET_SNOOZE = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.setSnooze',
  { defaultMessage: 'Set snooze' }
);

const ENABLED_SWITCH = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.enabledSwitch',
  { defaultMessage: 'Enabled' }
);

const DISABLED_SWITCH = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.disabledSwitch',
  { defaultMessage: 'Disabled' }
);

const REFRESH_STATUS = i18nCore.translate(
  'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.refreshStatus',
  { defaultMessage: 'Refresh status' }
);

export interface RuleDetailsAppHeaderProps {
  rule: RuleResponse | null;
  ruleId: string;
  isExistingRule: boolean;
  ruleLoading: boolean;
  pageTabs: Partial<Record<RuleDetailTabs, NavTab>>;
  tabName: string | undefined;
  canEnableDisableRules: boolean;
  canEditRules: boolean;
  hasMlPermissions: boolean;
  hasActionsPrivileges: boolean;
  isRuleEditButtonEnabled: boolean;
  isAgentChatExperienceEnabled: boolean;
  startMlJobsIfNeeded?: () => Promise<void>;
  refreshRule: () => void;
  onChangeEnabled: (enabled: boolean) => void;
  showBulkDuplicateExceptionsConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}

export const RuleDetailsAppHeader: React.FC<RuleDetailsAppHeaderProps> = ({
  rule,
  ruleId,
  isExistingRule,
  ruleLoading,
  pageTabs,
  tabName,
  canEnableDisableRules,
  canEditRules,
  hasMlPermissions,
  hasActionsPrivileges,
  isRuleEditButtonEnabled,
  isAgentChatExperienceEnabled,
  startMlJobsIfNeeded,
  refreshRule,
  onChangeEnabled,
  showBulkDuplicateExceptionsConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}) => {
  const {
    application: { navigateToApp, getUrlForApp },
    telemetry,
    aiRuleCreation,
    docLinks,
    triggersActionsUi: { getRuleSnoozeModal: RuleSnoozeModal },
  } = useKibana().services;
  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: true });
  const { bulkExport } = useBulkExport();
  const downloadExportedRules = useDownloadExportedRules();
  const { scheduleRuleRun } = useScheduleRuleRun();
  const [isSnoozeModalOpen, openSnoozeModal, closeSnoozeModal] = useBoolState();
  const { snoozeSettings, error: snoozeSettingsError } = useRuleSnoozeSettings(ruleId);
  const invalidateFetchRuleSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const {
    rules: { read: canReadRules },
    exceptions: { edit: canEditExceptions },
    manualRun: { edit: canManualRunRules },
  } = useUserPrivileges().rulesPrivileges;
  const {
    actions: { openCustomizationsRevertFlyout },
    state: { doesBaseVersionExist },
  } = useRuleCustomizationsContext();

  const ruleChangesHistoryFFEnabled = useIsExperimentalFeatureEnabled('ruleChangesHistoryEnabled');
  const [ruleChangesHistoryAdvancedSetting] = useUiSetting$<boolean>(
    ENABLE_RULE_CHANGES_HISTORY_SETTING
  );
  const isRuleChangesHistoryEnabled =
    ruleChangesHistoryFFEnabled && ruleChangesHistoryAdvancedSetting;

  const formatDate = useCallback(
    (value?: string | null) => {
      if (!value) {
        return '';
      }
      return moment.tz(value, timeZone).format(dateFormat);
    },
    [dateFormat, timeZone]
  );

  const isRuleEnabled = isExistingRule && (rule?.enabled ?? false);
  const canToggleEnabled =
    !!rule &&
    isExistingRule &&
    canEditRuleWithActions(rule, hasActionsPrivileges) &&
    canEnableDisableRules &&
    !(isMlRule(rule.type) && !hasMlPermissions);

  const handleToggleEnabled = useCallback(
    async (enableRule: boolean) => {
      if (!rule) {
        return;
      }
      startTransaction({
        name: enableRule ? SINGLE_RULE_ACTIONS.ENABLE : SINGLE_RULE_ACTIONS.DISABLE,
      });
      if (enableRule) {
        await startMlJobsIfNeeded?.();
      }
      const bulkActionResponse = await executeBulkAction({
        type: enableRule ? BulkActionTypeEnum.enable : BulkActionTypeEnum.disable,
        ids: [rule.id],
      });
      if (bulkActionResponse?.attributes.results.updated.length) {
        onChangeEnabled(bulkActionResponse.attributes.results.updated[0].enabled);
      }
    },
    [executeBulkAction, onChangeEnabled, rule, startMlJobsIfNeeded, startTransaction]
  );

  const rulesHref = getUrlForApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getRulesUrl(),
  });

  const lastExecution = rule?.execution_summary?.last_execution;
  const lastExecutionStatus = lastExecution?.status;
  const lastExecutionDate = lastExecution?.date ?? '';
  const statusText = getCapitalizedStatusText(lastExecutionStatus);
  const statusColor = getStatusColor(lastExecutionStatus);

  const metadata = useMemo<AppHeaderMetadataItems | undefined>(() => {
    if (ruleLoading && !rule) {
      return undefined;
    }
    const createdByLabel = i18nCore.translate(
      'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.createdBy',
      {
        defaultMessage: 'Created by: {by} on {date}',
        values: {
          by: rule?.created_by ?? UNKNOWN_TEXT,
          date: formatDate(rule?.created_at),
        },
      }
    );
    const updatedByLabel = i18nCore.translate(
      'xpack.securitySolution.detectionEngine.ruleDetails.appHeader.updatedBy',
      {
        defaultMessage: 'Updated by: {by} on {date}',
        values: {
          by: rule?.updated_by ?? UNKNOWN_TEXT,
          date: formatDate(rule?.updated_at),
        },
      }
    );
    const items: AppHeaderMetadataItems = [
      statusText != null && lastExecutionDate
        ? {
            type: 'health',
            label: `${statusText} ${ruleStatusI18n.STATUS_AT} ${formatDate(lastExecutionDate)}`,
            color: statusColor,
            'data-test-subj': 'ruleDetailsAppHeaderStatus',
          }
        : {
            type: 'health',
            label: statusText ?? '—',
            color: statusColor,
            'data-test-subj': 'ruleDetailsAppHeaderStatus',
          },
      {
        type: 'text',
        label: createdByLabel,
        'data-test-subj': 'ruleDetailsAppHeaderCreatedBy',
      },
      {
        type: 'text',
        label: updatedByLabel,
        'data-test-subj': 'ruleDetailsAppHeaderUpdatedBy',
      },
    ];
    return items;
  }, [formatDate, lastExecutionDate, rule, ruleLoading, statusColor, statusText]);

  const badges = useMemo<AppHeaderBadge[]>(() => {
    const next: AppHeaderBadge[] = [];
    if (isExistingRule && rule != null) {
      next.push({
        label: isRuleEnabled ? ENABLED_SWITCH : DISABLED_SWITCH,
        color: isRuleEnabled ? 'primary' : 'hollow',
        'data-test-subj': 'ruleDetailsAppHeaderEnabledBadge',
        items: [
          {
            name: ENABLED_SWITCH,
            onClick: () => {
              if (!isRuleEnabled) {
                void handleToggleEnabled(true);
              }
            },
            disabled: !canToggleEnabled || isRuleEnabled,
            'data-test-subj': 'ruleDetailsAppHeaderEnable',
          },
          {
            name: DISABLED_SWITCH,
            onClick: () => {
              if (isRuleEnabled) {
                void handleToggleEnabled(false);
              }
            },
            disabled: !canToggleEnabled || !isRuleEnabled,
            'data-test-subj': 'ruleDetailsAppHeaderDisable',
          },
        ],
      });
    }
    if (!ruleLoading && !isExistingRule) {
      next.push({
        label: pageI18n.DELETED_RULE,
        color: 'default',
        'data-test-subj': 'ruleDetailsAppHeaderDeletedBadge',
      });
    }
    return next;
  }, [canToggleEnabled, handleToggleEnabled, isExistingRule, isRuleEnabled, rule, ruleLoading]);

  const tabs = useMemo<AppHeaderTab[]>(() => {
    const selectedTab = tabName ?? Object.keys(pageTabs)[0];
    return (Object.values(pageTabs) as Array<NavTab | undefined>)
      .filter((tab): tab is NavTab => tab != null)
      .map((tab) => ({
        id: tab.id,
        label: RULE_DETAILS_TAB_NAME[tab.id] ?? tab.name,
        isSelected: selectedTab === tab.id,
        disabled: tab.disabled,
        href: getUrlForApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.rules,
          path: getRuleDetailsTabUrl(ruleId, tab.id),
        }),
        onClick: () => {
          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsTabUrl(ruleId, tab.id),
          });
        },
        'data-test-subj': `ruleDetailsAppHeaderTab-${tab.id}`,
      }));
  }, [getUrlForApp, navigateToApp, pageTabs, ruleId, tabName]);

  const ruleAttachment = useMemo(() => {
    if (!rule) {
      return null;
    }
    const formattedRule = stripServerFields(rule);
    return {
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: {
        text: JSON.stringify(formattedRule),
        attachmentLabel: formattedRule?.name,
      },
      origin: rule.id,
      attachmentDescription: formattedRule?.name,
      attachmentPrompt: RULE_EXPLORATION_ATTACHMENT_PROMPT,
    };
  }, [rule]);

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(
    ruleAttachment ?? {
      attachmentId: SECURITY_RULE_ATTACHMENT_ID,
      attachmentType: SecurityAgentBuilderAttachments.rule,
      attachmentData: { text: '{}', attachmentLabel: '' },
    }
  );

  // RuleSnoozeModal expects the alerting Rule shape; snooze settings + id/name are enough.
  const snoozeModalRule = useMemo(() => {
    if (!snoozeSettings) {
      return null;
    }
    return {
      id: ruleId,
      name: snoozeSettings.name ?? rule?.name ?? '',
      muteAll: snoozeSettings.muteAll,
      isSnoozedUntil: snoozeSettings.isSnoozedUntil,
      snoozeSchedule: snoozeSettings.snoozeSchedule,
      activeSnoozes: snoozeSettings.activeSnoozes,
    } as Rule;
  }, [rule?.name, ruleId, snoozeSettings]);

  const menu = useMemo<AppHeaderMenu>(() => {
    const items: NonNullable<AppHeaderMenu['items']> = [];

    // Visible HeaderLinks (left of kebab) — match Figma: History, Add to chat.
    items.push({
      id: 'ruleChangesHistory',
      label: ruleI18n.RULE_CHANGES_HISTORY,
      iconType: 'clock',
      testId: 'rules-details-history',
      disableButton: !isRuleChangesHistoryEnabled,
      run: () => {
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.rules,
          path: getRuleChangesHistoryUrl(ruleId),
        });
      },
    });

    items.push({
      id: 'addToChat',
      label: ADD_TO_CHAT,
      iconType: 'editorComment',
      testId: 'ruleDetailsAppHeaderAddToChat',
      disableButton: !isAgentChatExperienceEnabled || rule == null,
      run: () => {
        aiRuleCreation.releaseBind();
        openAgentBuilderFlyout();
      },
    });

    // Kebab overflow
    items.push(
      {
        id: 'refresh',
        label: REFRESH_STATUS,
        iconType: 'refresh',
        overflow: true,
        disableButton: !isExistingRule,
        testId: 'ruleLastExecutionStatusRefreshButton',
        run: () => {
          refreshRule();
        },
      },
      {
        id: 'setSnooze',
        label: SET_SNOOZE,
        iconType: 'bell',
        overflow: true,
        disableButton: !isExistingRule || !canEditRules || !!snoozeSettingsError || !snoozeSettings,
        testId: 'ruleDetailsAppHeaderSetSnooze',
        run: () => {
          openSnoozeModal();
        },
      }
    );

    if (rule != null) {
      const canDuplicate = canEditRuleWithActions(rule, hasActionsPrivileges);
      items.push(
        {
          id: 'duplicate',
          label: ruleI18n.DUPLICATE_RULE,
          iconType: 'copy',
          overflow: true,
          disableButton: !isExistingRule || !canDuplicate || !canEditRules,
          testId: 'rules-details-duplicate-rule',
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
        },
        {
          id: 'export',
          label: ruleI18n.EXPORT_RULE,
          iconType: 'upload',
          overflow: true,
          disableButton: !isExistingRule || !canReadRules,
          testId: 'rules-details-export-rule',
          run: async () => {
            startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
            const response = await bulkExport({ ids: [rule.id] });
            if (response) {
              await downloadExportedRules(response);
            }
          },
        },
        {
          id: 'manualRun',
          label: ruleI18n.MANUAL_RULE_RUN,
          iconType: 'play',
          overflow: true,
          disableButton: !isExistingRule || !canManualRunRules || !rule.enabled,
          tooltipContent: !canManualRunRules
            ? ruleI18n.MANUAL_RULE_RUN_PERMISSIONS_TOOLTIP
            : !rule.enabled
            ? ruleI18n.MANUAL_RULE_RUN_TOOLTIP
            : undefined,
          testId: 'rules-details-manual-rule-run',
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
        }
      );

      if (isCustomizedPrebuiltRule(rule)) {
        items.push({
          id: 'revert',
          label: ruleI18n.REVERT_RULE,
          iconType: 'refreshTime',
          overflow: true,
          disableButton: !isExistingRule || !canEditRules || !doesBaseVersionExist,
          tooltipContent: !doesBaseVersionExist ? ruleI18n.REVERT_RULE_TOOLTIP_CONTENT : undefined,
          tooltipTitle: !doesBaseVersionExist ? ruleI18n.REVERT_RULE_TOOLTIP_TITLE : undefined,
          testId: 'rules-details-revert-rule',
          run: () => {
            openCustomizationsRevertFlyout();
          },
        });
      }

      items.push({
        id: 'delete',
        label: ruleI18n.DELETE_RULE,
        iconType: 'trash',
        overflow: true,
        disableButton: !isExistingRule || !canEditRules,
        testId: 'rules-details-delete-rule',
        run: async () => {
          if ((await confirmDeletion()) === false) {
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

    const editRuleHref = getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getEditRuleUrl(ruleId),
    });

    const primaryActionItem: AppHeaderMenu['primaryActionItem'] = {
      id: 'editRule',
      label: ruleI18n.EDIT_RULE_SETTINGS,
      iconType: 'controls',
      href: editRuleHref,
      disableButton:
        !isExistingRule ||
        !isRuleEditButtonEnabled ||
        (rule != null && isMlRule(rule.type) && !hasMlPermissions),
      testId: 'editRuleSettingsLink',
      run: () => {
        navigateToApp(APP_UI_ID, {
          deepLinkId: SecurityPageName.rules,
          path: getEditRuleUrl(ruleId),
        });
      },
    };

    return { items, primaryActionItem };
  }, [
    aiRuleCreation,
    bulkExport,
    canEditExceptions,
    canEditRules,
    canManualRunRules,
    canReadRules,
    confirmDeletion,
    doesBaseVersionExist,
    downloadExportedRules,
    executeBulkAction,
    getUrlForApp,
    hasActionsPrivileges,
    hasMlPermissions,
    isAgentChatExperienceEnabled,
    isExistingRule,
    isRuleChangesHistoryEnabled,
    isRuleEditButtonEnabled,
    navigateToApp,
    openAgentBuilderFlyout,
    openCustomizationsRevertFlyout,
    openSnoozeModal,
    refreshRule,
    rule,
    ruleId,
    scheduleRuleRun,
    showBulkDuplicateExceptionsConfirmation,
    showManualRuleRunConfirmation,
    snoozeSettings,
    snoozeSettingsError,
    startTransaction,
    telemetry,
  ]);

  return (
    <>
      <AppHeader
        back={{
          href: rulesHref,
          label: BACK_TO_RULES,
          onClick: (event) => {
            event.preventDefault();
            navigateToApp(APP_UI_ID, {
              deepLinkId: SecurityPageName.rules,
              path: getRulesUrl(),
            });
          },
        }}
        title={rule?.name ?? (ruleLoading ? '…' : '')}
        badges={badges}
        metadata={metadata}
        tabs={tabs}
        menu={menu}
        docLink={docLinks.links.securitySolution.manageDetectionRules}
        spacing="bleed"
      />
      {isSnoozeModalOpen && snoozeModalRule != null && (
        <RuleSnoozeModal
          rule={snoozeModalRule}
          onClose={closeSnoozeModal}
          onLoading={noop}
          onRuleChanged={invalidateFetchRuleSnoozeSettings}
        />
      )}
    </>
  );
};
