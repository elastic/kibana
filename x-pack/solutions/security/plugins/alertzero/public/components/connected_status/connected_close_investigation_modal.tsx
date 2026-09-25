/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { isHttpFetchError } from '@kbn/core-http-browser';
import {
  useSetInvestigationStatus,
  useInvestigationClosePreview,
  escalationQueryKeys,
} from '@kbn/agentic-investigations-plugin/public';
import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';
import type { DismissReason } from '@kbn/proposals-common';
import type { CloseInvestigationModalRenderProps } from '@kbn/agentic-investigations-common';
import { CloseInvestigationModal } from '../close_confirmation/close_investigation_modal';
import * as i18n from '../close_confirmation/translations';

/** Returns true when a fetch error carries our `close_targets_changed` code. */
const isCloseTargetsChangedError = (error: unknown): boolean => {
  if (!isHttpFetchError(error)) return false;
  const body = error.body as { attributes?: { code?: string } } | undefined;
  return body?.attributes?.code === 'close_targets_changed';
};

/**
 * Connected wrapper for `CloseInvestigationModal` for use in the queue page and flyout footer.
 *
 * Unlike `ConnectedStatusToggle`, this component is stateless — the parent supplies `investigation`
 * and `onClose`. It fetches the close preview, calls the status mutation on confirm, invalidates
 * queries and toasts on completion.
 *
 * The preview is always fresh (staleTime: 0, refetchInterval: 10 000) and the modal shows a
 * spinner while the first fetch is in-flight. On a 409 (proposals changed), the modal stays
 * open and shows a callout prompting the user to review and confirm again.
 */
export const ConnectedCloseInvestigationModal: React.FC<CloseInvestigationModalRenderProps> = ({
  investigation,
  onClose,
}) => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const conversationId = investigation.conversationId ?? investigation.id;

  const [targetsChanged, setTargetsChanged] = useState(false);
  const [closeError, setCloseError] = useState<{
    kind: 'dismiss_failed';
    count: number;
  } | null>(null);

  /** Determines whether an error body carries the `proposal_dismiss_failed` code. */
  const isProposalDismissFailedError = (error: unknown): boolean => {
    if (!isHttpFetchError(error)) return false;
    const body = error.body as { attributes?: { code?: string } } | undefined;
    return body?.attributes?.code === 'proposal_dismiss_failed';
  };

  const preview = useInvestigationClosePreview(conversationId, {
    enabled: Boolean(conversationId),
  });
  const setStatus = useSetInvestigationStatus();

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
    void queryClient.invalidateQueries({ queryKey: ['alertzero', 'investigations', 'count'] });
  }, [queryClient]);

  const handleConfirm = useCallback(
    ({ dismissReason, rationale }: { dismissReason?: DismissReason; rationale?: string }) => {
      setStatus.mutate(
        {
          investigationId: conversationId,
          body: {
            status: 'closed',
            dismiss_reason: dismissReason,
            rationale,
            expected_proposal_ids: preview.data?.pending_proposals.map((p) => p.id),
          },
        },
        {
          onSuccess: (result) => {
            invalidateAll();
            services.notifications?.toasts.addSuccess(i18n.CLOSE_INVESTIGATION_SUCCESS);
            if (result.failed_proposal_ids.length > 0) {
              services.notifications?.toasts.addWarning(i18n.PARTIAL_PROPOSAL_DISMISS_WARNING);
            }
            onClose();
          },
          onError: (err) => {
            if (isCloseTargetsChangedError(err)) {
              // Keep the modal open, show the changed-callout and refresh the list.
              setTargetsChanged(true);
              void preview.refetch();
            } else if (isProposalDismissFailedError(err)) {
              const ids =
                (err as unknown as { body?: { attributes?: { failed_proposal_ids?: string[] } } })
                  .body?.attributes?.failed_proposal_ids ?? [];
              setCloseError({ kind: 'dismiss_failed', count: ids.length });
              void preview.refetch();
            } else {
              services.notifications?.toasts.addDanger(i18n.STATUS_CHANGE_ERROR);
              onClose();
            }
          },
        }
      );
    },
    [conversationId, invalidateAll, onClose, preview, services, setStatus]
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
      isLoading={setStatus.isLoading}
    />
  );
};
