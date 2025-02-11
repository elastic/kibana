/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultItemAction } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import React from 'react';
import { DuplicateOptions } from '../../../../../common/detection_engine/rule_management/constants';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useKibana } from '../../../../common/lib/kibana';
import { canEditRuleWithActions } from '../../../../common/utils/privileges';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../rule_management/logic';
import { useBulkExport } from '../../../rule_management/logic/bulk_actions/use_bulk_export';
import {
  goToRuleEditPage,
  useExecuteBulkAction,
} from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useDownloadExportedRules } from '../../../rule_management/logic/bulk_actions/use_download_exported_rules';
import { useHasActionsPrivileges } from './use_has_actions_privileges';
import type { TimeRange } from '../../../rule_gaps/types';
import { useScheduleRuleRun } from '../../../rule_gaps/logic/use_schedule_rule_run';
import { usePrebuiltRulesCustomizationStatus } from '../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';

export const useRulesTableActions = ({
  showExceptionsDuplicateConfirmation,
  showManualRuleRunConfirmation,
  confirmDeletion,
}: {
  showExceptionsDuplicateConfirmation: () => Promise<string | null>;
  showManualRuleRunConfirmation: () => Promise<TimeRange | null>;
  confirmDeletion: () => Promise<boolean>;
}): Array<DefaultItemAction<Rule>> => {
  const {
    application: { navigateToApp },
    telemetry,
  } = useKibana().services;
  const hasActionsPrivileges = useHasActionsPrivileges();
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction();
  const { bulkExport } = useBulkExport();
  const downloadExportedRules = useDownloadExportedRules();
  const { scheduleRuleRun } = useScheduleRuleRun();
  const { isRulesCustomizationEnabled } = usePrebuiltRulesCustomizationStatus();

  return [
    {
      type: 'icon',
      'data-test-subj': 'editRuleAction',
      description: i18n.EDIT_RULE_SETTINGS,
      name: !hasActionsPrivileges ? (
        <EuiToolTip position="left" content={i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES}>
          <>{i18n.EDIT_RULE_SETTINGS}</>
        </EuiToolTip>
      ) : (
        i18n.EDIT_RULE_SETTINGS
      ),
      icon: 'controlsHorizontal',
      onClick: (rule: Rule) => goToRuleEditPage(rule.id, navigateToApp),
      enabled: (rule: Rule) => canEditRuleWithActions(rule, hasActionsPrivileges),
    },
    {
      type: 'icon',
      'data-test-subj': 'duplicateRuleAction',
      description: i18n.DUPLICATE_RULE,
      icon: 'copy',
      name: !hasActionsPrivileges ? (
        <EuiToolTip position="left" content={i18n.LACK_OF_KIBANA_ACTIONS_FEATURE_PRIVILEGES}>
          <>{i18n.DUPLICATE_RULE}</>
        </EuiToolTip>
      ) : (
        i18n.DUPLICATE_RULE
      ),
      enabled: (rule: Rule) => canEditRuleWithActions(rule, hasActionsPrivileges),
      // TODO extract those handlers to hooks, like useDuplicateRule
      onClick: async (rule: Rule) => {
        startTransaction({ name: SINGLE_RULE_ACTIONS.DUPLICATE });
        const modalDuplicationConfirmationResult = await showExceptionsDuplicateConfirmation();
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
      type: 'icon',
      'data-test-subj': 'exportRuleAction',
      description: i18n.EXPORT_RULE,
      icon: 'exportAction',
      name: i18n.EXPORT_RULE,
      onClick: async (rule: Rule) => {
        startTransaction({ name: SINGLE_RULE_ACTIONS.EXPORT });
        const response = await bulkExport({ ids: [rule.id] });
        if (response) {
          await downloadExportedRules(response);
        }
      },
      enabled: (rule: Rule) => isRulesCustomizationEnabled || !rule.immutable,
    },
    {
      type: 'icon',
      'data-test-subj': 'manualRuleRunAction',
      description: (rule) => (!rule.enabled ? i18n.MANUAL_RULE_RUN_TOOLTIP : i18n.MANUAL_RULE_RUN),
      icon: 'play',
      name: i18n.MANUAL_RULE_RUN,
      onClick: async (rule: Rule) => {
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
      enabled: (rule: Rule) => rule.enabled,
    },
    {
      type: 'icon',
      'data-test-subj': 'deleteRuleAction',
      description: i18n.DELETE_RULE,
      icon: 'trash',
      name: i18n.DELETE_RULE,
      onClick: async (rule: Rule) => {
        if ((await confirmDeletion()) === false) {
          // User has canceled deletion
          return;
        }

        startTransaction({ name: SINGLE_RULE_ACTIONS.DELETE });
        await executeBulkAction({
          type: BulkActionTypeEnum.delete,
          ids: [rule.id],
        });
      },
    },
  ];
};
