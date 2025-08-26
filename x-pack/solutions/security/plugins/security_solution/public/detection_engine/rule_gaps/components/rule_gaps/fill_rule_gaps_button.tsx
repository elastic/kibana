/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { Toast } from '@kbn/core/public';
import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from './translations';
import { useBulkFillRuleGapsConfirmation } from '../bulk_fill_rule_gaps/use_bulk_fill_rule_gaps_confirmation';
import { BulkFillRuleGapsModal } from '../bulk_fill_rule_gaps';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import type { BulkActionsDryRunErrCode } from '../../../../../common/api/detection_engine/rule_management';
import {
  BulkActionsDryRunErrCodeEnum,
  BulkActionTypeEnum,
} from '../../../../../common/api/detection_engine/rule_management';
import { useBulkActionsDryRun } from '../../../rule_management_ui/components/rules_table/bulk_actions/use_bulk_actions_dry_run';
import { useBulkActionsConfirmation } from '../../../rule_management_ui/components/rules_table/bulk_actions/use_bulk_actions_confirmation';
import { useInvalidateFindGapsQuery } from '../../api/hooks/use_find_gaps_for_rule';
import { useInvalidateFindBackfillQuery } from '../../api/hooks/use_find_backfills_for_rules';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { BULK_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { BulkFillRuleGapsEventTypes } from '../../../../common/lib/telemetry/events/bulk_fill_rule_gaps/types';

interface BulkActionRuleErrorItemProps {
  errorCode: BulkActionsDryRunErrCode | undefined;
  message: string;
}

const ErrorMessage = ({ errorCode, message }: BulkActionRuleErrorItemProps) => {
  switch (errorCode) {
    case BulkActionsDryRunErrCodeEnum.RULE_FILL_GAPS_DISABLED_RULE:
      return <EuiText>{i18n.GAPS_FILL_ALL_GAPS_ERROR_DISABLED_RULE_MESSAGE}</EuiText>;
    default:
      return <EuiText>{i18n.GAPS_FILL_ALL_GAPS_UNKNOWN_ERROR_MESSAGE(message)}</EuiText>;
  }
};

interface Props {
  ruleId: string;
}

export const FillRuleGapsButton = ({ ruleId }: Props) => {
  const {
    isBulkFillRuleGapsConfirmationVisible,
    showBulkFillRuleGapsConfirmation,
    cancelBulkFillRuleGaps,
    confirmBulkFillRuleGaps,
  } = useBulkFillRuleGapsConfirmation();
  const { executeBulkAction } = useExecuteBulkAction();
  const { isBulkActionsDryRunLoading, executeBulkActionsDryRun } = useBulkActionsDryRun();
  const {
    bulkActionsDryRunResult,
    bulkAction,
    isBulkActionConfirmationVisible,
    showBulkActionConfirmation,
    cancelBulkActionConfirmation,
  } = useBulkActionsConfirmation();

  const [isBulkActionExecuteLoading, setIsBulkActionExecuteLoading] = useState(false);

  const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
  const invalidateFindBackfillsQuery = useInvalidateFindBackfillQuery();
  const toasts = useAppToasts();
  const { services: startServices } = useKibana();
  const { startTransaction } = useStartTransaction();

  const confirmModalTitleId = useGeneratedHtmlId();

  const onFillGapsClick = useCallback(async () => {
    if (isBulkActionsDryRunLoading || isBulkActionExecuteLoading) {
      return;
    }

    let longTimeWarningToast: Toast;
    let isBulkFillGapsFinished = false;

    startTransaction({ name: BULK_RULE_ACTIONS.FILL_GAPS });

    setIsBulkActionExecuteLoading(true);

    const dryRunResult = await executeBulkActionsDryRun({
      type: BulkActionTypeEnum.fill_gaps,
      ids: [ruleId],
      fillGapsPayload: {
        start_date: new Date(Date.now() - 1000).toISOString(),
        end_date: new Date().toISOString(),
      },
    });

    setIsBulkActionExecuteLoading(false);

    const hasActionBeenConfirmed = await showBulkActionConfirmation(
      dryRunResult,
      BulkActionTypeEnum.fill_gaps
    );
    if (hasActionBeenConfirmed === false) {
      return;
    }
    const modalBulkFillRuleGapsConfirmationResult = await showBulkFillRuleGapsConfirmation();
    startServices.telemetry.reportEvent(BulkFillRuleGapsEventTypes.BulkFillRuleGapsOpenModal, {
      type: 'single',
    });
    if (modalBulkFillRuleGapsConfirmationResult === null) {
      return;
    }

    setIsBulkActionExecuteLoading(true);
    const hideWarningToast = () => {
      if (longTimeWarningToast) {
        toasts.api.remove(longTimeWarningToast);
      }
    };

    // show warning toast only if bulk fill gaps action exceeds 5s
    // if bulkAction already finished, we won't show toast at all (hence flag "isBulkFillGapsFinished")
    setTimeout(() => {
      if (isBulkFillGapsFinished) {
        return;
      }
      longTimeWarningToast = toasts.addWarning(
        {
          title: i18n.GAPS_FILL_ALL_GAPS_WARNING_TOAST_TITLE,
          text: toMountPoint(
            <>
              <p>{i18n.GAPS_FILL_ALL_GAPS_WARNING_TOAST_DESCRIPTION}</p>
              <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton color="warning" size="s" onClick={hideWarningToast}>
                    {i18n.GAPS_FILL_ALL_GAPS_WARNING_TOAST_NOTIFY}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </>,
            startServices
          ),
          iconType: undefined,
        },
        { toastLifeTimeMs: 10 * 60 * 1000 }
      );
    }, 5 * 1000);

    const response = await executeBulkAction({
      type: BulkActionTypeEnum.fill_gaps,
      ids: [ruleId],
      fillGapsPayload: {
        start_date: modalBulkFillRuleGapsConfirmationResult.startDate.toISOString(),
        end_date: modalBulkFillRuleGapsConfirmationResult.endDate.toISOString(),
      },
    });

    isBulkFillGapsFinished = true;
    hideWarningToast();

    setIsBulkActionExecuteLoading(false);

    invalidateFindGapsQuery();
    invalidateFindBackfillsQuery();

    startServices.telemetry.reportEvent(BulkFillRuleGapsEventTypes.BulkFillRuleGapsExecute, {
      rangeInMs: modalBulkFillRuleGapsConfirmationResult.endDate.diff(
        modalBulkFillRuleGapsConfirmationResult.startDate
      ),
      status: response !== undefined ? 'success' : 'error',
      rulesCount: 1,
    });
  }, [
    isBulkActionsDryRunLoading,
    isBulkActionExecuteLoading,
    startServices,
    showBulkFillRuleGapsConfirmation,
    showBulkActionConfirmation,
    executeBulkAction,
    executeBulkActionsDryRun,
    invalidateFindBackfillsQuery,
    invalidateFindGapsQuery,
    ruleId,
    startTransaction,
    toasts,
  ]);

  return (
    <>
      {isBulkFillRuleGapsConfirmationVisible && (
        <BulkFillRuleGapsModal
          onCancel={cancelBulkFillRuleGaps}
          onConfirm={confirmBulkFillRuleGaps}
          rulesCount={1}
        />
      )}
      {isBulkActionConfirmationVisible && bulkAction && (
        <EuiConfirmModal
          aria-labelledby={confirmModalTitleId}
          title={i18n.GAPS_FILL_ALL_GAPS_DRY_RUN_MODAL_HEADING}
          titleProps={{ id: confirmModalTitleId }}
          onCancel={cancelBulkActionConfirmation}
          onConfirm={cancelBulkActionConfirmation}
          confirmButtonText={i18n.GAPS_FILL_ALL_GAPS_DRY_RUN_FAILED_MODAL_CLOSE_BUTTON_LABEL}
          defaultFocusedButton="confirm"
          data-test-subj="bulkActionRejectModal"
        >
          <ErrorMessage
            errorCode={bulkActionsDryRunResult?.ruleErrors[0].errorCode}
            message={bulkActionsDryRunResult?.ruleErrors[0].message ?? ''}
          />
        </EuiConfirmModal>
      )}
      <EuiButton
        data-test-subj="fill-rule-gaps-button"
        color="primary"
        onClick={onFillGapsClick}
        aria-label={i18n.GAPS_FILL_ALL_GAPS_BUTTON_LABEL}
        fill={true}
        isLoading={isBulkActionsDryRunLoading || isBulkActionExecuteLoading}
      >
        {i18n.GAPS_FILL_ALL_GAPS_BUTTON_LABEL}
      </EuiButton>
    </>
  );
};
