/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { gapStatus } from '@kbn/alerting-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useFillGapMutation } from '../../api/hooks/use_fill_gap';
import * as i18n from './translations';
import type { Gap } from '../../types';
import { ManualRuleRunEventTypes } from '../../../../common/lib/telemetry';
import { useKibana } from '../../../../common/lib/kibana';
export const FillGap = ({
  isRuleEnabled,
  ruleId,
  gap,
}: {
  isRuleEnabled: boolean;
  ruleId: string;
  gap: Gap;
}) => {
  const { addSuccess, addError } = useAppToasts();
  const { telemetry } = useKibana().services;
  const isGapFillAvailable = gap.status !== gapStatus.FILLED && gap.unfilled_intervals.length !== 0;

  const hasRemainingGaps =
    isGapFillAvailable && (gap.in_progress_intervals.length > 0 || gap.filled_intervals.length > 0);
  const fillGapMutation = useFillGapMutation({
    onSuccess: () => {
      telemetry.reportEvent(
        hasRemainingGaps
          ? ManualRuleRunEventTypes.FillRemainingGap
          : ManualRuleRunEventTypes.FillGap,
        {
          rangeInMs: gap.total_gap_duration_ms,
        }
      );
      addSuccess(i18n.GAP_FILL_REQUEST_SUCCESS_MESSAGE, {
        toastMessage: i18n.GAP_FILL_REQUEST_SUCCESS_MESSAGE_TOOLTIP,
      });
    },
    onError: (error) => {
      addError(error, {
        title: i18n.GAP_FILL_REQUEST_ERROR_MESSAGE,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });

  if (!isGapFillAvailable) {
    return null;
  }

  const title = hasRemainingGaps
    ? i18n.GAPS_TABLE_FILL_REMAINING_GAP_BUTTON_LABEL
    : i18n.GAPS_TABLE_FILL_GAP_BUTTON_LABEL;

  return (
    <>
      <EuiToolTip
        position="top"
        content={isRuleEnabled ? '' : i18n.GAP_FILL_DISABLED_MESSAGE}
        display="block"
        data-test-subj="rule-gaps-fill-gap-tooltip"
      >
        <EuiButtonEmpty
          isLoading={fillGapMutation.isLoading}
          isDisabled={fillGapMutation.isLoading || !isRuleEnabled}
          size="s"
          color="primary"
          data-test-subj="rule-gaps-fill-gap-button"
          onClick={() =>
            fillGapMutation.mutate({
              ruleId,
              gapId: gap._id,
            })
          }
        >
          {title}
        </EuiButtonEmpty>
      </EuiToolTip>
    </>
  );
};
