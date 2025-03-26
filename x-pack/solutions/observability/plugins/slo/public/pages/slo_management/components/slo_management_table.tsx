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
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ALL_VALUE, SLODefinitionResponse } from '@kbn/slo-schema';
import { useFetchSloDefinitions } from '../../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../../hooks/use_kibana';
import { usePermissions } from '../../../hooks/use_permissions';
import { useResetSlo } from '../../../hooks/use_reset_slo';
import { useEnableSlo } from '../../../hooks/use_enable_slo';
import { useDisableSlo } from '../../../hooks/use_disable_slo';
import { useCloneSlo } from '../../../hooks/use_clone_slo';
import { sloPaths } from '../../../../common';
import { paths } from '../../../../common/locators/paths';
import { SloManagementSearchBar } from './slo_management_search_bar';
import { SloDeleteModal } from '../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloResetConfirmationModal } from '../../../components/slo/reset_confirmation_modal/slo_reset_confirmation_modal';
import { SloEnableConfirmationModal } from '../../../components/slo/enable_confirmation_modal/slo_enable_confirmation_modal';
import { SloDisableConfirmationModal } from '../../../components/slo/disable_confirmation_modal/slo_disable_confirmation_modal';
import { SLO_MODEL_VERSION } from '../../../../common/constants';

interface SearchFilters {
  search: string;
  tags: string[];
}

export function SloManagementTable() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    tags: [],
  });
  const { services } = useKibana();

  const {
    http,
    application: { navigateToUrl },
  } = services;

  const { isLoading, isError, data, refetch } = useFetchSloDefinitions({
    name: filters.search,
    page: pageIndex + 1,
    perPage: pageSize,
    tags: filters.tags,
  });

  const { data: permissions } = usePermissions();

  const [sloToDelete, setSloToDelete] = useState<SLODefinitionResponse | undefined>(undefined);
  const [sloToReset, setSloToReset] = useState<SLODefinitionResponse | undefined>(undefined);
  const [sloToEnable, setSloToEnable] = useState<SLODefinitionResponse | undefined>(undefined);
  const [sloToDisable, setSloToDisable] = useState<SLODefinitionResponse | undefined>(undefined);

  const { mutate: resetSlo, isLoading: isResetLoading } = useResetSlo();
  const { mutate: enableSlo, isLoading: isEnableLoading } = useEnableSlo();
  const { mutate: disableSlo, isLoading: isDisableLoading } = useDisableSlo();

  const handleDeleteConfirm = () => {
    setSloToDelete(undefined);
  };

  const handleDeleteCancel = () => {
    setSloToDelete(undefined);
  };

  const handleResetConfirm = () => {
    if (sloToReset) {
      resetSlo({ id: sloToReset.id, name: sloToReset.name });
      setSloToReset(undefined);
    }
  };

  const handleResetCancel = () => {
    setSloToReset(undefined);
  };

  const handleEnableConfirm = async () => {
    if (sloToEnable) {
      enableSlo({ id: sloToEnable.id, name: sloToEnable.name });
      setSloToEnable(undefined);
    }
  };

  const handleEnableCancel = () => {
    setSloToEnable(undefined);
  };

  const handleDisableConfirm = async () => {
    if (sloToDisable) {
      disableSlo({ id: sloToDisable.id, name: sloToDisable.name });
      setSloToDisable(undefined);
    }
  };

  const handleDisableCancel = () => {
    setSloToDisable(undefined);
  };

  const navigateToClone = useCloneSlo();

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
      'data-test-subj': 'sloActionsClone',
      onClick: (slo: SLODefinitionResponse) => {
        navigateToClone(slo);
      },
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

        if (isEnabled) {
          setSloToDisable(slo);
        } else {
          setSloToEnable(slo);
        }
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
      enabled: (slo: SLODefinitionResponse) => !!permissions?.hasAllWriteRequested,
      onClick: (slo: SLODefinitionResponse) => {
        setSloToDelete(slo);
      },
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
      onClick: (slo: SLODefinitionResponse) => {
        setSloToReset(slo);
      },
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
      render: (item: SLODefinitionResponse['version']) => {
        return item < SLO_MODEL_VERSION ? (
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
      render: (item: SLODefinitionResponse['tags']) => {
        return (
          <EuiFlexGroup gutterSize="xs" wrap responsive>
            {item.map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: 'Actions',
      width: '5%',
      actions,
    },
  ];

  const onTableChange = ({ page }: Criteria<SLODefinitionResponse>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  return (
    <>
      <EuiPanel hasBorder={true}>
        <SloManagementSearchBar filters={filters} setFilters={setFilters} onRefresh={refetch} />
        <EuiSpacer size="m" />
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
          pagination={pagination}
          onChange={onTableChange}
          loading={isLoading}
        />
      </EuiPanel>
      {sloToDelete ? (
        <SloDeleteModal
          slo={sloToDelete}
          onCancel={handleDeleteCancel}
          onSuccess={handleDeleteConfirm}
        />
      ) : null}

      {sloToReset ? (
        <SloResetConfirmationModal
          slo={sloToReset}
          onCancel={handleResetCancel}
          onConfirm={handleResetConfirm}
          isLoading={isResetLoading}
        />
      ) : null}

      {sloToEnable ? (
        <SloEnableConfirmationModal
          slo={sloToEnable}
          onCancel={handleEnableCancel}
          onConfirm={handleEnableConfirm}
          isLoading={isEnableLoading}
        />
      ) : null}

      {sloToDisable ? (
        <SloDisableConfirmationModal
          slo={sloToDisable}
          onCancel={handleDisableCancel}
          onConfirm={handleDisableConfirm}
          isLoading={isDisableLoading}
        />
      ) : null}
    </>
  );
}

const TABLE_CAPTION = i18n.translate('xpack.slo.sloManagement.tableCaption', {
  defaultMessage: 'SLO Management',
});
