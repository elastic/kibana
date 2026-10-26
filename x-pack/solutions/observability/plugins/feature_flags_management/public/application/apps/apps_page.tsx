/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiBasicTable,
  type CriteriaWithPagination,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import type { App } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { useAppServices } from '../app_services';
import { NamedEntityFlyout } from '../catalog/named_entity_flyout';
import { ConfirmDeleteModal } from '../confirm_delete_modal';
import { deleteButtonLabel, editButtonLabel } from '../labels';
import { paths } from '../paths';
import { useAsyncData } from '../use_async_data';
import { CredentialsPanel } from './credentials_panel';

export const AppsPage = () => {
  const history = useHistory();
  const { appKey } = useParams<{ appKey?: string }>();
  const { api, notifications, canSave } = useAppServices();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [flyout, setFlyout] = useState<'create' | App>();
  const [pendingDelete, setPendingDelete] = useState<App>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<FeatureFlagsApiError>();
  const load = useCallback(() => api.listApps(page, perPage), [api, page, perPage]);
  const apps = useAsyncData(load);
  const loadSelected = useCallback(() => {
    if (!appKey) {
      return Promise.resolve(undefined);
    }
    return api.getApp(appKey);
  }, [api, appKey]);
  const selected = useAsyncData(loadSelected);
  const editingKey = typeof flyout === 'object' ? flyout.key : undefined;
  const editing =
    apps.data?.items.find((item) => item.key === editingKey) ??
    (typeof flyout === 'object' ? flyout : undefined);

  const columns: Array<EuiBasicTableColumn<App>> = [
    {
      field: 'key',
      name: i18n.translate('xpack.featureFlagsManagement.apps.keyColumnLabel', {
        defaultMessage: 'Key',
      }),
      render: (key: App['key']) => (
        <EuiLink
          data-ebt-action="viewApp"
          data-ebt-element="featureFlagsManagement"
          data-test-subj="featureFlagsManagementColumnsLink"
          href={history.createHref({ pathname: paths.app(key) })}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            history.push(paths.app(key));
          }}
        >
          {key}
        </EuiLink>
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.featureFlagsManagement.apps.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.featureFlagsManagement.apps.descriptionColumnLabel', {
        defaultMessage: 'Description',
      }),
    },
    {
      field: 'updated_at',
      name: i18n.translate('xpack.featureFlagsManagement.apps.updatedColumnLabel', {
        defaultMessage: 'Updated',
      }),
      render: (updatedAt: App['updated_at']) => (
        <FormattedDate value={updatedAt} year="numeric" month="short" day="2-digit" />
      ),
    },
    ...(canSave
      ? [
          {
            name: i18n.translate('xpack.featureFlagsManagement.apps.actionsColumnLabel', {
              defaultMessage: 'Actions',
            }),
            actions: [
              {
                name: editButtonLabel(),
                description: editButtonLabel(),
                icon: 'pencil' as const,
                type: 'icon' as const,
                onClick: (app: App) => setFlyout(app),
              },
              {
                name: deleteButtonLabel(),
                description: deleteButtonLabel(),
                icon: 'trash' as const,
                type: 'icon' as const,
                color: 'danger' as const,
                onClick: (app: App) => {
                  setDeleteError(undefined);
                  setPendingDelete(app);
                },
              },
            ],
          } satisfies EuiBasicTableColumn<App>,
        ]
      : []),
  ];

  const remove = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteApp(pendingDelete.key, pendingDelete.version);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.apps.deleteSuccessToast', {
          defaultMessage: 'Deleted {key}',
          values: { key: pendingDelete.key },
        })
      );
      if (appKey === pendingDelete.key) {
        history.push(paths.apps);
      }
      setPendingDelete(undefined);
      apps.reload();
    } catch (caught) {
      setDeleteError(toFeatureFlagsApiError(caught));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup justifyContent="flexEnd">
        {canSave && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-ebt-action="createApp"
              data-ebt-element="featureFlagsManagement"
              data-test-subj="featureFlagsManagementAppsPageCreateAppButton"
              fill
              iconType="plus"
              onClick={() => setFlyout('create')}
            >
              <FormattedMessage
                id="xpack.featureFlagsManagement.apps.createButtonLabel"
                defaultMessage="Create app"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {apps.error && (
        <>
          <ApiErrorCallout error={apps.error} onReload={apps.reload} />
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
        items={apps.data?.items ?? []}
        columns={columns}
        itemId="key"
        loading={apps.loading}
        tableCaption={i18n.translate('xpack.featureFlagsManagement.apps.tableCaption', {
          defaultMessage: 'Apps',
        })}
        noItemsMessage={
          apps.loading ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.apps.loadingLabel"
              defaultMessage="Loading apps"
            />
          ) : (
            <FormattedMessage
              id="xpack.featureFlagsManagement.apps.emptyLabel"
              defaultMessage="No apps yet."
            />
          )
        }
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: apps.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<App>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
        }}
      />
      {appKey && (
        <>
          <EuiSpacer size="l" />
          {selected.error ? (
            <ApiErrorCallout error={selected.error} onReload={selected.reload} />
          ) : (
            <CredentialsPanel appKey={appKey} appName={selected.data?.name ?? appKey} />
          )}
        </>
      )}
      {flyout && (
        <NamedEntityFlyout
          entity={editing}
          titleId="featureFlagsAppFlyoutTitle"
          title={
            editing
              ? i18n.translate('xpack.featureFlagsManagement.apps.editTitle', {
                  defaultMessage: 'Edit {key}',
                  values: { key: editing.key },
                })
              : i18n.translate('xpack.featureFlagsManagement.apps.createTitle', {
                  defaultMessage: 'Create app',
                })
          }
          keyHelp={i18n.translate('xpack.featureFlagsManagement.apps.keyHelp', {
            defaultMessage:
              'For example, kibana. Lowercase letters, digits, underscores and hyphens.',
          })}
          onClose={() => setFlyout(undefined)}
          onReload={apps.reload}
          onSave={async (input) => {
            if (editing) {
              await api.updateApp(editing.key, {
                name: input.name,
                description: input.description,
                version: input.version,
              });
            } else {
              await api.createApp({
                key: input.key,
                name: input.name,
                description: input.description,
              });
            }
            notifications.toasts.addSuccess(
              i18n.translate('xpack.featureFlagsManagement.apps.saveSuccessToast', {
                defaultMessage: 'Saved {key}',
                values: { key: input.key },
              })
            );
            setFlyout(undefined);
            apps.reload();
            if (!editing) {
              history.push(paths.app(input.key));
            }
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDeleteModal
          title={i18n.translate('xpack.featureFlagsManagement.apps.deleteTitle', {
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
            id="xpack.featureFlagsManagement.apps.deleteDescription"
            defaultMessage="Delete this app and its credentials. This fails while a flag is still assigned to it."
          />
        </ConfirmDeleteModal>
      )}
    </EuiPageTemplate.Section>
  );
};
