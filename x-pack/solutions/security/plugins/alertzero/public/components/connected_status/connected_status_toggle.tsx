/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { StatusToggle } from '@kbn/agentic-investigations-common';
import {
  useSetInvestigationStatus,
  useSetEscalationStatus,
  useInvestigationClosePreview,
  useEscalationClosePreview,
  escalationQueryKeys,
} from '@kbn/agentic-investigations-plugin/public';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import type { DismissReason } from '@kbn/proposals-common';
import type { StatusSlotRenderProps } from '@kbn/agentic-investigations-common';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';
import { statusSignal } from './status_signal';
import { CloseInvestigationModal } from '../close_confirmation/close_investigation_modal';
import { CloseEscalationModal } from '../close_confirmation/close_escalation_modal';
import * as i18n from '../close_confirmation/translations';

export type ConnectedStatusToggleProps = StatusSlotRenderProps;

/**
 * Wraps `StatusToggle` with the real HTTP mutations and confirmation modals.
 * Registered as `renderStatus` in both investigation and escalation template UIs.
 */
export const ConnectedStatusToggle: React.FC<ConnectedStatusToggleProps> = ({
  conversationId,
  templateId,
  status,
  refetchConversation,
}) => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const { manageEscalations, manageInvestigations } = useAgenticInvestigationsCapabilities();

  // Closing an escalation requires both manage-escalations and manage-investigations.
  const canToggle =
    templateId === 'escalation' ? manageEscalations && manageInvestigations : manageInvestigations;

  const [showCloseModal, setShowCloseModal] = useState(false);

  // Pre-fetch the close preview when the user starts hovering / the toggle is visible.
  // `enabled: showCloseModal` — only fetch when the modal is about to open.
  const investigationPreview = useInvestigationClosePreview(conversationId, {
    enabled: showCloseModal && templateId === 'investigation',
  });
  const escalationPreview = useEscalationClosePreview(conversationId, {
    enabled: showCloseModal && templateId === 'escalation',
  });

  const setInvestigationStatus = useSetInvestigationStatus();
  const setEscalationStatus = useSetEscalationStatus();

  const isMutating = setInvestigationStatus.isLoading || setEscalationStatus.isLoading;
  const isLoading = isMutating || investigationPreview.isLoading || escalationPreview.isLoading;

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
    void queryClient.invalidateQueries({ queryKey: ['alertzero', 'investigations', 'count'] });
  }, [queryClient]);

  const handleSuccess = useCallback(
    (failedProposalIds: string[]) => {
      invalidateAll();
      statusSignal.bump();
      void refetchConversation?.();

      const isClosing = status !== 'closed';
      const successMsg = isClosing
        ? templateId === 'escalation'
          ? i18n.CLOSE_ESCALATION_SUCCESS
          : i18n.CLOSE_INVESTIGATION_SUCCESS
        : templateId === 'escalation'
        ? i18n.REOPEN_ESCALATION_SUCCESS
        : i18n.REOPEN_INVESTIGATION_SUCCESS;

      services.notifications?.toasts.addSuccess(successMsg);

      if (failedProposalIds.length > 0) {
        services.notifications?.toasts.addWarning(i18n.PARTIAL_PROPOSAL_DISMISS_WARNING);
      }
    },
    [invalidateAll, refetchConversation, services, status, templateId]
  );

  const handleError = useCallback(() => {
    services.notifications?.toasts.addDanger(i18n.STATUS_CHANGE_ERROR);
  }, [services]);

  const executeClose = useCallback(
    ({ dismissReason, rationale }: { dismissReason?: DismissReason; rationale?: string }) => {
      if (templateId === 'investigation') {
        setInvestigationStatus.mutate(
          {
            investigationId: conversationId,
            body: { status: 'closed', dismiss_reason: dismissReason, rationale },
          },
          {
            onSuccess: (result) => {
              setShowCloseModal(false);
              handleSuccess(result.failed_proposal_ids);
            },
            onError: () => {
              setShowCloseModal(false);
              handleError();
            },
          }
        );
      } else {
        setEscalationStatus.mutate(
          {
            escalationId: conversationId,
            body: { status: 'closed', dismiss_reason: dismissReason, rationale },
          },
          {
            onSuccess: (result) => {
              setShowCloseModal(false);
              handleSuccess(result.failed_proposal_ids);
            },
            onError: () => {
              setShowCloseModal(false);
              handleError();
            },
          }
        );
      }
    },
    [
      conversationId,
      handleError,
      handleSuccess,
      setEscalationStatus,
      setInvestigationStatus,
      templateId,
    ]
  );

  const handleToggle = useCallback(
    (newStatus: 'open' | 'closed') => {
      if (newStatus === 'closed') {
        setShowCloseModal(true);
      } else {
        // Reopening — no confirmation needed.
        if (templateId === 'investigation') {
          setInvestigationStatus.mutate(
            { investigationId: conversationId, body: { status: 'open' } },
            {
              onSuccess: () => handleSuccess([]),
              onError: handleError,
            }
          );
        } else {
          setEscalationStatus.mutate(
            { escalationId: conversationId, body: { status: 'open' } },
            {
              onSuccess: () => handleSuccess([]),
              onError: handleError,
            }
          );
        }
      }
    },
    [
      conversationId,
      handleError,
      handleSuccess,
      setEscalationStatus,
      setInvestigationStatus,
      templateId,
    ]
  );

  return (
    <>
      <StatusToggle
        status={status}
        onChange={handleToggle}
        isLoading={isLoading}
        isDisabled={!canToggle}
        data-test-subj="connectedStatusToggle"
      />

      {showCloseModal && templateId === 'investigation' && investigationPreview.data ? (
        <CloseInvestigationModal
          pendingProposalCount={investigationPreview.data.pending_proposal_count}
          onClose={() => setShowCloseModal(false)}
          onConfirm={executeClose}
          isLoading={isMutating}
        />
      ) : null}

      {showCloseModal && templateId === 'escalation' && escalationPreview.data ? (
        <CloseEscalationModal
          preview={escalationPreview.data}
          onClose={() => setShowCloseModal(false)}
          onConfirm={executeClose}
          isLoading={isMutating}
        />
      ) : null}
    </>
  );
};
