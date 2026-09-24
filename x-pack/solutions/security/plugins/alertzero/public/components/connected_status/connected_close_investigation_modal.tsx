/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
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

/**
 * Connected wrapper for `CloseInvestigationModal` for use in the queue page and flyout footer.
 *
 * Unlike `ConnectedStatusToggle`, this component is stateless — the parent supplies `investigation`
 * and `onClose`. It fetches the close preview, calls the status mutation on confirm, invalidates
 * queries and toasts on completion.
 */
export const ConnectedCloseInvestigationModal: React.FC<CloseInvestigationModalRenderProps> = ({
  investigation,
  onClose,
}) => {
  const { services } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const conversationId = investigation.conversationId ?? investigation.id;

  const preview = useInvestigationClosePreview(conversationId, {
    enabled: Boolean(conversationId),
  });
  const setStatus = useSetInvestigationStatus();

  const handleConfirm = ({
    dismissReason,
    rationale,
  }: {
    dismissReason?: DismissReason;
    rationale?: string;
  }) => {
    setStatus.mutate(
      {
        investigationId: conversationId,
        body: { status: 'closed', dismiss_reason: dismissReason, rationale },
      },
      {
        onSuccess: (result) => {
          void queryClient.invalidateQueries({ queryKey: escalationQueryKeys.all });
          void queryClient.invalidateQueries({ queryKey: platformQueryKeys.proposals.all });
          void queryClient.invalidateQueries({
            queryKey: ['alertzero', 'investigations', 'count'],
          });

          services.notifications?.toasts.addSuccess(i18n.CLOSE_INVESTIGATION_SUCCESS);
          if (result.failed_proposal_ids.length > 0) {
            services.notifications?.toasts.addWarning(i18n.PARTIAL_PROPOSAL_DISMISS_WARNING);
          }
          onClose();
        },
        onError: () => {
          services.notifications?.toasts.addDanger(i18n.STATUS_CHANGE_ERROR);
          onClose();
        },
      }
    );
  };

  if (!preview.data) {
    // Still loading preview — show nothing until ready (avoid flash of empty modal)
    return null;
  }

  return (
    <CloseInvestigationModal
      pendingProposalCount={preview.data.pending_proposal_count}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={setStatus.isLoading}
    />
  );
};
