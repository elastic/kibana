/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiBasicTable,
  type CriteriaWithPagination,
  EuiButton,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiPageTemplate,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import type { Flag } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { toFeatureFlagsApiError, type FeatureFlagsApiError } from '../api_error';
import { useAppServices } from '../app_services';
import { ConfirmDeleteModal } from '../confirm_delete_modal';
import { deleteButtonLabel, editButtonLabel } from '../labels';
import { paths } from '../paths';
import { useAsyncData, useDebouncedValue } from '../use_async_data';
import { useCatalog } from '../use_catalog';

export const FlagsPage = () => {
  const history = useHistory();
  const { api, notifications, canSave } = useAppServices();
  const catalog = useCatalog();
  const [searchText, setSearchText] = useState('');
  const [app, setApp] = useState<string>();
  const [environment, setEnvironment] = useState<string>();
  const [tag, setTag] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pendingDelete, setPendingDelete] = useState<Flag>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<FeatureFlagsApiError>();
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const debouncedTag = useDebouncedValue(tag, 300);
  const filtersKey = `${debouncedSearch}|${app ?? ''}|${environment ?? ''}|${debouncedTag}`;
  const [appliedFilters, setAppliedFilters] = useState(filtersKey);
  if (filtersKey !== appliedFilters) {
    setAppliedFilters(filtersKey);
    if (page !== 1) {
      setPage(1);
    }
  }

  const load = useCallback(
    () =>
      api.listFlags({
        search: debouncedSearch || undefined,
        app,
        environment,
        tag: debouncedTag || undefined,
        page,
        perPage,
      }),
    [api, debouncedSearch, app, environment, debouncedTag, page, perPage]
  );
  const flags = useAsyncData(load);
  const apps = catalog.data?.apps ?? [];
  const environments = catalog.data?.environments ?? [];

  const columns: Array<EuiBasicTableColumn<Flag>> = [
    {
      field: 'key',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.keyColumnLabel', {
        defaultMessage: 'Key',
      }),
      render: (key: Flag['key']) => (
        <EuiLink
          data-ebt-action="viewFlag"
          data-ebt-element="featureFlagsManagement"
          data-test-subj="featureFlagsManagementColumnsLink"
          href={history.createHref({ pathname: paths.flag(key) })}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            history.push(paths.flag(key));
          }}
        >
          {key}
        </EuiLink>
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.nameColumnLabel', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'value_type',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.valueTypeColumnLabel', {
        defaultMessage: 'Type',
      }),
    },
    {
      field: 'apps',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.appsColumnLabel', {
        defaultMessage: 'Apps',
      }),
      render: (flagApps: Flag['apps']) => flagApps.join(', '),
    },
    {
      field: 'created_by',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.createdByColumnLabel', {
        defaultMessage: 'Created by',
      }),
      render: (createdBy: Flag['created_by']) =>
        createdBy?.full_name ||
        createdBy?.username || (
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.list.unknownCreatorLabel"
            defaultMessage="Unknown"
          />
        ),
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.tagsColumnLabel', {
        defaultMessage: 'Tags',
      }),
      render: (tags: Flag['tags']) => (
        <EuiFlexGroup gutterSize="xs" wrap>
          {tags.map((flagTag) => (
            <EuiFlexItem key={flagTag} grow={false}>
              <EuiBadge>{flagTag}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
    },
    {
      field: 'updated_at',
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.updatedColumnLabel', {
        defaultMessage: 'Updated',
      }),
      render: (updatedAt: Flag['updated_at']) => (
        <FormattedDate value={updatedAt} year="numeric" month="short" day="2-digit" />
      ),
    },
    {
      name: i18n.translate('xpack.featureFlagsManagement.flags.list.actionsColumnLabel', {
        defaultMessage: 'Actions',
      }),
      actions: [
        {
          name: canSave
            ? editButtonLabel()
            : i18n.translate('xpack.featureFlagsManagement.flags.list.viewButtonLabel', {
                defaultMessage: 'View',
              }),
          description: canSave
            ? editButtonLabel()
            : i18n.translate('xpack.featureFlagsManagement.flags.list.viewButtonLabel', {
                defaultMessage: 'View',
              }),
          icon: canSave ? 'pencil' : 'eye',
          type: 'icon',
          onClick: (flag) => history.push(paths.flag(flag.key)),
        },
        ...(canSave
          ? [
              {
                name: deleteButtonLabel(),
                description: deleteButtonLabel(),
                icon: 'trash' as const,
                type: 'icon' as const,
                color: 'danger' as const,
                onClick: (flag: Flag) => {
                  setDeleteError(undefined);
                  setPendingDelete(flag);
                },
              },
            ]
          : []),
      ],
    },
  ];

  const remove = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteFlag(pendingDelete.key, pendingDelete.version);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.featureFlagsManagement.flags.list.deleteSuccessToast', {
          defaultMessage: 'Deleted {key}',
          values: { key: pendingDelete.key },
        })
      );
      setPendingDelete(undefined);
      flags.reload();
    } catch (caught) {
      setDeleteError(toFeatureFlagsApiError(caught));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup alignItems="flexEnd" gutterSize="m" wrap>
        <EuiFlexItem grow={2}>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.list.searchLabel"
                defaultMessage="Search"
              />
            }
          >
            <EuiFieldText
              data-test-subj="featureFlagsManagementFlagsPageFieldText"
              compressed
              fullWidth
              placeholder={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.searchPlaceholder',
                { defaultMessage: 'Key or name' }
              )}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              aria-label={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.searchAriaLabel',
                {
                  defaultMessage: 'Search flags by key or name',
                }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.list.appFilterLabel"
                defaultMessage="App"
              />
            }
          >
            <EuiComboBox
              compressed
              fullWidth
              placeholder={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.appFilterPlaceholder',
                { defaultMessage: 'Any app' }
              )}
              aria-label={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.appFilterAriaLabel',
                {
                  defaultMessage: 'Filter by app',
                }
              )}
              singleSelection={{ asPlainText: true }}
              isClearable
              options={apps.map((item) => ({ label: item.key, value: item.key }))}
              selectedOptions={app ? [{ label: app, value: app }] : []}
              onChange={(selected) =>
                setApp(typeof selected[0]?.value === 'string' ? selected[0].value : undefined)
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.list.environmentFilterLabel"
                defaultMessage="Environment"
              />
            }
          >
            <EuiComboBox
              compressed
              fullWidth
              placeholder={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.environmentFilterPlaceholder',
                { defaultMessage: 'Any environment' }
              )}
              aria-label={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.environmentFilterAriaLabel',
                { defaultMessage: 'Filter by environment' }
              )}
              singleSelection={{ asPlainText: true }}
              isClearable
              options={environments.map((item) => ({ label: item.key, value: item.key }))}
              selectedOptions={environment ? [{ label: environment, value: environment }] : []}
              onChange={(selected) =>
                setEnvironment(
                  typeof selected[0]?.value === 'string' ? selected[0].value : undefined
                )
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="xpack.featureFlagsManagement.flags.list.tagFilterLabel"
                defaultMessage="Tag"
              />
            }
          >
            <EuiFieldText
              data-test-subj="featureFlagsManagementFlagsPageFieldText"
              compressed
              fullWidth
              placeholder={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.tagFilterPlaceholder',
                { defaultMessage: 'Exact tag' }
              )}
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              aria-label={i18n.translate(
                'xpack.featureFlagsManagement.flags.list.tagFilterAriaLabel',
                {
                  defaultMessage: 'Filter by an exact tag',
                }
              )}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {canSave && (
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                data-ebt-action="createFlag"
                data-ebt-element="featureFlagsManagement"
                data-test-subj="featureFlagsManagementFlagsPageCreateFlagButton"
                fill
                size="s"
                iconType="plus"
                onClick={() => history.push(paths.createFlag)}
              >
                <FormattedMessage
                  id="xpack.featureFlagsManagement.flags.list.createButtonLabel"
                  defaultMessage="Create flag"
                />
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {flags.error && (
        <>
          <ApiErrorCallout error={flags.error} onReload={flags.reload} />
          <EuiSpacer size="m" />
        </>
      )}
      {deleteError && (
        <>
          <ApiErrorCallout error={deleteError} onReload={flags.reload} />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiBasicTable
        items={flags.data?.items ?? []}
        columns={columns}
        itemId="key"
        loading={flags.loading}
        tableCaption={i18n.translate('xpack.featureFlagsManagement.flags.list.tableCaption', {
          defaultMessage: 'Feature flags',
        })}
        noItemsMessage={
          flags.loading ? (
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.list.loadingLabel"
              defaultMessage="Loading flags"
            />
          ) : (
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.list.emptyLabel"
              defaultMessage="No flags match these filters."
            />
          )
        }
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: flags.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50, 100],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<Flag>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
        }}
      />
      {pendingDelete && (
        <ConfirmDeleteModal
          title={i18n.translate('xpack.featureFlagsManagement.flags.list.deleteTitle', {
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
            id="xpack.featureFlagsManagement.flags.list.deleteDescription"
            defaultMessage="Delete this flag. This fails while another flag uses it as a prerequisite."
          />
        </ConfirmDeleteModal>
      )}
    </EuiPageTemplate.Section>
  );
};
