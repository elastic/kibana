/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { noAgentPermissionReason, useAgentConnectors } from './use_agent_connectors';
import { deleteNoPermissionTooltip, preconfiguredTooltip } from './sandbox_connectors';
import { ConnectorListItem } from './connector_list_item';

const editNoPermissionTooltip = i18n.translate('xpack.nightshift.connectorList.editNoPermission', {
  defaultMessage: 'You need permission to edit connectors.',
});

const listStyles = css`
  list-style: none;
  margin: 0;
  padding: 0;
`;

export function ConnectorList({
  connectors,
  canOpenDetails,
  onOpenDetails,
  canDelete,
  onDelete,
  'data-test-subj': dataTestSubj,
}: {
  connectors: SandboxConnector[];
  canOpenDetails: boolean;
  onOpenDetails: (connector: SandboxConnector) => void;
  canDelete: boolean;
  onDelete: (connector: SandboxConnector) => void;
  'data-test-subj'?: string;
}): React.ReactElement {
  const { assignedIds, assign, unassign, canEditAgent, isUpdating } = useAgentConnectors();

  return (
    <ul css={listStyles} data-test-subj={dataTestSubj}>
      {connectors.map((connector) => (
        <ConnectorListItem
          key={connector.id}
          connector={connector}
          isAssigned={assignedIds.includes(connector.id)}
          onToggle={(isAssigned) => (isAssigned ? assign(connector) : unassign(connector))}
          isUpdating={isUpdating}
          toggleDisabledReason={canEditAgent ? undefined : noAgentPermissionReason}
          onOpenDetails={() => onOpenDetails(connector)}
          openDetailsDisabledReason={
            connector.is_preconfigured
              ? preconfiguredTooltip
              : canOpenDetails
              ? undefined
              : editNoPermissionTooltip
          }
          onDelete={() => onDelete(connector)}
          deleteDisabledReason={
            connector.is_preconfigured
              ? preconfiguredTooltip
              : !canDelete
              ? deleteNoPermissionTooltip
              : !canEditAgent
              ? noAgentPermissionReason
              : undefined
          }
        />
      ))}
    </ul>
  );
}
