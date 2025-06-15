import React, { useCallback, useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Toast } from '@kbn/core/public';
import { EuiButton, EuiConfirmModal, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import * as i18n from './translations';
import { useManualRuleGapsFillingConfirmation } from '../manual_rule_fill_gaps/use_manual_rule_gaps_filling_confirmation';
import { ManualRuleGapsFillingModal } from '../manual_rule_fill_gaps';
import { useExecuteBulkAction } from '../../../rule_management/logic/bulk_actions/use_execute_bulk_action';
import {
    BulkActionsDryRunErrCode,
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

interface BulkActionRuleErrorItemProps {
    errorCode: BulkActionsDryRunErrCode | undefined;
    message: string;
}

const ErrorMessage = ({
    errorCode,
    message,
}: BulkActionRuleErrorItemProps) => {
    switch (errorCode) {
        case BulkActionsDryRunErrCodeEnum.RULE_FILL_GAPS_DISABLED_RULE:
            return (
                <EuiText>
                    {i18n.GAP_FILL_ALL_GAPS_ERROR_DISABLED_RULE_MESSAGE}
                </EuiText>
            );
        default:
            return (
                <EuiText>
                    {i18n.GAP_FILL_ALL_GAPS_UNKNOWN_ERROR_MESSAGE(message)}
                </EuiText>
            );
    }
};

type Props = {
    ruleId: string
}

export const FillRuleGapsButton = ({ ruleId }: Props) => {
    const {
        isManualRuleGapsFillingConfirmationVisible,
        showManualRuleGapsFillingConfirmation,
        cancelManualRuleGapsFilling,
        confirmManualRuleGapsFilling,
    } = useManualRuleGapsFillingConfirmation()
    const { executeBulkAction } = useExecuteBulkAction();
    const { isBulkActionsDryRunLoading, executeBulkActionsDryRun } = useBulkActionsDryRun();
    const {
        bulkActionsDryRunResult,
        bulkAction,
        isBulkActionConfirmationVisible,
        showBulkActionConfirmation,
        cancelBulkActionConfirmation,
    } = useBulkActionsConfirmation();

    const [isBulkActionExecuteLoading, setIsBulkActionExecuteLoading] = useState(false)

    const invalidateFindGapsQuery = useInvalidateFindGapsQuery();
    const invalidateFindBackfillsQuery = useInvalidateFindBackfillQuery();
    const toasts = useAppToasts()
    const { services: startServices } = useKibana();
    const { startTransaction } = useStartTransaction();

    const onFillGapsClick = useCallback(async () => {
        if (isBulkActionsDryRunLoading || isBulkActionExecuteLoading) {
            return
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
        const modalManualGapsFillingConfirmationResult = await showManualRuleGapsFillingConfirmation();
        // startServices.telemetry.reportEvent(ManualRuleRunEventTypes.FillGaps, {
        //   type: 'bulk',
        // });
        if (modalManualGapsFillingConfirmationResult === null) {
            return;
        }

        setIsBulkActionExecuteLoading(true)
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
                    title: i18n.BULK_FILL_RULE_GAPS_WARNING_TOAST_TITLE,
                    text: toMountPoint(
                        <>
                            <p>
                                {i18n.BULK_FILL_RULE_GAPS_WARNING_TOAST_DESCRIPTION}
                            </p>
                            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
                                <EuiFlexItem grow={false}>
                                    <EuiButton color="warning" size="s" onClick={hideWarningToast}>
                                        {i18n.BULK_FILL_RULE_GAPS_WARNING_TOAST_NOTIFY}
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

        await executeBulkAction({
            type: BulkActionTypeEnum.fill_gaps,
            ids: [ruleId],
            fillGapsPayload: {
                start_date: modalManualGapsFillingConfirmationResult.startDate.toISOString(),
                end_date: modalManualGapsFillingConfirmationResult.endDate.toISOString(),
            },
        });

        isBulkFillGapsFinished = true
        hideWarningToast();

        setIsBulkActionExecuteLoading(false)

        invalidateFindGapsQuery()
        invalidateFindBackfillsQuery()

        // startServices.telemetry.reportEvent(ManualRuleRunEventTypes.ManualRuleRunExecute, {
        //     rangeInMs: modalManualGapsFillingConfirmationResult.endDate.diff(
        //         modalManualGapsFillingConfirmationResult.startDate
        //     ),
        //     status: 'success',
        //     rulesCount: enabledIds.length,
        // });

    }, [isBulkActionsDryRunLoading, isBulkActionExecuteLoading, startServices, showManualRuleGapsFillingConfirmation, showBulkActionConfirmation])


    return (
        <>
            {isManualRuleGapsFillingConfirmationVisible && (
                <ManualRuleGapsFillingModal onCancel={cancelManualRuleGapsFilling} onConfirm={confirmManualRuleGapsFilling} rulesCount={1} />
            )}
            {isBulkActionConfirmationVisible && bulkAction && (
                <EuiConfirmModal
                    title={i18n.GAPS_FILL_ALL_GAPS_DRY_RUN_MODAL_HEADING}
                    onCancel={cancelBulkActionConfirmation}
                    onConfirm={cancelBulkActionConfirmation}
                    confirmButtonText={i18n.GAPS_FILL_ALL_GAPS_DRY_RUN_FAILED_MODAL_CLOSE_BUTTON_LABEL}
                    defaultFocusedButton="confirm"
                    data-test-subj="bulkActionRejectModal"
                >
                    <ErrorMessage errorCode={bulkActionsDryRunResult?.ruleErrors[0].errorCode} message={bulkActionsDryRunResult?.ruleErrors[0].message ?? ''} />
                </EuiConfirmModal>
            )}
            <EuiButton
                data-test-subj="fill_rule_gaps_button"
                color="primary"
                onClick={onFillGapsClick}
                aria-label={i18n.GAPS_FILL_ALL_GAPS_BUTTON_LABEL}
                fill={true}
                isLoading={isBulkActionsDryRunLoading || isBulkActionExecuteLoading}
            >
                {i18n.GAPS_FILL_ALL_GAPS_BUTTON_LABEL}
            </EuiButton>
        </>)
}