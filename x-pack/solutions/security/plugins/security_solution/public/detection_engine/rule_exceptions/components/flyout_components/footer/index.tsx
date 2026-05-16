/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  useEuiTheme,
} from '@elastic/eui';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import * as i18n from './translations';

export interface ExceptionFlyoutFooterProps {
  isEdit?: boolean;
  listType: ExceptionListTypeEnum;
  isSubmitButtonDisabled: boolean;
  cancelButtonDataTestSubjId: string;
  submitButtonDataTestSubjId: string;
  handleOnSubmit: () => Promise<void> | undefined;
  handleCloseFlyout: () => void;
}

export const ExceptionFlyoutFooter = memo(function ExceptionFlyoutFooter({
  isEdit = false,
  listType,
  isSubmitButtonDisabled,
  cancelButtonDataTestSubjId,
  submitButtonDataTestSubjId,
  handleOnSubmit,
  handleCloseFlyout,
}: ExceptionFlyoutFooterProps) {
  const addButtonMessage = useMemo(() => {
    return listType === ExceptionListTypeEnum.ENDPOINT
      ? i18n.ADD_ENDPOINT_EXCEPTION
      : i18n.CREATE_RULE_EXCEPTION;
  }, [listType]);

  const editButtonMessage = useMemo(() => {
    return listType === ExceptionListTypeEnum.ENDPOINT
      ? i18n.EDIT_ENDPOINT_EXCEPTION_TITLE
      : i18n.EDIT_EXCEPTION_TITLE;
  }, [listType]);

  const submitButtonMessage = isEdit ? editButtonMessage : addButtonMessage;
  const { euiTheme } = useEuiTheme();
  const flyoutFooterGroupStyles = css`
    padding: ${euiTheme.size.s};
  `;

  return (
    <EuiFlyoutFooter>
      <EuiFlexGroup css={flyoutFooterGroupStyles} justifyContent="spaceBetween">
        <EuiButtonEmpty data-test-subj={cancelButtonDataTestSubjId} onClick={handleCloseFlyout}>
          {i18n.CANCEL}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj={submitButtonDataTestSubjId}
          onClick={handleOnSubmit}
          isDisabled={isSubmitButtonDisabled}
          fill
        >
          {submitButtonMessage}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );
});
