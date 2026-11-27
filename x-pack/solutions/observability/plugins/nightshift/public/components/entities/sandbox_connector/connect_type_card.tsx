/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { checkActionTypeEnabled } from '@kbn/alerts-ui-shared/src/check_action_type_enabled';
import { NIGHTSHIFT_EBT_ACTIONS } from '../../../common/ebt_constants';
import { useKibana } from '../../../hooks/use_kibana';
import type { ConnectorTypeGroup } from '../../../data/sandbox_connectors/use_connectors_by_type';
import { useAgentConnectors } from '../../../data/sandbox_connectors/use_agent_connectors';
import { useAddConnectorFlyout } from './use_add_connector_flyout';
import { useEditConnector } from './use_edit_connector';
import { useDeleteConnector } from './use_delete_connector';
import { getSourceCardItem } from './source_card_item';
import { SourceCard } from './source_card';
import { ConnectorCountBadge } from './connector_count_badge';
import { ConnectPopover } from './connect_popover';

const noPermissionReason = i18n.translate('xpack.nightshift.connectSources.noPermission', {
  defaultMessage: 'You need permission to create connectors and to edit the investigation agent.',
});

const connectLabel = i18n.translate('xpack.nightshift.connectSources.connectButton', {
  defaultMessage: 'Connect',
});

export function ConnectTypeCard({
  group: { actionType, connectors, assignedCount },
  ebtElement,
}: {
  group: ConnectorTypeGroup;
  ebtElement: string;
}): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const { canEditAgent } = useAgentConnectors();
  const { openAdd, addFlyout } = useAddConnectorFlyout();
  const { canEdit, openEdit, editFlyout } = useEditConnector();
  const { requestDelete, confirmModal } = useDeleteConnector(ebtElement);

  if (!triggersActionsUi) return null;
  const item = getSourceCardItem({
    actionType,
    actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
  });
  const enabledCheck = checkActionTypeEnabled(actionType);
  const canCreate = application.capabilities.actions?.save === true && canEditAgent;
  const createDisabledReason = !canCreate
    ? noPermissionReason
    : enabledCheck.isEnabled
    ? undefined
    : enabledCheck.message;
  const hasConnectors = connectors.length > 0;

  return (
    <>
      <SourceCard
        icon={item.iconClass}
        title={item.name}
        description={item.description}
        badge={
          <ConnectorCountBadge
            count={assignedCount}
            data-test-subj={`${actionType.id}-connectorCount`}
          />
        }
        data-test-subj={`${actionType.id}-card`}
        action={
          hasConnectors
            ? undefined
            : {
                label: connectLabel,
                icon: 'plugs',
                disabledReason: createDisabledReason,
                onClick: () => openAdd(actionType),
                'data-test-subj': `${actionType.id}-connect`,
                ebt: {
                  action: NIGHTSHIFT_EBT_ACTIONS.OPEN_ADD_SANDBOX_CONNECTOR,
                  element: ebtElement,
                  detail: actionType.id,
                },
              }
        }
        actionNode={
          hasConnectors ? (
            <ConnectPopover
              typeId={actionType.id}
              typeName={item.name}
              connectors={connectors}
              canOpenDetails={canEdit}
              onOpenDetails={openEdit}
              canDelete={application.capabilities.actions?.delete === true}
              onDelete={requestDelete}
              createDisabledReason={createDisabledReason}
              onCreate={() => openAdd(actionType)}
              ebtElement={ebtElement}
            />
          ) : undefined
        }
      />
      {addFlyout}
      {editFlyout}
      {confirmModal}
    </>
  );
}
