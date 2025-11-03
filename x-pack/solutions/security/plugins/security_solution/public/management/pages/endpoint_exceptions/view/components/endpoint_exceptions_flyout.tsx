/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ARTIFACT_FLYOUT_LABELS } from '../../../../components/artifact_list_page/components/artifact_flyout';
import type { AddExceptionFlyoutProps } from '../../../../../detection_engine/rule_exceptions/components/add_exception_flyout';
import { ArtifactConfirmModal } from '../../../../components/artifact_list_page/components/artifact_confirm_modal';
import { useCreateArtifact } from '../../../../hooks/artifacts';
import { useHttp, useToasts } from '../../../../../common/lib/kibana';
import type {
  ArtifactConfirmModalLabelProps,
  ArtifactFormComponentOnChangeCallbackProps,
} from '../../../../components/artifact_list_page';
import { defaultEndpointExceptionItems } from '../../../../../detection_engine/rule_exceptions/utils/helpers';
import { EndpointExceptionsForm } from './endpoint_exceptions_form';
import { EndpointExceptionsApiClient } from '../../service/api_client';
import { ENDPOINT_EXCEPTIONS_PAGE_LABELS, getCreationErrorMessage } from '../../translations';

type EndpointExceptionsFlyoutProps = Pick<
  AddExceptionFlyoutProps,
  'onCancel' | 'onConfirm' | 'alertData' | 'isAlertDataLoading'
>;

export const EndpointExceptionsFlyout: React.FC<EndpointExceptionsFlyoutProps> = ({
  onCancel,
  onConfirm,
  alertData,
  isAlertDataLoading,
}) => {
  const endpointExceptionsFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'endpointExceptionsCreateFlyoutTitle',
  });
  const { euiTheme } = useEuiTheme();
  const toasts = useToasts();
  const http = useHttp();

  const { isLoading: isSubmittingData, mutateAsync: submitData } = useCreateArtifact(
    EndpointExceptionsApiClient.getInstance(http)
  );

  const [exception, setException] = useState<CreateExceptionListItemSchema>();
  const [isFormValid, setIsFormValid] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmModalLabels, setConfirmModalLabels] = useState<
    ArtifactConfirmModalLabelProps | undefined
  >();

  const handleCloseFlyout = useCallback((): void => {
    onCancel(false);
  }, [onCancel]);

  useEffect(() => {
    if (!isAlertDataLoading && alertData) {
      setException(
        defaultEndpointExceptionItems(
          ENDPOINT_ARTIFACT_LISTS.endpointExceptions.id,
          '',
          alertData
        )[0] as CreateExceptionListItemSchema
      );
    }
  }, [alertData, isAlertDataLoading]);

  const handleOnChange = useCallback((formState?: ArtifactFormComponentOnChangeCallbackProps) => {
    if (!formState) return;
    setIsFormValid(formState.isValid);
    setException(formState.item);
    setConfirmModalLabels(formState.confirmModalLabels);
  }, []);

  const submitException = useCallback(async (): Promise<void> => {
    submitData(exception as CreateExceptionListItemSchema, {
      onSuccess: (result) => {
        toasts.addSuccess(ENDPOINT_EXCEPTIONS_PAGE_LABELS.flyoutCreateSubmitSuccess(result));
        onConfirm(true, false, false); // todo closing alerts
      },
      onError: (error) => {
        toasts.addError(error, getCreationErrorMessage(error));
      },
    });
  }, [exception, onConfirm, submitData, toasts]);

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
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id={endpointExceptionsFlyoutTitleId}>
            {ENDPOINT_EXCEPTIONS_PAGE_LABELS.flyoutCreateTitle}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {isFormValid}

      <EuiFlyoutBody>
        {exception && (
          <EndpointExceptionsForm
            allowSelectOs={!alertData}
            error={undefined}
            disabled={false}
            item={exception}
            mode="create"
            onChange={handleOnChange}
          />
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
            disabled={!isFormValid || isSubmittingData || isAlertDataLoading}
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
          data-test-subj="artifactConfirmModal"
        />
      )}
    </EuiFlyout>
  );
};
