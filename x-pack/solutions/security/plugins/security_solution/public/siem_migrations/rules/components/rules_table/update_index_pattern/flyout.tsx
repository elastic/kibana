/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import type { EuiFlyoutSize } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { FormHook } from '../../../../../shared_imports';
import { Form } from '../../../../../shared_imports';

import * as i18n from './translations';

interface IndexPatternPlaceholderFormWrapperProps {
  form: FormHook;
  title: string;
  banner?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (indexPattern: string) => void;
  flyoutSize?: EuiFlyoutSize;
}

export const IndexPatternPlaceholderFormWrapper: FC<IndexPatternPlaceholderFormWrapperProps> = memo(
  ({ form, title, banner, children, onClose, onSubmit, flyoutSize = 's' }) => {
    const simpleFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'IndexPatternPlaceholderForm',
    });

    const { isValid } = form;
    return (
      <EuiFlyout ownFocus onClose={onClose} aria-labelledby={simpleFlyoutTitleId} size={flyoutSize}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" data-test-subj="indexPatternPlaceholderFormTitle">
            <h2 id={simpleFlyoutTitleId}>{title}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody banner={banner}>
          <Form form={form}>{children}</Form>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                flush="left"
                data-test-subj="indexPatternPlaceholderFormCancelBtn"
                aria-label={i18n.INDEX_PATTERN_PLACEHOLDER_FORM_CANCEL}
              >
                {i18n.INDEX_PATTERN_PLACEHOLDER_FORM_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={() => onSubmit(form.getFormData().index.join(','))}
                fill
                // The `isValid` is set to `undefined` on initialization. Until value is changed we show the `Save` button as disabled.
                // Once value is updated the form will go through the validation cycle and will update `isValid` state.
                // In case form is invalid, we disable button as well.
                disabled={isValid !== true}
                data-test-subj="indexPatternPlaceholderFormSaveBtn"
              >
                {i18n.INDEX_PATTERN_PLACEHOLDER_FORM_SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

IndexPatternPlaceholderFormWrapper.displayName = 'IndexPatternPlaceholderFormWrapper';
