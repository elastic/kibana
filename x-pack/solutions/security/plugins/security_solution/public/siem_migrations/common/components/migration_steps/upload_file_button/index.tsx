/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, type EuiButtonProps, type PropsForButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DATA_INPUT_FILE_UPLOAD_BUTTON = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.dataInputFlyout.uploadButtonText',
  { defaultMessage: 'Upload' }
);

export const UploadFileButton = React.memo<PropsForButton<EuiButtonProps>>((props) => {
  return (
    <EuiButton data-test-subj="uploadFileButton" color="success" {...props}>
      {DATA_INPUT_FILE_UPLOAD_BUTTON}
    </EuiButton>
  );
});
UploadFileButton.displayName = 'UploadFileButton';
