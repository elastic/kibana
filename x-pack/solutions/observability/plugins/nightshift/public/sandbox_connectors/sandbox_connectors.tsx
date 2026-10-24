/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
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
import { KbnInfoCallout } from '@kbn/ui-callout';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { isHttpNotFoundError } from '../common/http_error';
import { useKibana } from '../hooks/use_kibana';
import { useFetchSandboxConnectors } from './use_fetch_sandbox_connectors';
import { noAgentPermissionReason, useAgentConnectors } from './use_agent_connectors';
import { useDeleteConnector } from './use_delete_connector';
import { useEditConnector } from './use_edit_connector';
import { SandboxConnectorsError } from './sandbox_connectors_error';

export const preconfiguredTooltip = i18n.translate(
  'xpack.nightshift.sandboxConnectors.preconfigured',
  { defaultMessage: 'This connector is configured in kibana.yml and cannot be changed here.' }
);

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
 * The connectors assigned to the investigation agent, one row each: name opening the connector,
 * its type, and the actions Remove (from the agent) and Delete (the connector).
 */
export function SandboxConnectorsTable(): React.ReactElement | null {
  const { application, triggersActionsUi } = useKibana().services;
  const registry = triggersActionsUi?.actionTypeRegistry;
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const agent = useAgentConnectors();
  const { canEdit, openEdit, editFlyout } = useEditConnector();
  const { requestDelete, confirmModal } = useDeleteConnector();
  const canDelete = application.capabilities.actions?.delete === true;
  const { canEditAgent, unassign, isUpdating } = agent;

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
        width: '34%',
        render: (typeId: string) => modelOf(typeId)?.actionTypeTitle ?? typeId,
      },
      {
        name: i18n.translate('xpack.nightshift.sandboxConnectors.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '16%',
        render: (connector: SandboxConnector) => {
          const removeLabel = i18n.translate('xpack.nightshift.sandboxConnectors.removeAction', {
            defaultMessage: 'Remove {name} from the investigation agent',
            values: { name: connector.name },
          });
          const deleteLabel = i18n.translate('xpack.nightshift.sandboxConnectors.deleteAction', {
            defaultMessage: 'Delete {name}',
            values: { name: connector.name },
          });
          const deleteDisabledReason = connector.is_preconfigured
            ? preconfiguredTooltip
            : !canDelete
            ? i18n.translate('xpack.nightshift.sandboxConnectors.deleteNoPermission', {
                defaultMessage: 'You need permission to delete connectors.',
              })
            : !canEditAgent
            ? noAgentPermissionReason
            : undefined;
          return (
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={canEditAgent ? removeLabel : noAgentPermissionReason}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="minusCircle"
                    aria-label={removeLabel}
                    isDisabled={!canEditAgent || isUpdating}
                    onClick={() => unassign(connector)}
                    data-test-subj={`nightshiftConnectorRemove-${connector.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={deleteDisabledReason ?? deleteLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={deleteLabel}
                    isDisabled={deleteDisabledReason !== undefined}
                    onClick={() => requestDelete(connector)}
                    data-test-subj={`nightshiftConnectorDelete-${connector.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
  }, [canDelete, canEdit, canEditAgent, isUpdating, openEdit, registry, requestDelete, unassign]);

  if (isLoading || agent.isLoading) return <EuiLoadingSpinner size="m" />;
  if (agent.error && isHttpNotFoundError(agent.error)) {
    return (
      <KbnInfoCallout
        announceOnMount
        size="s"
        title={i18n.translate('xpack.nightshift.sandboxConnectors.notEnabledTitle', {
          defaultMessage: 'Elastic Nightshift is not enabled in this space yet.',
        })}
        data-test-subj="nightshiftSandboxConnectorsNotEnabled"
      >
        <EuiLink
          href={application.getUrlForApp(NIGHTSHIFT_APP_ID, { path: '/?onboarding=1' })}
          data-test-subj="nightshiftSandboxConnectorsEnableLink"
        >
          {i18n.translate('xpack.nightshift.sandboxConnectors.notEnabledLink', {
            defaultMessage: 'Enable it from the Nightshift onboarding to connect tools.',
          })}
        </EuiLink>
      </KbnInfoCallout>
    );
  }
  if (error || agent.error) {
    return (
      <SandboxConnectorsError
        onRetry={() => {
          if (error) void refetch();
          if (agent.error) agent.refetch();
        }}
      />
    );
  }
  if (!data) return null;
  const assigned = data.connectors.filter(({ id }) => agent.assignedIds.includes(id));
  if (assigned.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="nightshiftSandboxConnectorsEmpty">
        <p>
          {i18n.translate('xpack.nightshift.sandboxConnectors.empty', {
            defaultMessage:
              'No connectors yet. Create one or add an existing connector, and the investigation agent can use it from its sandbox.',
          })}
        </p>
      </EuiText>
    );
  }
  return (
    <>
      <EuiBasicTable
        items={assigned}
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
