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
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import type { ScriptsLibraryUrlParams } from '../scripts_library_url_params';
import { SCRIPT_LIBRARY_LABELS as flyoutHeaderLabels } from '../../../translations';

interface EndpointScriptEditFlyoutFooterProps {
  isDisabled?: boolean;
  isLoading: boolean;
  show: Extract<ScriptsLibraryUrlParams['show'], 'create' | 'edit'>;
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
    const getTestId = useTestIdGenerator(dataTestSubj);

    const onClickSubmit = useCallback(() => {
      onSubmit({ type: show });
    }, [show, onSubmit]);

    return (
      <EuiFlyoutFooter className="eui-textRight" data-test-subj={getTestId()}>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj={getTestId('cancel-button')}
              onClick={onClose}
              disabled={isLoading}
            >
              {flyoutHeaderLabels.flyout.footer.cancelButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={getTestId('save-button')}
              fill
              disabled={isDisabled || isLoading}
              onClick={onClickSubmit}
              isLoading={isLoading}
            >
              {show === 'edit'
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
