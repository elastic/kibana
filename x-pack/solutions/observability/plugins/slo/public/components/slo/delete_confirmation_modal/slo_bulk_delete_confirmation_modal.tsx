/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useBulkDeleteSlo } from '../../../hooks/use_bulk_delete_slo';

export interface Props {
  slos: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSuccess: () => void;
}

export function SloBulkDeleteModal({ slos, onCancel, onSuccess }: Props) {
  const modalTitleId = useGeneratedHtmlId();

  const { mutateAsync: bulkDeleteSlo, isLoading: isDeleteLoading } = useBulkDeleteSlo();

  const handleDeleteAll = async () => {
    await bulkDeleteSlo({ ids: slos.map((slo) => slo.id) });
    onSuccess();
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onCancel}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>{getTitleLabel(slos.length)}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FormattedMessage
          id="xpack.slo.deleteConfirmationModal.descriptionText"
          defaultMessage="You can't recover these SLOs after deleting them."
        />
        <EuiSpacer size="xs" />
        {slos.map((slo) => {
          return (
            <EuiText size="s" key={slo.id}>
              {slo.name}
            </EuiText>
          );
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          data-test-subj="observabilitySolutionSloDeleteModalCancelButton"
          onClick={onCancel}
          disabled={isDeleteLoading}
        >
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="observabilitySolutionSloDeleteModalConfirmButton"
          type="submit"
          color="danger"
          onClick={handleDeleteAll}
          disabled={isDeleteLoading}
          fill
        >
          <FormattedMessage
            id="xpack.slo.deleteConfirmationModal.deleteButtonLabel"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

function getTitleLabel(amount: number): React.ReactNode {
  return i18n.translate('xpack.slo.deleteConfirmationModal.title', {
    defaultMessage: 'Delete {amount} SLOs?',
    values: { amount },
  });
}
