/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkExportMutation } from '../../api/hooks/use_bulk_export_mutation';
import { useShowBulkErrorToast } from './use_show_bulk_error_toast';
import type { QueryOrIds } from '../../api/api';
import { useGuessRuleIdsForBulkAction } from './use_guess_rule_ids_for_bulk_action';

export function useBulkExport() {
  const { mutateAsync } = useBulkExportMutation();
  const showBulkErrorToast = useShowBulkErrorToast();
  const guessRuleIdsForBulkAction = useGuessRuleIdsForBulkAction();
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const bulkExport = useCallback(
    async (queryOrIds: QueryOrIds) => {
      try {
        setLoadingRules?.({
          ids: queryOrIds.ids ?? guessRuleIdsForBulkAction(BulkActionTypeEnum.export),
          action: BulkActionTypeEnum.export,
        });
        return await mutateAsync(queryOrIds);
      } catch (error) {
        showBulkErrorToast({ actionType: BulkActionTypeEnum.export, error });
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [guessRuleIdsForBulkAction, setLoadingRules, mutateAsync, showBulkErrorToast]
  );

  return { bulkExport };
}
