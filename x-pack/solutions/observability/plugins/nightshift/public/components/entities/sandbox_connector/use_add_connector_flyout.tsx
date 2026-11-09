/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useMemo, useState } from 'react';
import type { ActionType } from '@kbn/actions-types';
import { useKibana } from '../../../hooks/use_kibana';
import { useRefreshSandboxConnectors } from '../../../data/sandbox_connectors/use_fetch_sandbox_connectors';
import {
  useAgentConnectors,
  type ConnectorRef,
} from '../../../data/sandbox_connectors/use_agent_connectors';
import { getInitialSandboxConnector } from './initial_sandbox_connector';

export function useAddConnectorFlyout({
  onCreated,
}: {
  onCreated?: (connector: ConnectorRef) => void;
} = {}): {
  isAvailable: boolean;
  openAdd: (actionType: ActionType) => void;
  addFlyout: React.ReactNode;
} {
  const { triggersActionsUi } = useKibana().services;
  const { assign } = useAgentConnectors();
  const refresh = useRefreshSandboxConnectors();
  const [addingType, setAddingType] = useState<ActionType | undefined>();

  const addFlyout = useMemo(() => {
    if (!addingType || !triggersActionsUi) return null;
    return triggersActionsUi.getAddConnectorFlyout({
      initialConnector: getInitialSandboxConnector(addingType),
      onClose: () => setAddingType(undefined),
      onConnectorCreated: (connector) => {
        assign(connector);
        refresh();
        onCreated?.(connector);
      },
    });
  }, [assign, onCreated, refresh, triggersActionsUi, addingType]);

  return { isAvailable: triggersActionsUi != null, openAdd: setAddingType, addFlyout };
}
