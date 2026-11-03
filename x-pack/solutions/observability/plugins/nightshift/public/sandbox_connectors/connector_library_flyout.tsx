/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { ConnectorLibraryPanel } from '@kbn/agent-builder-plugin/public';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectors } from './use_fetch_sandbox_connectors';
import { useAgentConnectors } from './use_agent_connectors';

export function ConnectorLibraryFlyout({ onClose }: { onClose: () => void }): React.ReactElement {
  const { triggersActionsUi } = useKibana().services;
  const { data } = useFetchSandboxConnectors();
  const { assignedIds, assign, unassign } = useAgentConnectors();

  const connectors = useMemo(
    () =>
      (data?.connectors ?? []).map(({ id, name, connector_type_id: actionTypeId }) => ({
        id,
        name,
        actionTypeId,
      })),
    [data]
  );
  const activeConnectorIdSet = useMemo(() => new Set(assignedIds), [assignedIds]);

  return (
    <ConnectorLibraryPanel
      onClose={onClose}
      allConnectors={connectors}
      activeConnectorIdSet={activeConnectorIdSet}
      onToggle={(connector, isActive) => (isActive ? assign(connector) : unassign(connector))}
      actionTypeRegistry={triggersActionsUi?.actionTypeRegistry}
    />
  );
}
