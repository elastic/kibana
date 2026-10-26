/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  type CriteriaWithPagination,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import type { Environment } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { useAppServices } from '../app_services';
import { NamedEntityFlyout } from '../catalog/named_entity_flyout';
import { ConfirmDeleteModal } from '../confirm_delete_modal';
import { deleteButtonLabel, editButtonLabel } from '../labels';
import { useAsyncData } from '../use_async_data';

export const EnvironmentsPage = () => {
  const { api, notifications, canSave } = useAppServices();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [flyout, setFlyout] = useState<'create' | Environment>();
  const [pendingDelete, setPendingDelete] = useState<Environment>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<FeatureFlagsApiError>();
  const load = useCallback(() => api.listEnvironments(page, perPage), [api, page, perPage]);
  const environments = useAsyncData(load);

  const columns: Array<EuiBasicTableColumn<Environment>> = [
    {
      field: 'key',
      name: i18n.translate('xpack.featureFlagsManagement.environments.keyColumnLabel', {
        defaultMessage: 'Key',
      }),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.featureFlagsManagement.environments.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.featureFlagsManagement.environments.descriptionColumnLabel', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'updated_at',
      name: i18n.translate('xpack.featureFlagsManagement.environments.updatedColumnLabel', {
        defaultMessage: 'Updated',
      }),
      render: (updatedAt: Environment['updated_at']) => (
        <FormattedDate value={updatedAt} year="numeric" month="short" day="2-digit" />
      ),
    },
    ...(canSave
      ? [
          {
            name: i18n.translate('xpack.featureFlagsManagement.environments.actionsColumnLabel', {
              defaultMessage: 'Actions',
            }),
            actions: [
              {
                name: editButtonLabel(),
                description: editButtonLabel(),
                icon: 'pencil' as const,
                type: 'icon' as const,
                onClick: (environment: Environment) => setFlyout(environment),
              },
              {
                name: deleteButtonLabel(),
                description: deleteButtonLabel(),
                icon: 'trash' as const,
                type: 'icon' as const,
                color: 'danger' as const,
                onClick: (environment: Environment) => {
                  setDeleteError(undefined);
                  setPendingDelete(environment);
                },
              },
            ],
          } satisfies EuiBasicTableColumn<Environment>,
        ]
      : []),
  ];

  const remove = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteEnvironment(pendingDelete.key, pendingDelete.version);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.environments.deleteSuccessToast', {
          defaultMessage: 'Deleted {key}',
          values: { key: pendingDelete.key },
        })
      );
      setPendingDelete(undefined);
      environments.reload();
    } catch (caught) {
      setDeleteError(toFeatureFlagsApiError(caught));
    } finally {
      setDeleting(false);
    }
  };

  const editingKey = typeof flyout === 'object' ? flyout.key : undefined;
  const editing =
    environments.data?.items.find((item) => item.key === editingKey) ??
    (typeof flyout === 'object' ? flyout : undefined);

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup justifyContent="flexEnd">
        {canSave && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="featureFlagsManagementEnvironmentsPageCreateEnvironmentButton"
              fill
              iconType="plus"
              onClick={() => setFlyout('create')}
            >
              <FormattedMessage
                id="xpack.featureFlagsManagement.environments.createButtonLabel"
                defaultMessage="Create environment"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {environments.error && (
        <>
          <ApiErrorCallout error={environments.error} onReload={environments.reload} />
          <EuiSpacer size="m" />
        </>
      )}
      {deleteError && (
        <>
          <ApiErrorCallout error={deleteError} />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiBasicTable
        items={environments.data?.items ?? []}
        columns={columns}
        itemId="key"
        loading={environments.loading}
        tableCaption={i18n.translate('xpack.featureFlagsManagement.environments.tableCaption', {
          defaultMessage: 'Environments',
        })}
        noItemsMessage={
          environments.loading ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.environments.loadingLabel"
              defaultMessage="Loading environments"
            />
          ) : (
            <FormattedMessage
              id="xpack.featureFlagsManagement.environments.emptyLabel"
              defaultMessage="No environments yet."
            />
          )
        }
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: environments.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<Environment>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
        }}
      />
      {flyout && (
        <NamedEntityFlyout
          entity={editing}
          titleId="featureFlagsEnvironmentFlyoutTitle"
          title={
            editing
              ? i18n.translate('xpack.featureFlagsManagement.environments.editTitle', {
                  defaultMessage: 'Edit {key}',
                  values: { key: editing.key },
                })
              : i18n.translate('xpack.featureFlagsManagement.environments.createTitle', {
                  defaultMessage: 'Create environment',
                })
          }
          keyHelp={i18n.translate('xpack.featureFlagsManagement.environments.keyHelp', {
            defaultMessage:
              'For example, production. Lowercase letters, digits, underscores and hyphens.',
          })}
          onClose={() => setFlyout(undefined)}
          onReload={environments.reload}
          onSave={async (input) => {
            if (editing) {
              await api.updateEnvironment(editing.key, {
                name: input.name,
                description: input.description,
                version: input.version,
              });
            } else {
              await api.createEnvironment({
                key: input.key,
                name: input.name,
                description: input.description,
              });
            }
            notifications.toasts.addSuccess(
              i18n.translate('xpack.featureFlagsManagement.environments.saveSuccessToast', {
                defaultMessage: 'Saved {key}',
                values: { key: input.key },
              })
            );
            setFlyout(undefined);
            environments.reload();
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={i18n.translate('xpack.featureFlagsManagement.environments.deleteTitle', {
            defaultMessage: 'Delete {key}?',
            values: { key: pendingDelete.key },
          })}
          confirming={deleting}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            void remove();
          }}
        >
          <FormattedMessage
            id="xpack.featureFlagsManagement.environments.deleteDescription"
            defaultMessage="Delete this environment and its credentials. This fails while a flag still targets it."
          />
        </ConfirmDeleteModal>
      )}
    </EuiPageTemplate.Section>
  );
};
