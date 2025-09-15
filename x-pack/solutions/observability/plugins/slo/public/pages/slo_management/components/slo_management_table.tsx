/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Criteria,
  DefaultItemAction,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTableSelectionType,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLODefinitionResponse } from '@kbn/slo-schema';
import React, { useState } from 'react';
import { sloPaths } from '../../../../common';
import { SLO_MODEL_VERSION } from '../../../../common/constants';
import { paths } from '../../../../common/locators/paths';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { useActionModal } from '../../../context/action_modal';
import { useBulkOperation } from '../context/bulk_operation';
import { useUrlSearchState } from '../hooks/use_url_search_state';
import { SloManagementBulkActions } from './slo_management_bulk_actions';
import { SloManagementSearchBar } from './slo_management_search_bar';

export function SloManagementTable() {
  const { state, onStateChange } = useUrlSearchState();
  const { search, page, perPage, tags, includeOutdatedOnly } = state;
  const {
    services: {
      http,
      application: { navigateToUrl },
    },
  } = useKibana();
  const { triggerAction } = useActionModal();

  const { data: permissions } = usePermissions();
  const { isLoading, isError, data, refetch } = useFetchSloDefinitions({
    page: page + 1,
    perPage,
    name: search,
    tags,
    includeOutdatedOnly,
  });
  const { tasks } = useBulkOperation();

  const [selectedItems, setSelectedItems] = useState<SLODefinitionResponse[]>([]);

  const onSelectionChange = (items: SLODefinitionResponse[]) => {
    setSelectedItems(items);
  };

  const selection: EuiTableSelectionType<SLODefinitionResponse> = {
    selected: selectedItems,
    selectable: (item: SLODefinitionResponse) => {
      return !tasks.find(
        (task) => task.status === 'in-progress' && task.items.some((i) => i.id === item.id)
      );
    },
    onSelectionChange,
  };

  const actions: Array<DefaultItemAction<SLODefinitionResponse>> = [
    {
      type: 'icon',
      icon: 'pencil',
      name: i18n.translate('xpack.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      description: i18n.translate('xpack.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      'data-test-subj': 'sloActionsEdit',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => {
        navigateToUrl(http.basePath.prepend(paths.sloEdit(slo.id)));
      },
    },
    {
      type: 'icon',
      icon: 'copy',
      name: i18n.translate('xpack.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      description: i18n.translate('xpack.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      enabled: () => !!permissions?.hasAllWriteRequested,
      'data-test-subj': 'sloActionsClone',
      onClick: (slo: SLODefinitionResponse) => triggerAction({ item: slo, type: 'clone' }),
    },
    {
      type: 'icon',
      icon: (slo: SLODefinitionResponse) => (slo.enabled ? 'stop' : 'play'),
      name: (slo: SLODefinitionResponse) =>
        slo.enabled
          ? i18n.translate('xpack.slo.item.actions.disable', {
              defaultMessage: 'Disable',
            })
          : i18n.translate('xpack.slo.item.actions.enable', {
              defaultMessage: 'Enable',
            }),
      description: (slo: SLODefinitionResponse) =>
        slo.enabled
          ? i18n.translate('xpack.slo.item.actions.disable', {
              defaultMessage: 'Disable',
            })
          : i18n.translate('xpack.slo.item.actions.enable', {
              defaultMessage: 'Enable',
            }),
      'data-test-subj': 'sloActionsManage',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => {
        const isEnabled = slo.enabled;
        triggerAction({ item: slo, type: isEnabled ? 'disable' : 'enable' });
      },
    },
    {
      type: 'icon',
      icon: 'trash',
      name: i18n.translate('xpack.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate('xpack.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      'data-test-subj': 'sloActionsDelete',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => triggerAction({ item: slo, type: 'delete' }),
    },
    {
      type: 'icon',
      icon: 'logstashOutput',
      name: i18n.translate('xpack.slo.item.actions.purge', {
        defaultMessage: 'Purge',
      }),
      description: i18n.translate('xpack.slo.item.actions.purge', {
        defaultMessage: 'Purge',
      }),
      'data-test-subj': 'sloActionsPurge',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => triggerAction({ item: slo, type: 'purge' }),
    },
    {
      type: 'icon',
      icon: 'refresh',
      name: i18n.translate('xpack.slo.item.actions.reset', {
        defaultMessage: 'Reset',
      }),
      description: i18n.translate('xpack.slo.item.actions.reset', {
        defaultMessage: 'Reset',
      }),
      'data-test-subj': 'sloActionsReset',
      enabled: () => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => triggerAction({ item: slo, type: 'reset' }),
    },
  ];

  const columns: Array<EuiBasicTableColumn<SLODefinitionResponse>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.slo.sloManagementTable.columns.nameLabel', {
        defaultMessage: 'Name',
      }),
      render: (_, slo: SLODefinitionResponse) => {
        return (
          <EuiLink
            data-test-subj="sloDetailsLink"
            href={http.basePath.prepend(sloPaths.sloDetails(slo.id, ALL_VALUE))}
            target="_blank"
          >
            {slo.name}
          </EuiLink>
        );
      },
    },
    {
      field: 'version',
      width: '10%',
      name: i18n.translate('xpack.slo.sloManagementTable.columns.versionLabel', {
        defaultMessage: 'Version',
      }),
      render: (value: SLODefinitionResponse['version']) => {
        return value < SLO_MODEL_VERSION ? (
          <EuiText size="s">
            {i18n.translate('xpack.slo.sloManagementTable.version.outdated', {
              defaultMessage: 'Outdated',
            })}
          </EuiText>
        ) : (
          <EuiText size="s">
            {i18n.translate('xpack.slo.sloManagementTable.version.current', {
              defaultMessage: 'Current',
            })}
          </EuiText>
        );
      },
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.slo.sloManagementTable.columns.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      render: (value: SLODefinitionResponse['tags']) => {
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive>
            {value.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'State',
      width: '20%',
      name: i18n.translate('xpack.slo.sloManagementTable.columns.state', {
        defaultMessage: 'State',
      }),
      render: (_: SLODefinitionResponse['enabled'], item: SLODefinitionResponse) => {
        const color = item.enabled ? 'success' : 'danger';
        const label = item.enabled ? 'Running' : 'Paused';
        return <EuiHealth color={color}>{label}</EuiHealth>;
      },
    },
    {
      name: 'Actions',
      width: '10%',
      actions,
    },
  ];

  const onTableChange = ({ page: newPage }: Criteria<SLODefinitionResponse>) => {
    if (newPage) {
      const { index, size } = newPage;
      const newState = {
        ...state,
        page: index,
        perPage: size,
      };
      onStateChange(newState);
    }
  };

  const pagination = {
    pageIndex: page,
    pageSize: perPage,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  return (
    <EuiPanel hasBorder={true}>
      <SloManagementSearchBar onRefresh={refetch} />
      <EuiSpacer size="m" />

      {!selectedItems.length ? (
        <EuiText size="xs">
          {i18n.translate('xpack.slo.sloManagementTable.itemCount', {
            defaultMessage: 'Showing {count} of {total} SLOs',
            values: {
              count: data?.results.length ?? 0,
              total: data?.total ?? 0,
            },
          })}
        </EuiText>
      ) : (
        <SloManagementBulkActions items={selectedItems} setSelectedItems={onSelectionChange} />
      )}

      <EuiSpacer size="s" />
      <EuiBasicTable<SLODefinitionResponse>
        tableCaption={TABLE_CAPTION}
        error={
          isError
            ? i18n.translate('xpack.slo.sloManagementTable.error', {
                defaultMessage: 'An error occurred while retrieving SLO definitions',
              })
            : undefined
        }
        items={data?.results ?? []}
        rowHeader="name"
        columns={columns}
        itemId="id"
        pagination={pagination}
        onChange={onTableChange}
        loading={isLoading}
        selection={permissions?.hasAllWriteRequested ? selection : undefined}
      />
    </EuiPanel>
  );
}

const TABLE_CAPTION = i18n.translate('xpack.slo.sloManagement.tableCaption', {
  defaultMessage: 'SLO Management',
});
