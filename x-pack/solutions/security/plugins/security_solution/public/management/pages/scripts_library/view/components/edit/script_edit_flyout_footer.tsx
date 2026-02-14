/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFlyoutFooter,
} from '@elastic/eui';
import React, { memo, useCallback } from 'react';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';
import { SCRIPT_LIBRARY_LABELS as flyoutHeaderLabels } from '../../../translations';

interface EndpointScriptEditFlyoutFooterProps {
  isDisabled?: boolean;
  isLoading: boolean;
  show: ScriptsLibraryUrlParams['show'];
  onClose: () => void;
  onSubmit: ({
    type,
  }: {
    type: Extract<ScriptsLibraryUrlParams['show'], 'create' | 'edit'>;
  }) => void;
  'data-test-subj'?: string;
}
export const EndpointScriptEditFlyoutFooter = memo<EndpointScriptEditFlyoutFooterProps>(
  ({ isDisabled = false, isLoading, show, onClose, onSubmit, 'data-test-subj': dataTestSubj }) => {
    const isEditFlow = show === 'edit';

    const onClickSubmit = useCallback(() => {
      onSubmit({ type: isEditFlow ? 'edit' : 'create' });
    }, [isEditFlow, onSubmit]);

    return (
      <EuiFlyoutFooter className="eui-textRight" data-test-subj={dataTestSubj}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={`${dataTestSubj}-cancelButton`}
              onClick={onClose}
              disabled={isLoading}
            >
              {flyoutHeaderLabels.flyout.footer.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={`${dataTestSubj}-saveButton`}
              fill
              disabled={isDisabled || isLoading}
              onClick={onClickSubmit}
              isLoading={isLoading}
            >
              {isEditFlow
                ? flyoutHeaderLabels.flyout.footer.edit.saveButtonLabel
                : flyoutHeaderLabels.flyout.footer.upload.uploadButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    );
  }
);

EndpointScriptEditFlyoutFooter.displayName = 'EndpointScriptEditFlyoutFooter';
