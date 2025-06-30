/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiConfirmModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type TimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { CaseAttachmentsWithoutOwner } from '@kbn/cases-plugin/public';
import type { PageAttachmentPersistedState } from '@kbn/observability-schema';
import { type CasesPermissions } from '@kbn/cases-plugin/common';
import { ClientPluginsStart } from '../../../../plugin';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useGetUrlParams, useMonitorDetailLocator, useChatService } from '../../hooks';
import { AddToCaseComment } from './add_to_case_comment';

export function AddToCaseContextItem() {
  const {
    services: { cases },
  } = useKibana<ClientPluginsStart>();
  const getCasesContext = cases.ui?.getCasesContext;
  const canUseCases = cases.helpers?.canUseCases;
  const { ObservabilityAIAssistantChatServiceContext, chatService } = useChatService();

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

  if (!cases) {
    return null;
  }

  console.log('hasCasesPermissions', hasCasesPermissions);
  return hasCasesPermissions ? (
    <CasesContext permissions={casesPermissions} owner={['observability']}>
      {ObservabilityAIAssistantChatServiceContext && chatService?.value ? (
        <ObservabilityAIAssistantChatServiceContext.Provider value={chatService.value}>
          <AddToCaseButtonContent />
        </ObservabilityAIAssistantChatServiceContext.Provider>
      ) : (
        <AddToCaseButtonContent />
      )}
    </CasesContext>
  ) : null;
}

function AddToCaseButtonContent() {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isCommentLoading, setIsCommentLoading] = useState(true);
  const [comment, setComment] = useState<string>('');
  const { monitor } = useSelectedMonitor();
  const { dateRangeEnd, dateRangeStart, locationId } = useGetUrlParams();
  const {
    services: {
      cases: {
        hooks: { useCasesAddToExistingCaseModal },
      },
      notifications,
    },
  } = useKibana<ClientPluginsStart>();
  const casesModal = useCasesAddToExistingCaseModal();
  const timeRange: TimeRange = useMemo(
    () => ({
      from: dateRangeStart,
      to: dateRangeEnd,
    }),
    [dateRangeStart, dateRangeEnd]
  );
  const redirectUrl = useMonitorDetailLocator({
    configId: monitor?.config_id ?? '',
    timeRange,
    locationId,
    tabId: 'history',
    useAbsoluteDate: true,
  });

  const onCommentAdded = useCallback(() => {
    if (!monitor?.name || !redirectUrl) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.synthetics.cases.addToCaseModal.error.noMonitorName', {
          defaultMessage: 'Error adding monitor to case',
        }),
        'data-test-subj': 'monitorAddToCaseError',
      });
      return;
    }
    casesModal.open({
      getAttachments: () => {
        const persistableStateAttachmentState: PageAttachmentPersistedState = {
          type: 'dashboard',
          url: {
            pathAndQuery: redirectUrl,
            label: monitor.name,
            actionLabel: i18n.translate(
              'xpack.synthetics.cases.addToCaseModal.goToDashboardActionLabel',
              {
                defaultMessage: 'Go to Monitor History',
              }
            ),
            iconType: 'uptimeApp',
          },
          summary: comment,
        };
        return [
          {
            persistableStateAttachmentState,
            persistableStateAttachmentTypeId: '.page',
            type: 'persistableState',
          },
        ] as CaseAttachmentsWithoutOwner;
      },
    });
  }, [casesModal, notifications.toasts, monitor?.name, redirectUrl, comment]);

  const onClick = useCallback(() => {
    if (!redirectUrl || !monitor?.name) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.synthetics.cases.addToCaseModal.error.noMonitorLocator', {
          defaultMessage: 'Error adding monitor to case',
        }),
        'data-test-subj': 'monitorAddToCaseError',
      });
      return;
    }
    setIsCommentModalOpen(true);
  }, [setIsCommentModalOpen, redirectUrl, monitor?.name, notifications.toasts]);

  const onCloseModal = useCallback(() => {
    setIsCommentModalOpen(false);
    if (comment) {
      setComment(''); // Reset comment after adding to case
    }
  }, [comment, setIsCommentModalOpen, setComment]);

  if (!monitor || !redirectUrl) {
    return null; // Ensure monitor and redirectUrl are available before rendering
  }

  return (
    <>
      <EuiContextMenuItem
        key="addToCase"
        data-test-subj="sloAddToCaseButton"
        icon="plusInCircle"
        onClick={onClick}
      >
        {i18n.translate('xpack.synthetics.cases.addToCaseModal.buttonLabel', {
          defaultMessage: 'Add to case',
        })}
      </EuiContextMenuItem>
      {isCommentModalOpen && (
        <EuiConfirmModal
          onCancel={onCloseModal}
          onConfirm={onCommentAdded}
          data-test-subj="syntheticsAddToCaseCommentModal"
          style={{ width: 800 }}
          confirmButtonText={i18n.translate(
            'xpack.synthetics.cases.addToCaseModal.confirmButtonText',
            {
              defaultMessage: 'Confirm',
            }
          )}
          cancelButtonText={i18n.translate(
            'xpack.synthetics.cases.addToCaseModal.cancelButtonText',
            {
              defaultMessage: 'Cancel',
            }
          )}
          isLoading={isCommentLoading}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>
              {i18n.translate('xpack.synthetics.cases.addToCaseModal.title', {
                defaultMessage: 'Add monitor to case',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <AddToCaseComment
              onCommentChange={setComment}
              comment={comment}
              setIsLoading={setIsCommentLoading}
            />
          </EuiModalBody>
        </EuiConfirmModal>
      )}
    </>
  );
}
