/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { type FileUploadResults, OPEN_FILE_UPLOAD_LITE_TRIGGER } from '@kbn/file-upload-common';
import { useKibana } from '../hooks/use_kibana';
import { useSourceIndicesFields } from '../hooks/use_source_indices_field';

interface Props {
  isSetup?: boolean;
}

export const UploadFileButton: React.FC<Props> = ({ isSetup }) => {
  const {
    services: { uiActions },
  } = useKibana();
  const { setIndices: setSelectedIndices } = useSourceIndicesFields();

  const showFileUploadFlyout = React.useCallback(() => {
    if (uiActions !== null) {
      uiActions.getTrigger(OPEN_FILE_UPLOAD_LITE_TRIGGER).exec({
        autoAddInference: '.elser-2-elasticsearch',
        onUploadComplete: (results: FileUploadResults) => {
          setSelectedIndices([results.index]);
        },
      });
    }
  }, [setSelectedIndices, uiActions]);

  return (
    <>
      <EuiButton
        size={isSetup ? 'm' : 's'}
        fill={isSetup}
        iconType="plusInCircle"
        onClick={() => showFileUploadFlyout()}
        data-test-subj="uploadFileButton"
      >
        <FormattedMessage
          id="xpack.searchPlayground.setupPage.uploadFileLabel"
          defaultMessage="Upload file"
        />
      </EuiButton>
    </>
  );
};
