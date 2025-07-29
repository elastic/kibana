/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import { CasesPublicStart } from '@kbn/cases-plugin/public';
import { EuiConfirmModal, EuiModalHeader, EuiModalHeaderTitle, EuiModalBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { PageAttachmentPersistedState } from '@kbn/page-attachment-schema';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { useChatService } from '../../hooks/use_chat_service';
import { AddToCaseComment } from '../add_to_case_comment';

export interface AddPageAttachmentToCaseModalProps {
  pageAttachmentState: PageAttachmentPersistedState;
  observabilityAIAssistant?: ObservabilityAIAssistantPublicStart;
  cases: CasesPublicStart;
  onCloseModal: () => void;
}

export function AddPageAttachmentToCaseModal({
  pageAttachmentState,
  cases,
  observabilityAIAssistant,
  onCloseModal,
}: AddPageAttachmentToCaseModalProps) {
  const getCasesContext = cases?.ui.getCasesContext;
  const canUseCases = cases?.helpers.canUseCases;
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
  const hasCasesPermissions =
    casesPermissions.read && casesPermissions.update && casesPermissions.push;
  const CasesContext = useMemo(() => {
    if (!getCasesContext) {
      return React.Fragment;
    }
    return getCasesContext();
  }, [getCasesContext]);

  return hasCasesPermissions ? (
    <CasesContext permissions={casesPermissions} owner={['observability']}>
      {ObservabilityAIAssistantChatServiceContext && chatService ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService}>
          <AddToCaseButtonContent
            pageAttachmentState={pageAttachmentState}
            cases={cases}
            observabilityAIAssistant={observabilityAIAssistant}
            onCloseModal={onCloseModal}
          />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : (
        <AddToCaseButtonContent
          pageAttachmentState={pageAttachmentState}
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
  onCloseModal,
}: AddPageAttachmentToCaseModalProps) {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(true);
  const [isCommentLoading, setIsCommentLoading] = useState(true);
  const [comment, setComment] = useState<string>('');
  const useCasesAddToExistingCaseModal = cases.hooks.useCasesAddToExistingCaseModal!;
  const casesModal = useCasesAddToExistingCaseModal();

  const onCommentAdded = useCallback(() => {
    setIsCommentModalOpen(false);
    casesModal.open({
      getAttachments: () => {
        return [
          {
            persistableStateAttachmentState: {
              ...pageAttachmentState,
              summary: comment,
            },
            persistableStateAttachmentTypeId: '.page',
            type: 'persistableState',
          },
        ] as CaseAttachmentsWithoutOwner;
      },
    });
  }, [casesModal, comment, pageAttachmentState]);

  return (
    <>
      {isCommentModalOpen && (
        <EuiConfirmModal
          onCancel={onCloseModal}
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
          isLoading={isCommentLoading}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.observabilityShared.cases.addToCaseModal.title', {
                defaultMessage: 'Add page to case',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <AddToCaseComment
              onCommentChange={setComment}
              comment={comment}
              setIsLoading={setIsCommentLoading}
              observabilityAIAssistant={observabilityAIAssistant}
            />
          </EuiModalBody>
        </EuiConfirmModal>
      )}
    </>
  );
}

// eslint-disable-next-line import/no-default-export
export default AddPageAttachmentToCaseModal;
