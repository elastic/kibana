/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import React, { useState } from 'react';

// import type { UploadedFile } from '@kbn/shared-ux-file-upload/src/file_upload';

// import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FileUpload } from '@kbn/shared-ux-file-upload';
import { OWNERS, constructFileKindIdByOwner } from '../../../../../common/files';

interface AddFileProps {
  investigationId: string;
}

const AddFileComponent: React.FC<AddFileProps> = ({ investigationId }) => {
  // const { isLoading, mutateAsync: createAttachments } = useCreateAttachments();
  // const refreshAttachmentsTable = useRefreshCaseViewPage();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const closeModal = () => setIsModalVisible(false);
  const showModal = () => setIsModalVisible(true);

  // const onError = useCallback(
  //   (error: Error | ServerError) => {
  //     showErrorToast(error, {
  //       title: i18n.FAILED_UPLOAD,
  //     });
  //   },
  //   [showErrorToast]
  // );

  // const onUploadDone = useCallback(
  //   async (chosenFiles: UploadedFile[]) => {
  //     if (chosenFiles.length === 0) {
  //       return;
  //     }

  //     const file = chosenFiles[0];

  //     try {
  //       await createAttachments({
  //         caseId,
  //         caseOwner: owner[0],
  //         attachments: [
  //           {
  //             type: AttachmentType.externalReference,
  //             externalReferenceId: file.id,
  //             externalReferenceStorage: {
  //               type: ExternalReferenceStorageType.savedObject,
  //               soType: FILE_SO_TYPE,
  //             },
  //             externalReferenceAttachmentTypeId: FILE_ATTACHMENT_TYPE,
  //             externalReferenceMetadata: {
  //               files: [
  //                 {
  //                   name: file.fileJSON.name,
  //                   extension: file.fileJSON.extension ?? '',
  //                   mimeType: file.fileJSON.mimeType ?? '',
  //                   created: file.fileJSON.created,
  //                 },
  //               ],
  //             },
  //           },
  //         ],
  //       });

  //       refreshAttachmentsTable();

  //       showSuccessToast(i18n.SUCCESSFUL_UPLOAD_FILE_NAME(file.fileJSON.name));
  //     } catch (error) {
  //       // error toast is handled inside  createAttachments

  //       // we need to delete the file if attachment creation failed
  //       return deleteFileAttachments({ caseId, fileIds: [file.id] });
  //     }

  //     closeModal();
  //   },
  //   [caseId, createAttachments, owner, refreshAttachmentsTable, showDangerToast, showSuccessToast]
  // );

  return (
    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="investigation-files-add"
        iconType="plusInCircle"
        isDisabled={false}
        isLoading={false}
        onClick={showModal}
      >
        {'Attach an image'}
      </EuiButton>
      {isModalVisible && (
        <EuiModal data-test-subj="investigation-files-add-modal" onClose={closeModal}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{'Add file'}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <FileUpload
              kind={constructFileKindIdByOwner(OWNERS[0])}
              onDone={() => {}}
              onError={() => {}}
              meta={{ investigationId }}
            />
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiFlexItem>
  );
};

AddFileComponent.displayName = 'AddFile';

export const AddFile = React.memo(AddFileComponent);
