/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/alerts-ui-shared';
import { fetchConnector } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';

export function useEditConnector(): {
  canEdit: boolean;
  openEdit: (connector: SandboxConnector) => Promise<void>;
  editFlyout: React.ReactElement | null;
} {
  const { application, http, notifications, triggersActionsUi } = useKibana().services;
  const refresh = useRefreshSandboxConnectors();
  const [editing, setEditing] = useState<ActionConnector | undefined>();
  const canEdit = Boolean(triggersActionsUi) && application.capabilities.actions?.save === true;

  const openEdit = useCallback(
    async (connector: SandboxConnector) => {
      try {
        setEditing(await fetchConnector(connector.id, { http }));
      } catch (err) {
        notifications.toasts.addError(err as Error, {
          title: i18n.translate('xpack.nightshift.sandboxConnectors.editLoadError', {
            defaultMessage: 'Could not load connector {name}',
            values: { name: connector.name },
          }),
        });
      }
    },
    [http, notifications.toasts]
  );

  const editFlyout = useMemo(() => {
    if (!editing || !triggersActionsUi) return null;
    return triggersActionsUi.getEditConnectorFlyout({
      connector: editing,
      onClose: () => setEditing(undefined),
      onConnectorUpdated: () => {
        refresh();
        setEditing(undefined);
      },
    });
  }, [editing, refresh, triggersActionsUi]);

  return { canEdit, openEdit, editFlyout };
}
