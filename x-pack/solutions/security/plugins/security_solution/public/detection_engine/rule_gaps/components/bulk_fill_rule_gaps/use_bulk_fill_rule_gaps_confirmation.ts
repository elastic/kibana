/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useScheduleBulkActionConfirmation } from '../../../common/components/schedule_bulk_action_modal/use_schedule_bulk_action_confirmation';

/**
 * Hook that controls the schedule rule gap fills confirmation modal window and its content
``
 */
export const useBulkFillRuleGapsConfirmation = () => {
  const {
    isScheduleBulkActionConfirmationVisible,
    showScheduleBulkActionConfirmation,
    cancelScheduleBulkAction,
    confirmScheduleBulkAction,
  } = useScheduleBulkActionConfirmation();

  return {
    isBulkFillRuleGapsConfirmationVisible: isScheduleBulkActionConfirmationVisible,
    showBulkFillRuleGapsConfirmation: showScheduleBulkActionConfirmation,
    cancelBulkFillRuleGaps: cancelScheduleBulkAction,
    confirmBulkFillRuleGaps: confirmScheduleBulkAction,
  };
};
