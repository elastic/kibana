/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';

type AppMenuSwitch = NonNullable<AppMenuConfig['switch']>;
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';

export interface UseRuleEnabledSwitchParams {
  id: string;
  enabled: boolean;
  label: string;
  isDisabled?: boolean;
  tooltipContent?: string;
  startMlJobsIfNeeded?: () => Promise<void>;
  onEnabledChanged?: (enabled: boolean) => void;
}

/**
 * Builds the rule enable/disable app menu switch. Mirrors the behavior of the former `RuleSwitch`
 * (enable/disable via bulk action, starting ML jobs when enabling) while exposing it as an
 * `AppMenuSwitch` so it can live inside the shared app header menu.
 */
export const useRuleEnabledSwitch = ({
  id,
  enabled,
  label,
  isDisabled,
  tooltipContent,
  startMlJobsIfNeeded,
  onEnabledChanged,
}: UseRuleEnabledSwitchParams): AppMenuSwitch => {
  const rulesTableContext = useRulesTableContextOptional();
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction({ suppressSuccessToast: !rulesTableContext });

  const onChange = useCallback(
    async (checked: boolean) => {
      startTransaction({
        name: enabled ? SINGLE_RULE_ACTIONS.DISABLE : SINGLE_RULE_ACTIONS.ENABLE,
      });
      if (checked) {
        await startMlJobsIfNeeded?.();
      }
      const bulkActionResponse = await executeBulkAction({
        type: checked ? BulkActionTypeEnum.enable : BulkActionTypeEnum.disable,
        ids: [id],
      });
      if (bulkActionResponse?.attributes.results.updated.length) {
        onEnabledChanged?.(bulkActionResponse.attributes.results.updated[0].enabled);
      }
    },
    [enabled, executeBulkAction, id, onEnabledChanged, startMlJobsIfNeeded, startTransaction]
  );

  return {
    id: 'ruleEnabledSwitch',
    label,
    labelProps: { style: { display: 'none' } },
    checked: enabled,
    disabled: isDisabled,
    onChange,
    tooltipContent,
    'data-test-subj': 'ruleSwitch',
  };
};
