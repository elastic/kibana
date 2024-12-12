/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiConfirmModal } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Annotation } from '../../../../../common/annotations';

export function DeleteAnnotationsModal({
  isDeleteModalVisible,
  onDelete,
  setSelection,
  setIsDeleteModalVisible,
  selection,
}: {
  selection: Annotation[];
  isDeleteModalVisible: boolean;
  setSelection: (selection: Annotation[]) => void;
  onDelete: () => void;
  setIsDeleteModalVisible: (isVisible: boolean) => void;
}) {
  if (!isDeleteModalVisible) {
    return <> </>;
  }

  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.observability.deleteAnnotations.euiConfirmModal.deleteAnnotationLabel',
        { defaultMessage: 'Delete annotation' }
      )}
      onCancel={() => {
        setIsDeleteModalVisible(false);
        setSelection([]);
      }}
      onConfirm={onDelete}
      cancelButtonText={i18n.translate(
        'xpack.observability.deleteAnnotations.euiConfirmModal.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.observability.deleteAnnotations.euiConfirmModal.deleteButtonLabel',
        { defaultMessage: 'Delete' }
      )}
      buttonColor="danger"
      defaultFocusedButton="confirm"
    >
      <p>
        {i18n.translate(
          'xpack.observability.deleteAnnotations.euiConfirmModal.deleteAnnotationDescription',
          {
            defaultMessage: 'Are you sure you want to delete "{names}" annotation?',
            values: {
              names: selection
                .map((annotation) => annotation.annotation.title ?? annotation.message)
                .join(', '),
            },
          }
        )}
      </p>
    </EuiConfirmModal>
  );
}
