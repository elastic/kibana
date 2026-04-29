/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type {
  CreateExceptionListItemSchema,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { useCreateOrUpdateArtifact } from '../../../../components/artifact_list_page/hooks/use_artifact_update_or_create';
import {
  addGlobalPolicyTag,
  removeGlobalPolicyTag,
} from '../../../../../../common/endpoint/service/artifacts/utils';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { prepareToCloseAlerts } from '../../../../../detection_engine/rule_exceptions/components/add_exception_flyout/helpers';
import { useCloseAlertsFromExceptions } from '../../../../../detection_engine/rule_exceptions/logic/use_close_alerts';
import { ExceptionItemsFlyoutAlertsActions } from '../../../../../detection_engine/rule_exceptions/components/flyout_components/alerts_actions';
import { ARTIFACT_FLYOUT_LABELS } from '../../../../components/artifact_list_page/components/artifact_flyout';
import type { AddExceptionFlyoutProps } from '../../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { ArtifactConfirmModal } from '../../../../components/artifact_list_page/components/artifact_confirm_modal';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import type {
  ArtifactConfirmModalLabelProps,
  ArtifactFormComponentOnChangeCallbackProps,
} from '../../../../components/artifact_list_page';
import {
  defaultEndpointExceptionItems,
  retrieveAlertOsTypes,
} from '../../../../../detection_engine/rule_exceptions/utils/helpers';
import { EndpointExceptionsForm } from './endpoint_exceptions_form';
import { EndpointExceptionsApiClient } from '../../service/api_client';
import { ENDPOINT_EXCEPTIONS_PAGE_LABELS, getCreationErrorMessage } from '../../translations';
import { useAlertsPrivileges } from '../../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';

export type EndpointExceptionsFlyoutProps = Pick<
  AddExceptionFlyoutProps,
  'onCancel' | 'onConfirm' | 'alertData' | 'isAlertDataLoading' | 'alertStatus' | 'rules'
>;

