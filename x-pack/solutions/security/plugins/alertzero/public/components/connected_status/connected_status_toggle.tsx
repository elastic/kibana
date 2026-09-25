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
import { isHttpFetchError } from '@kbn/core-http-browser';
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
import type {
  InvestigationClosePreviewResponse,
  EscalationClosePreviewResponse,
} from '@kbn/agentic-investigations-plugin/common';
import { useAgenticInvestigationsCapabilities } from '../../hooks/use_agentic_investigations_capabilities';
import { statusSignal } from './status_signal';
import { CloseInvestigationModal } from '../close_confirmation/close_investigation_modal';
import { CloseEscalationModal } from '../close_confirmation/close_escalation_modal';
import * as i18n from '../close_confirmation/translations';

export type ConnectedStatusToggleProps = StatusSlotRenderProps;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when an HTTP error response has our `close_targets_changed` code.
 * We avoid importing the error class across plugin boundaries.
 */
const isCloseTargetsChangedError = (error: unknown): boolean => {
  if (!isHttpFetchError(error)) return false;
  const body = error.body as { attributes?: { code?: string } } | undefined;
  return body?.attributes?.code === 'close_targets_changed';
};

// ---------------------------------------------------------------------------
// Investigation close modal container
// ---------------------------------------------------------------------------

interface InvestigationCloseContainerProps {
  conversationId: string;
  isMutating: boolean;
  onClose: () => void;
  onConfirm: (params: {
    dismissReason?: DismissReason;
    rationale?: string;
    preview: InvestigationClosePreviewResponse;
  }) => Promise<void> | void;
}

/** Determines whether an error body carries the `proposal_dismiss_failed` code. */
const isProposalDismissFailedError = (
  error: unknown
): error is { attributes: { code: string; failed_proposal_ids: string[] } } => {
  if (!isHttpFetchError(error)) return false;
  const body = error.body as { attributes?: { code?: string } } | undefined;
  return body?.attributes?.code === 'proposal_dismiss_failed';
};

/**
 * Mounts the close preview hook and renders the investigation modal.
 * Rendered only when the modal is open, so every open starts a fresh fetch.
 */
const InvestigationCloseContainer: React.FC<InvestigationCloseContainerProps> = ({
  conversationId,
  isMutating,
  onClose,
  onConfirm,
}) => {
  const [targetsChanged, setTargetsChanged] = useState(false);
  const [closeError, setCloseError] = useState<{
    kind: 'dismiss_failed';
    count: number;
  } | null>(null);

  const preview = useInvestigationClosePreview(conversationId, { enabled: true });

  const handleConfirm = useCallback(
    async (params: { dismissReason?: DismissReason; rationale?: string }) => {
      if (!preview.data) return;
      setCloseError(null);
      try {
        await onConfirm({ ...params, preview: preview.data });
      } catch (err) {
        if (isCloseTargetsChangedError(err)) {
          setTargetsChanged(true);
          void preview.refetch();
        } else if (isProposalDismissFailedError(err)) {
          const ids =
            (err as unknown as { body?: { attributes?: { failed_proposal_ids?: string[] } } }).body
              ?.attributes?.failed_proposal_ids ?? [];
          setCloseError({ kind: 'dismiss_failed', count: ids.length });
          void preview.refetch();
        }
      }
    },
    [onConfirm, preview]
  );

  return (
    <CloseInvestigationModal
      preview={preview.data}
      isRefreshing={preview.isFetching}
      targetsChanged={targetsChanged}
      loadError={preview.isError && !preview.data}
      onRetry={() => void preview.refetch()}
      closeErrorKind={closeError?.kind}
      closeErrorCount={closeError?.count}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={isMutating}
    />
  );
};

// ---------------------------------------------------------------------------
// Escalation close modal container
// ---------------------------------------------------------------------------

interface EscalationCloseContainerProps {
  conversationId: string;
  isMutating: boolean;
  onClose: () => void;
  onConfirm: (params: {
    dismissReason?: DismissReason;
    rationale?: string;
    preview: EscalationClosePreviewResponse;
  }) => Promise<void> | void;
}

/** Determines whether an error body carries the `escalation_close_incomplete` code. */
const isEscalationCloseIncompleteError = (error: unknown): boolean => {
  if (!isHttpFetchError(error)) return false;
  const body = error.body as { attributes?: { code?: string } } | undefined;
  return body?.attributes?.code === 'escalation_close_incomplete';
};

/**
 * Mounts the close preview hook and renders the escalation modal.
 * Rendered only when the modal is open, so every open starts a fresh fetch.
 */
