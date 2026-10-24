/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiConfirmModal, EuiText, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useQueryClient } from '@kbn/react-query';
import { NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { INVESTIGATION_AGENT_QUERY_KEY } from './use_agent_connectors';

export function useDeleteConnector(): {
  requestDelete: (connector: SandboxConnector) => void;
  confirmModal: React.ReactElement | null;
} {
  const { agentBuilder, http, notifications } = useKibana().services;
  const queryClient = useQueryClient();
  const refresh = useRefreshSandboxConnectors();
  const [pending, setPending] = useState<SandboxConnector | undefined>();
  const confirmTitleId = useGeneratedHtmlId({ prefix: 'nightshiftDeleteConnector' });

  const deleteConnector = useCallback(async () => {
    if (!pending) return;
    setPending(undefined);
    try {
      await agentBuilder?.agents.removeConnectorFromAgent({
        agentId: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
        connectorId: pending.id,
      });
      await http.delete(`/api/actions/connector/${encodeURIComponent(pending.id)}`);
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: i18n.translate('xpack.nightshift.sandboxConnectors.deleteError', {
          defaultMessage: 'Could not delete connector {name}',
          values: { name: pending.name },
        }),
      });
    } finally {
      refresh();
      void queryClient.invalidateQueries({ queryKey: INVESTIGATION_AGENT_QUERY_KEY });
    }
  }, [agentBuilder, http, notifications.toasts, pending, queryClient, refresh]);

  const confirmModal = pending ? (
    <EuiConfirmModal
      aria-labelledby={confirmTitleId}
      titleProps={{ id: confirmTitleId }}
      title={i18n.translate('xpack.nightshift.sandboxConnectors.deleteConfirmTitle', {
        defaultMessage: 'Delete {name}?',
        values: { name: pending.name },
      })}
      onCancel={() => setPending(undefined)}
      onConfirm={deleteConnector}
      cancelButtonText={i18n.translate('xpack.nightshift.sandboxConnectors.deleteCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('xpack.nightshift.sandboxConnectors.deleteConfirm', {
        defaultMessage: 'Delete',
      })}
      buttonColor="danger"
      data-test-subj="nightshiftDeleteConnectorConfirm"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.nightshift.sandboxConnectors.deleteConfirmBody', {
            defaultMessage:
              'The investigation agent will no longer be able to use it. Rules and workflows that reference this connector will stop working.',
          })}
        </p>
      </EuiText>
    </EuiConfirmModal>
  ) : null;

  return { requestDelete: setPending, confirmModal };
}
