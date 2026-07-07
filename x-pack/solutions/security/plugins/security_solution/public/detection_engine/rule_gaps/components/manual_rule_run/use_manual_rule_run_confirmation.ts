/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useScheduleBulkActionConfirmation } from '../../../common/components/schedule_bulk_action_modal/use_schedule_bulk_action_confirmation';

/**
 * Hook that controls manual rule run confirmation modal window and its content
 */
export const useManualRuleRunConfirmation = () => {
  const {
    isScheduleBulkActionConfirmationVisible,
    showScheduleBulkActionConfirmation,
    cancelScheduleBulkAction,
    confirmScheduleBulkAction,
  } = useScheduleBulkActionConfirmation();

  return {
    isManualRuleRunConfirmationVisible: isScheduleBulkActionConfirmationVisible,
    showManualRuleRunConfirmation: showScheduleBulkActionConfirmation,
    cancelManualRuleRun: cancelScheduleBulkAction,
    confirmManualRuleRun: confirmScheduleBulkAction,
  };
};