export const EndpointExceptionsFlyout: React.FC<EndpointExceptionsFlyoutProps> = ({
  onCancel,
  onConfirm,
  alertData,
  alertStatus,
  isAlertDataLoading,
  rules,
}) => {
  const endpointExceptionsFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'endpointExceptionsCreateFlyoutTitle',
  });
  const { euiTheme } = useEuiTheme();
  const maskProps = useMemo(
    () => ({ style: `z-index: ${(euiTheme.levels.flyout as number) + 4}` }), // we need this flyout to be above the timeline flyout (which has a z-index of 1003)
    [euiTheme.levels.flyout]
  );
  const toasts = useToasts();
  const http = useHttp();
  const { isLoading: isSubmittingData, createOrUpdateArtifact } = useCreateOrUpdateArtifact(
    EndpointExceptionsApiClient.getInstance(http)
  );

  const [isClosingAlerts, closeAlerts] = useCloseAlertsFromExceptions();

  const [exception, setException] = useState<CreateExceptionListItemSchema>();
  const [additionalEntries, setAdditionalEntries] = useState<EntriesArray[]>();
  const exceptionArrayWrapper = useMemo(() => (exception ? [exception] : []), [exception]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalLabels, setConfirmModalLabels] = useState<
    ArtifactConfirmModalLabelProps | undefined
  >();
  const [closeSingleAlert, setCloseSingleAlert] = useState(false);
  const [bulkCloseAlerts, setBulkCloseAlerts] = useState(false);
  const [disableBulkClose, setDisableBulkCloseAlerts] = useState(false);
  const [bulkCloseIndex, setBulkCloseIndex] = useState<string[] | undefined>();
  const { hasAlertsUpdate } = useAlertsPrivileges();
  const { canManageGlobalArtifacts } = useUserPrivileges().endpointPrivileges;

  useEffect(() => {
    if (!isAlertDataLoading && alertData) {
      const defaultException = defaultEndpointExceptionItems(
        ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
        '',
        alertData
      )[0] as CreateExceptionListItemSchema;

      const initialException = {
        ...defaultException,

        os_types: retrieveAlertOsTypes(alertData),
        tags: canManageGlobalArtifacts
          ? addGlobalPolicyTag(defaultException.tags ?? [])
          : removeGlobalPolicyTag(defaultException.tags ?? []),
      };

      setException(initialException);
    }
  }, [alertData, canManageGlobalArtifacts, isAlertDataLoading]);

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  const handleOnChange = useCallback((formState?: ArtifactFormComponentOnChangeCallbackProps) => {
    if (!formState) return;
    setIsFormValid(formState.isValid);
    setException(formState.item);
    setAdditionalEntries(formState.additionalEntries);
    setConfirmModalLabels(formState.confirmModalLabels);
  }, []);

  const submitException = useCallback(async (): Promise<void> => {
    if (!createOrUpdateArtifact) return;

    try {
      const addedExceptions = await createOrUpdateArtifact(
        exception as CreateExceptionListItemSchema,
        additionalEntries
      );

      const { shouldCloseAlerts, alertIdToClose, ruleStaticIds } = prepareToCloseAlerts({
        alertData,
        closeSingleAlert,
        addToRules: false,
        rules,
        bulkCloseAlerts,
        selectedRulesToAddTo: [],
      });

      if (closeAlerts != null && shouldCloseAlerts && addedExceptions) {
        await closeAlerts(ruleStaticIds, addedExceptions, alertIdToClose, bulkCloseIndex);
      }

      toasts.addSuccess(
        ENDPOINT_EXCEPTIONS_PAGE_LABELS.flyoutCreateSubmitSuccess(addedExceptions[0])
      );
      onConfirm(true, closeSingleAlert, bulkCloseAlerts);
    } catch (error) {
      toasts.addError(error, getCreationErrorMessage(error));
    }
  }, [
    additionalEntries,
    alertData,
    bulkCloseAlerts,
    bulkCloseIndex,
    closeAlerts,
    closeSingleAlert,
    createOrUpdateArtifact,
    exception,
    onConfirm,
    rules,
    toasts,
  ]);

  const handleOnSubmit = useCallback(() => {
    if (confirmModalLabels) {
      setShowConfirmModal(true);
    } else {
      return submitException();
    }
  }, [confirmModalLabels, submitException]);

  return (
    <EuiFlyout
      size="l"
      onClose={handleCloseFlyout}
      aria-labelledby={endpointExceptionsFlyoutTitleId}
      data-test-subj="addEndpointExceptionFlyout"
      maskProps={maskProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={endpointExceptionsFlyoutTitleId}>
            {ENDPOINT_EXCEPTIONS_PAGE_LABELS.flyoutCreateTitle}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {exception && (
          <EndpointExceptionsForm
            allowSelectOs={!alertData}
            error={undefined}
            disabled={false}
            item={exception}
            additionalEntries={additionalEntries}
            mode="create"
            onChange={handleOnChange}
          />
        )}

        {hasAlertsUpdate && (
          <>
            <EuiHorizontalRule />

            <ExceptionItemsFlyoutAlertsActions
              exceptionListType="endpoint"
              shouldCloseSingleAlert={closeSingleAlert}
              onSingleAlertCloseCheckboxChange={setCloseSingleAlert}
              shouldBulkCloseAlert={bulkCloseAlerts}
              onBulkCloseCheckboxChange={setBulkCloseAlerts}
              disableBulkClose={disableBulkClose}
              onDisableBulkClose={setDisableBulkCloseAlerts}
              exceptionListItems={exceptionArrayWrapper}
              onUpdateBulkCloseIndex={setBulkCloseIndex}
              alertData={alertData}
              isAlertDataLoading={isAlertDataLoading ?? false}
              alertStatus={alertStatus}
            />
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          css={css`
            padding: ${euiTheme.size.s};
          `}
        >
          <EuiButtonEmpty
            data-test-subj="add-endpoint-exception-cancel-button"
            onClick={handleCloseFlyout}
          >
            {ARTIFACT_FLYOUT_LABELS.flyoutCancelButtonLabel}
          </EuiButtonEmpty>

          <EuiButton
            data-test-subj="add-endpoint-exception-confirm-button"
            fill
            disabled={isAlertDataLoading || !isFormValid || isSubmittingData || isClosingAlerts}
            onClick={handleOnSubmit}
          >
            {ENDPOINT_EXCEPTIONS_PAGE_LABELS.flyoutCreateSubmitButtonLabel}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>

      {showConfirmModal && confirmModalLabels && (
        <ArtifactConfirmModal
          {...confirmModalLabels}
          onSuccess={submitException}
          onCancel={() => setShowConfirmModal(false)}
          data-test-subj="endpointExceptionConfirmModal"
        />
      )}
    </EuiFlyout>
  );
};
EndpointExceptionsFlyout.displayName = 'EndpointExceptionsFlyout';
