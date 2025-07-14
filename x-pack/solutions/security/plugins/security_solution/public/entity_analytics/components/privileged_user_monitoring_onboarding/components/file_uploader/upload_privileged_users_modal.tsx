/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { PrivilegedUsersFileUploader } from './privileged_users_file_uploader';

interface ImportPrivilegedUsersModalProps {
  onClose: () => void;
  onImport: (userCount: number) => void;
}

export const UploadPrivilegedUsersModal: React.FC<ImportPrivilegedUsersModalProps> = ({
  onClose,
  onImport,
}) => {
  // TODO handle missing permissions
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.uploadPrivilegedUsersModal.title"
            defaultMessage="Import file"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.privilegedUserMonitoring.uploadPrivilegedUsersModal.description"
              defaultMessage="Add your privileged users by importing a CSV file exported from your user management tool. This ensures data accuracy and reduces manual input errors."
            />
          </p>
        </EuiText>

        <PrivilegedUsersFileUploader onFileUploaded={onImport} onClose={onClose} />
      </EuiModalBody>
    </EuiModal>
  );
};