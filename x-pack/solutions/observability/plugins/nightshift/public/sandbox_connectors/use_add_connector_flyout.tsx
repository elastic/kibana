/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useMemo, useState } from 'react';
import { useKibana } from '../hooks/use_kibana';
import { useRefreshSandboxConnectors } from './use_fetch_sandbox_connectors';
import { useAgentConnectors, type ConnectorRef } from './use_agent_connectors';

export function useAddConnectorFlyout({
  onCreated,
}: {
  onCreated?: (connector: ConnectorRef) => void;
} = {}): {
  isAvailable: boolean;
  openAdd: (typeId: string) => void;
  addFlyout: React.ReactNode;
} {
  const { triggersActionsUi } = useKibana().services;
  const { assign } = useAgentConnectors();
  const refresh = useRefreshSandboxConnectors();
  const [typeId, setTypeId] = useState<string | undefined>();

  const addFlyout = useMemo(() => {
    if (!typeId || !triggersActionsUi) return null;
    return triggersActionsUi.getAddConnectorFlyout({
      initialConnector: { actionTypeId: typeId },
      onClose: () => setTypeId(undefined),
      onConnectorCreated: (connector) => {
        assign(connector);
        refresh();
        onCreated?.(connector);
      },
    });
  }, [assign, onCreated, refresh, triggersActionsUi, typeId]);

  return { isAvailable: triggersActionsUi != null, openAdd: setTypeId, addFlyout };
}
