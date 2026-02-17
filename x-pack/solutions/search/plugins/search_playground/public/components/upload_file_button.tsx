/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import type { FileUploadResults } from '@kbn/file-upload-common';
import { i18n } from '@kbn/i18n';
import { OPEN_FILE_UPLOAD_LITE_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
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
      uiActions.executeTriggerActions(OPEN_FILE_UPLOAD_LITE_TRIGGER, {
        autoAddInference: '.elser-2-elasticsearch',
        onUploadComplete: (results: FileUploadResults) => {
          setSelectedIndices([results.index]);
        },
        location: 'search-playground',
      });
    }
  }, [setSelectedIndices, uiActions]);

  return (
    <>
      {isSetup ? (
        <EuiButtonEmpty
          flush="right"
          iconType="importAction"
          onClick={() => showFileUploadFlyout()}
          data-test-subj="uploadFileButtonEmpty"
          aria-label={i18n.translate(
            'xpack.searchPlayground.setupPage.uploadFileButtonEmptyLabel',
            {
              defaultMessage: 'Upload a file',
            }
          )}
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.uploadFileButtonEmptyLabel"
            defaultMessage="Upload a file"
          />
        </EuiButtonEmpty>
      ) : (
        <EuiButton
          color="text"
          size="s"
          fill={false}
          iconType="plusInCircle"
          onClick={() => showFileUploadFlyout()}
          data-test-subj="uploadFileButton"
        >
          <FormattedMessage
            id="xpack.searchPlayground.setupPage.uploadFileLabel"
            defaultMessage="Upload file"
          />
        </EuiButton>
      )}
    </>
  );
};
