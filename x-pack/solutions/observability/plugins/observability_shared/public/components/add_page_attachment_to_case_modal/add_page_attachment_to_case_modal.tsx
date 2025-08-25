/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { CasesPublicStart } from '@kbn/cases-plugin/public';
import { EuiConfirmModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AttachmentType } from '@kbn/cases-plugin/common';
import {
  type PageAttachmentPersistedState,
  PAGE_ATTACHMENT_TYPE,
} from '@kbn/page-attachment-schema';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import type { NotificationsStart } from '@kbn/core/public';
import { AddToCaseComment } from '../add_to_case_comment';

export interface AddPageAttachmentToCaseModalProps {
  pageAttachmentState: PageAttachmentPersistedState;
  notifications: NotificationsStart;
  cases: CasesPublicStart;
  onCloseModal: () => void;
}

export function AddPageAttachmentToCaseModal({
  pageAttachmentState,
  cases,
  notifications,
  onCloseModal,
}: AddPageAttachmentToCaseModalProps) {
  const getCasesContext = cases.ui.getCasesContext;
  const canUseCases = cases.helpers.canUseCases;

  const casesPermissions: CasesPermissions = useMemo(() => {
    if (!canUseCases) {
      return {
        all: false,
        create: false,
        read: false,
        update: false,
        delete: false,
        push: false,
        connectors: false,
        settings: false,
        reopenCase: false,
        createComment: false,
        assign: false,
      };
    }
    return canUseCases();
  }, [canUseCases]);

  const hasCasesPermissions = useMemo(() => {
    return casesPermissions.read && casesPermissions.update && casesPermissions.push;
  }, [casesPermissions]);

  const CasesContext = getCasesContext();

  useEffect(() => {
    if (!hasCasesPermissions) {
      notifications.toasts.addWarning({
        title: i18n.translate(
          'xpack.observabilityShared.cases.addPageToCaseModal.noPermissionsTitle',
          {
            defaultMessage:
              'Insufficient privileges to add page to case. Please contact your admin.',
          }
        ),
      });
    }
  }, [hasCasesPermissions, notifications.toasts]);

  return hasCasesPermissions ? (
    <CasesContext
      permissions={casesPermissions}
      owner={['observability']}
      features={{ alerts: { sync: false } }}
    >
      <AddToCaseButtonContent
        pageAttachmentState={pageAttachmentState}
        cases={cases}
        onCloseModal={onCloseModal}
      />
    </CasesContext>
  ) : null;
}

function AddToCaseButtonContent({
  pageAttachmentState,
  cases,
  onCloseModal,
}: Omit<AddPageAttachmentToCaseModalProps, 'notifications'>) {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(true);
  const [comment, setComment] = useState<string>('');
  const useCasesAddToExistingCaseModal = cases.hooks.useCasesAddToExistingCaseModal!;
  const casesModal = useCasesAddToExistingCaseModal({
    onClose: onCloseModal,
  });

  const handleCloseModal = useCallback(() => {
    setIsCommentModalOpen(true);
    onCloseModal();
  }, [onCloseModal]);

  const onCommentAdded = useCallback(() => {
    setIsCommentModalOpen(false);
    casesModal.open({
      getAttachments: () => [
        {
          persistableStateAttachmentState: {
            ...pageAttachmentState,
            summary: comment,
          },
          persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
          type: AttachmentType.persistableState,
        },
      ],
    });
  }, [casesModal, comment, pageAttachmentState]);

  return isCommentModalOpen ? (
    <EuiConfirmModal
      onCancel={handleCloseModal}
      aria-label={i18n.translate(
        'xpack.observabilityShared.cases.addToCaseModal.confirmAriaLabel',
        {
          defaultMessage: 'Confirm comment',
        }
      )}
      onConfirm={onCommentAdded}
      data-test-subj="syntheticsAddToCaseCommentModal"
      style={{ width: 800 }}
      confirmButtonText={i18n.translate(
        'xpack.observabilityShared.cases.addToPageAttachmentToCaseModal.confirmButtonText',
        {
          defaultMessage: 'Confirm',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.observabilityShared.cases.addToPageAttachmentToCaseModal.cancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.observabilityShared.cases.addToCaseModal.title', {
            defaultMessage: 'Add page to case',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AddToCaseComment onCommentChange={(change) => setComment(change)} comment={comment} />
      </EuiModalBody>
    </EuiConfirmModal>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default AddPageAttachmentToCaseModal;
