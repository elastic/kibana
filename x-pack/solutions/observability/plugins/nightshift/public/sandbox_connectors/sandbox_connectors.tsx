/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import {
  useFetchSandboxConnectors,
  useRefreshSandboxConnectors,
} from './use_fetch_sandbox_connectors';
import { useDeleteConnector } from './use_delete_connector';
import { useEditConnector } from './use_edit_connector';
import { SandboxConnectorsError } from './sandbox_connectors_error';

const preconfiguredTooltip = i18n.translate('xpack.nightshift.sandboxConnectors.preconfigured', {
  defaultMessage: 'This connector is configured in kibana.yml and cannot be changed here.',
});

const CONNECTORS_MANAGEMENT_PATH = '/insightsAndAlerting/triggersActionsConnectors';

/** Link to the Stack Management connectors page, for users allowed to see connectors. */
export function ManageConnectorsLink(): React.ReactElement | null {
  const { application } = useKibana().services;
  if (!application.capabilities.actions?.show) return null;
  return (
    <EuiLink
      href={application.getUrlForApp('management', { path: CONNECTORS_MANAGEMENT_PATH })}
      external
      target="_blank"
      data-test-subj="nightshiftManageConnectorsLink"
    >
      {i18n.translate('xpack.nightshift.sandboxConnectors.manageLink', {
        defaultMessage: 'Open in Stack Management',
      })}
    </EuiLink>
  );
}

/**
 * Opens the standard connector flyout. A connector created here is on the investigation agent's
 * allow-list on its next run, with no assignment step, so the list refreshes on close. Hidden
 * when the user cannot create connectors or the flyout is not available.
 */
export function CreateConnectorButton({
  fill = false,
}: {
  fill?: boolean;
}): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const refresh = useRefreshSandboxConnectors();
  const [isOpen, setIsOpen] = useState(false);
  const flyout = useMemo(
    () =>
      triggersActionsUi?.getAddConnectorFlyout({
        onClose: () => {
          setIsOpen(false);
          refresh();
        },
      }),
    [refresh, triggersActionsUi]
  );
  if (!flyout || !application.capabilities.actions?.save) return null;
  return (
    <>
      <EuiButton
        size="s"
        fill={fill}
        iconType="plus"
        onClick={() => setIsOpen(true)}
        data-test-subj="nightshiftCreateConnectorButton"
      >
        {i18n.translate('xpack.nightshift.sandboxConnectors.createButton', {
          defaultMessage: 'Create connector',
        })}
      </EuiButton>
      {isOpen && flyout}
    </>
  );
}

/** The connectors the agent can use, one row each: name opening the connector, its type, Delete. */
export function SandboxConnectorsTable(): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const registry = triggersActionsUi?.actionTypeRegistry;
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const { canEdit, openEdit, editFlyout } = useEditConnector();
  const { requestDelete, confirmModal } = useDeleteConnector();
  const canDelete = application.capabilities.actions?.delete === true;

  const columns = useMemo((): Array<EuiBasicTableColumn<SandboxConnector>> => {
    const modelOf = (typeId: string) => (registry?.has(typeId) ? registry.get(typeId) : undefined);
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.nightshift.sandboxConnectors.nameColumn', {
          defaultMessage: 'Name',
        }),
        width: '50%',
        render: (name: string, connector) => {
          const model = modelOf(connector.connector_type_id);
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={model?.iconClass ?? 'plugs'} size="m" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {canEdit ? (
                  <EuiLink
                    onClick={() => openEdit(connector)}
                    data-test-subj={`nightshiftConnectorName-${connector.id}`}
                  >
                    {name}
                  </EuiLink>
                ) : (
                  name
                )}
              </EuiFlexItem>
              {connector.is_preconfigured && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.nightshift.sandboxConnectors.preconfiguredBadge', {
                      defaultMessage: 'Preconfigured',
                    })}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'connector_type_id',
        name: i18n.translate('xpack.nightshift.sandboxConnectors.typeColumn', {
          defaultMessage: 'Type',
        }),
        render: (typeId: string) => modelOf(typeId)?.actionTypeTitle ?? typeId,
      },
      {
        name: i18n.translate('xpack.nightshift.sandboxConnectors.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '96px',
        align: 'right',
        render: (connector: SandboxConnector) => {
          const deleteLabel = i18n.translate('xpack.nightshift.sandboxConnectors.deleteAction', {
            defaultMessage: 'Delete {name}',
            values: { name: connector.name },
          });
          const disabledReason = connector.is_preconfigured
            ? preconfiguredTooltip
            : canDelete
            ? undefined
            : i18n.translate('xpack.nightshift.sandboxConnectors.deleteNoPermission', {
                defaultMessage: 'You need permission to delete connectors.',
              });
          return (
            <EuiToolTip content={disabledReason ?? deleteLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                aria-label={deleteLabel}
                isDisabled={disabledReason !== undefined}
                onClick={() => requestDelete(connector)}
                data-test-subj={`nightshiftConnectorDelete-${connector.id}`}
              />
            </EuiToolTip>
          );
        },
      },
    ];
  }, [canDelete, canEdit, openEdit, registry, requestDelete]);

  if (isLoading) return <EuiLoadingSpinner size="m" />;
  if (error) return <SandboxConnectorsError onRetry={() => refetch()} />;
  if (!data) return null;
  if (data.connectors.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="nightshiftSandboxConnectorsEmpty">
        <p>
          {i18n.translate('xpack.nightshift.sandboxConnectors.empty', {
            defaultMessage:
              'No connectors yet. Create one and the investigation agent can use it from its sandbox.',
          })}
        </p>
      </EuiText>
    );
  }
  return (
    <>
      <EuiBasicTable
        items={data.connectors}
        columns={columns}
        rowHeader="name"
        tableLayout="fixed"
        tableCaption={i18n.translate('xpack.nightshift.sandboxConnectors.tableCaption', {
          defaultMessage: 'Sandbox connectors',
        })}
        data-test-subj="nightshiftSandboxConnectorsTable"
      />
      {editFlyout}
      {confirmModal}
    </>
  );
}
