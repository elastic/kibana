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
import type { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import {
  type PageAttachmentPersistedState,
  PAGE_ATTACHMENT_TYPE,
} from '@kbn/page-attachment-schema';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import type { NotificationsStart } from '@kbn/core/public';
import { useChatService } from '../../hooks/use_chat_service';
import { usePageSummary } from '../../hooks/use_page_summary';
import { AddToCaseComment } from '../add_to_case_comment';

export interface AddPageAttachmentToCaseModalProps {
  pageAttachmentState: PageAttachmentPersistedState;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  notifications: NotificationsStart;
  cases: CasesPublicStart;
  onCloseModal: () => void;
}

export function AddPageAttachmentToCaseModal({
  pageAttachmentState,
  cases,
  observabilityAIAssistant,
  notifications,
  onCloseModal,
}: AddPageAttachmentToCaseModalProps) {
  const getCasesContext = cases.ui.getCasesContext;
  const canUseCases = cases.helpers.canUseCases;
  const { ObservabilityAIAssistantChatServiceContext, chatService } = useChatService({
    observabilityAIAssistant,
  });

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
        title: i18n.translate('xpack.observability.cases.addPageToCaseModal.noPermissionsTitle', {
          defaultMessage: 'Insufficient privileges to add page to case. Please contact your admin.',
        }),
      });
    }
  }, [hasCasesPermissions, notifications.toasts]);

  return hasCasesPermissions ? (
    <CasesContext
      permissions={casesPermissions}
      owner={['observability']}
      features={{ alerts: { sync: false } }}
    >
      {ObservabilityAIAssistantChatServiceContext && chatService ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService}>
          <AddToCaseButtonContent
            pageAttachmentState={pageAttachmentState}
            cases={cases}
            observabilityAIAssistant={observabilityAIAssistant}
            notifications={notifications}
            onCloseModal={onCloseModal}
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : (
        <AddToCaseButtonContent
          pageAttachmentState={pageAttachmentState}
          notifications={notifications}
          cases={cases}
          onCloseModal={onCloseModal}
        />
      )}
    </CasesContext>
  ) : null;
}

function AddToCaseButtonContent({
  pageAttachmentState,
  cases,
  observabilityAIAssistant,
  notifications,
  onCloseModal,
}: AddPageAttachmentToCaseModalProps) {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(true);
  const [isCommentLoading, setIsCommentLoading] = useState(true);
  const [comment, setComment] = useState<string>('');
  const useCasesAddToExistingCaseModal = cases.hooks.useCasesAddToExistingCaseModal!;
  const { screenContexts } = usePageSummary({
    observabilityAIAssistant,
    appInstructions:
      'When referring to Synthetics monitors, include the monitor name, test run timestamp, and test run location.',
  });
  const casesModal = useCasesAddToExistingCaseModal({
    onClose: (_, isCreateCase) => {
      if (!isCreateCase) {
        onCloseModal();
      }
    },
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
            screenContext: screenContexts || [],
          },
          persistableStateAttachmentTypeId: PAGE_ATTACHMENT_TYPE,
          type: AttachmentType.persistableState,
        },
      ],
    });
  }, [casesModal, comment, pageAttachmentState, screenContexts]);

  return isCommentModalOpen ? (
    <EuiConfirmModal
      onCancel={handleCloseModal}
      aria-label={i18n.translate('xpack.observability.cases.addToCaseModal.confirmAriaLabel', {
        defaultMessage: 'Confirm comment',
      })}
      onConfirm={onCommentAdded}
      data-test-subj="syntheticsAddToCaseCommentModal"
      style={{ width: 800 }}
      isLoading={isCommentLoading}
      confirmButtonText={i18n.translate(
        'xpack.observability.cases.addToPageAttachmentToCaseModal.confirmButtonText',
        {
          defaultMessage: 'Confirm',
        }
      )}
      cancelButtonText={i18n.translate(
        'xpack.observability.cases.addToPageAttachmentToCaseModal.cancelButtonText',
        {
          defaultMessage: 'Cancel',
        }
      )}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.observability.cases.addToCaseModal.title', {
            defaultMessage: 'Add page to case',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AddToCaseComment
          setComment={setComment}
          comment={comment}
          setIsLoading={setIsCommentLoading}
          notifications={notifications}
          observabilityAIAssistant={observabilityAIAssistant}
        />
      </EuiModalBody>
    </EuiConfirmModal>
  ) : null;
}

// eslint-disable-next-line import/no-default-export
export default AddPageAttachmentToCaseModal;
