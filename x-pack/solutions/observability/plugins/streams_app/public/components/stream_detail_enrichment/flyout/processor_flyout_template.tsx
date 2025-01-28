/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import {
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDiscardConfirm } from '../../../hooks/use_discard_confirm';

interface ProcessorFlyoutTemplateProps {
  banner?: React.ReactNode;
  confirmButton?: React.ReactNode;
  onClose: () => void;
  shouldConfirm?: boolean;
  title: string;
}

export function ProcessorFlyoutTemplate({
  banner,
  children,
  confirmButton,
  onClose,
  shouldConfirm = false,
  title,
}: PropsWithChildren<ProcessorFlyoutTemplateProps>) {
  const handleClose = useDiscardConfirm(onClose);

  const closeHandler = shouldConfirm ? handleClose : onClose;

  return (
    <EuiFlyoutResizable onClose={closeHandler}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody banner={banner}>{children}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiButtonEmpty
            data-test-subj="streamsAppProcessorFlyoutTemplateCancelButton"
            iconType="cross"
            onClick={closeHandler}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processorFlyout.cancel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButtonEmpty>
          {confirmButton}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
