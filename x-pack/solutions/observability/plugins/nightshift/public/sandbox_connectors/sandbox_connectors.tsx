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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { useKibana } from '../hooks/use_kibana';
import {
  useFetchSandboxConnectors,
  useRefreshSandboxConnectors,
} from './use_fetch_sandbox_connectors';
import { SandboxConnectorsError } from './sandbox_connectors_error';

const CONNECTORS_MANAGEMENT_PATH = '/insightsAndAlerting/triggersActionsConnectors';

/** Link to the Stack Management connectors page, for users allowed to see connectors. */
export function ManageConnectorsLink(): React.ReactElement | null {
  const { application } = useKibana().services;
  if (!application.capabilities.actions?.show) return null;
  return (
    <EuiLink
      href={application.getUrlForApp('management', { path: CONNECTORS_MANAGEMENT_PATH })}
      data-test-subj="nightshiftManageConnectorsLink"
    >
      {i18n.translate('xpack.nightshift.sandboxConnectors.manageLink', {
        defaultMessage: 'Manage connectors',
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

const useConnectorTypeColumn = (): EuiBasicTableColumn<SandboxConnector> => {
  const registry = useKibana().services.triggersActionsUi?.actionTypeRegistry;
  return useMemo(
    () => ({
      field: 'connector_type_id',
      name: i18n.translate('xpack.nightshift.sandboxConnectors.typeColumn', {
        defaultMessage: 'Type',
      }),
      width: '30%',
      render: (typeId: string) => {
        const model = registry?.has(typeId) ? registry.get(typeId) : undefined;
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {model?.iconClass && (
              <EuiFlexItem grow={false}>
                <EuiIcon type={model.iconClass} size="m" aria-hidden={true} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>{model?.actionTypeTitle ?? typeId}</EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    }),
    [registry]
  );
};

export function SandboxConnectorsTable(): React.ReactElement | null {
  const { data, error, isLoading, refetch } = useFetchSandboxConnectors();
  const typeColumn = useConnectorTypeColumn();
  const columns = useMemo(
    (): Array<EuiBasicTableColumn<SandboxConnector>> => [
      {
        field: 'name',
        name: i18n.translate('xpack.nightshift.sandboxConnectors.nameColumn', {
          defaultMessage: 'Name',
        }),
        render: (name: string, connector) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>{name}</EuiFlexItem>
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
        ),
      },
      typeColumn,
    ],
    [typeColumn]
  );

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
    <EuiBasicTable
      items={data.connectors}
      columns={columns}
      rowHeader="name"
      tableCaption={i18n.translate('xpack.nightshift.sandboxConnectors.tableCaption', {
        defaultMessage: 'Sandbox connectors',
      })}
      data-test-subj="nightshiftSandboxConnectorsTable"
    />
  );
}