const EscalationCloseContainer: React.FC<EscalationCloseContainerProps> = ({
  conversationId,
  isMutating,
  onClose,
  onConfirm,
}) => {
  const [targetsChanged, setTargetsChanged] = useState(false);
  const [closeError, setCloseError] = useState<{
    kind: 'dismiss_failed' | 'escalation_incomplete';
    count: number;
  } | null>(null);

  const preview = useEscalationClosePreview(conversationId, { enabled: true });

  const handleConfirm = useCallback(
    async (params: { dismissReason?: DismissReason; rationale?: string }) => {
      if (!preview.data) return;
      setCloseError(null);
      try {
        await onConfirm({ ...params, preview: preview.data });
      } catch (err) {
        if (isCloseTargetsChangedError(err)) {
          setTargetsChanged(true);
          void preview.refetch();
        } else if (isEscalationCloseIncompleteError(err)) {
          const attrs = (
            err as unknown as { body?: { attributes?: { skipped_investigation_ids?: string[] } } }
          ).body?.attributes;
          setCloseError({
            kind: 'escalation_incomplete',
            count: attrs?.skipped_investigation_ids?.length ?? 1,
          });
          void preview.refetch();
        } else if (isProposalDismissFailedError(err)) {
          const ids =
            (err as unknown as { body?: { attributes?: { failed_proposal_ids?: string[] } } }).body
              ?.attributes?.failed_proposal_ids ?? [];
          setCloseError({ kind: 'dismiss_failed', count: ids.length });
          void preview.refetch();
        }
      }
    },
    [onConfirm, preview]
  );

  return (
    <CloseEscalationModal
      preview={preview.data}
      isRefreshing={preview.isFetching}
      targetsChanged={targetsChanged}
      loadError={preview.isError && !preview.data}
      onRetry={() => void preview.refetch()}
      closeErrorKind={closeError?.kind}
      closeErrorCount={closeError?.count}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={isMutating}
    />
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  const setInvestigationStatus = useSetInvestigationStatus();
  const setEscalationStatus = useSetEscalationStatus();

  const isMutating = setInvestigationStatus.isLoading || setEscalationStatus.isLoading;

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

  const executeCloseInvestigation = useCallback(
    ({
      dismissReason,
      rationale,
      preview,
    }: {
      dismissReason?: DismissReason;
      rationale?: string;
      preview: InvestigationClosePreviewResponse;
    }): Promise<void> => {
      return new Promise((resolve, reject) => {
        setInvestigationStatus.mutate(
          {
            investigationId: conversationId,
            body: {
              status: 'closed',
              dismiss_reason: dismissReason,
              rationale,
              expected_proposal_ids: preview.pending_proposals.map((p) => p.id),
            },
          },
          {
            onSuccess: (result) => {
              setShowCloseModal(false);
              handleSuccess(result.failed_proposal_ids);
              resolve();
            },
            onError: (err) => {
              if (isCloseTargetsChangedError(err)) {
                // Let the container handle 409 — keep modal open.
                reject(err);
              } else {
                setShowCloseModal(false);
                handleError();
                resolve();
              }
            },
          }
        );
      });
    },
    [conversationId, handleError, handleSuccess, setInvestigationStatus]
  );

  const executeCloseEscalation = useCallback(
    ({
      dismissReason,
      rationale,
      preview,
    }: {
      dismissReason?: DismissReason;
      rationale?: string;
      preview: EscalationClosePreviewResponse;
    }): Promise<void> => {
      const allProposalIds = preview.open_investigations.flatMap((inv) =>
        inv.pending_proposals.map((p) => p.id)
      );
      const openInvestigationIds = preview.open_investigations.map((inv) => inv.id);

      return new Promise((resolve, reject) => {
        setEscalationStatus.mutate(
          {
            escalationId: conversationId,
            body: {
              status: 'closed',
              dismiss_reason: dismissReason,
              rationale,
              expected_proposal_ids: allProposalIds,
              expected_investigation_ids: openInvestigationIds,
            },
          },
          {
            onSuccess: (result) => {
              setShowCloseModal(false);
              handleSuccess(result.failed_proposal_ids);
              resolve();
            },
            onError: (err) => {
              if (isCloseTargetsChangedError(err)) {
                // Let the container handle 409 — keep modal open.
                reject(err);
              } else {
                setShowCloseModal(false);
                handleError();
                resolve();
              }
            },
          }
        );
      });
    },
    [conversationId, handleError, handleSuccess, setEscalationStatus]
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
        isLoading={isMutating}
        isDisabled={!canToggle}
        data-test-subj="connectedStatusToggle"
      />

      {/* Modal containers are mounted only when open so every open starts a fresh fetch. */}
      {showCloseModal && templateId === 'investigation' && (
        <InvestigationCloseContainer
          conversationId={conversationId}
          isMutating={isMutating}
          onClose={() => setShowCloseModal(false)}
          onConfirm={executeCloseInvestigation}
        />
      )}

      {showCloseModal && templateId === 'escalation' && (
        <EscalationCloseContainer
          conversationId={conversationId}
          isMutating={isMutating}
          onClose={() => setShowCloseModal(false)}
          onConfirm={executeCloseEscalation}
        />
      )}
    </>
  );
};
