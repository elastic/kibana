/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  EuiCodeBlock,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import type { ObservedContext } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { useAppServices } from '../app_services';
import { useAsyncData, useDebouncedValue } from '../use_async_data';
import { useCatalog } from '../use_catalog';

export const ObservedContextsPage = () => {
  const { api } = useAppServices();
  const catalog = useCatalog();
  const [app, setApp] = useState<string>();
  const [environment, setEnvironment] = useState<string>();
  const [contextKey, setContextKey] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const debouncedContextKey = useDebouncedValue(contextKey, 300);

  const load = useCallback(() => {
    if (!app || !environment) {
      return Promise.resolve({ items: [], total: 0, page: 1, per_page: perPage });
    }
    return api.listObservedContexts({
      app,
      environment,
      contextKey: debouncedContextKey || undefined,
      page,
      perPage,
    });
  }, [api, app, environment, debouncedContextKey, page, perPage]);
  const contexts = useAsyncData(load);

  const columns: Array<EuiBasicTableColumn<ObservedContext>> = [
    {
      field: 'context_key',
      name: i18n.translate('xpack.featureFlagsManagement.observed.contextKeyColumnLabel', {
        defaultMessage: 'Targeting key',
      }),
    },
    {
      field: 'attributes',
      name: i18n.translate('xpack.featureFlagsManagement.observed.attributesColumnLabel', {
        defaultMessage: 'Attributes',
      }),
      render: (attributes: string[]) => attributes.join(', '),
    },
    {
      field: 'last_seen',
      name: i18n.translate('xpack.featureFlagsManagement.observed.lastSeenColumnLabel', {
        defaultMessage: 'Last seen',
      }),
      render: (lastSeen?: string) =>
        lastSeen ? (
          <FormattedDate
            value={lastSeen}
            year="numeric"
            month="short"
            day="2-digit"
            hour="2-digit"
            minute="2-digit"
          />
        ) : null,
    },
  ];

  return (
    <EuiPageTemplate.Section>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.featureFlagsManagement.observed.appLabel', {
              defaultMessage: 'App',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.translate('xpack.featureFlagsManagement.observed.appPlaceholder', {
                defaultMessage: 'Select an app',
              })}
              options={(catalog.data?.apps ?? []).map((item) => ({ label: item.key }))}
              selectedOptions={app ? [{ label: app }] : []}
              onChange={(selected) => {
                setApp(selected[0]?.label);
                setPage(1);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.featureFlagsManagement.observed.environmentLabel', {
              defaultMessage: 'Environment',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              placeholder={i18n.translate(
                'xpack.featureFlagsManagement.observed.environmentPlaceholder',
                { defaultMessage: 'Select an environment' }
              )}
              options={(catalog.data?.environments ?? []).map((item) => ({ label: item.key }))}
              selectedOptions={environment ? [{ label: environment }] : []}
              onChange={(selected) => {
                setEnvironment(selected[0]?.label);
                setPage(1);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.featureFlagsManagement.observed.contextKeyLabel', {
              defaultMessage: 'Targeting key',
            })}
          >
            <EuiFieldText
              data-test-subj="featureFlagsManagementObservedContextsPageFieldText"
              value={contextKey}
              onChange={(event) => {
                setContextKey(event.target.value);
                setPage(1);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {!app || !environment ? (
        <FormattedMessage
          id="xpack.featureFlagsManagement.observed.selectScopeDescription"
          defaultMessage="Select an app and an environment to see the evaluation contexts Fleet Server has recorded."
        />
      ) : null}
      {contexts.error && <ApiErrorCallout error={contexts.error} onReload={contexts.reload} />}
      <EuiBasicTable
        data-test-subj="featureFlagsManagementObservedContextsTable"
        items={app && environment ? contexts.data?.items ?? [] : []}
        columns={columns}
        loading={Boolean(app && environment && contexts.loading)}
        itemId="id"
        tableCaption={i18n.translate('xpack.featureFlagsManagement.observed.tableCaption', {
          defaultMessage: 'Observed evaluation contexts',
        })}
        noItemsMessage={i18n.translate('xpack.featureFlagsManagement.observed.emptyLabel', {
          defaultMessage: 'No contexts have been recorded for this app and environment.',
        })}
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: contexts.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<ObservedContext>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
        }}
        itemIdToExpandedRowMap={Object.fromEntries(
          (contexts.data?.items ?? []).map((item) => [
            item.id,
            <EuiCodeBlock key={item.id} language="json" isCopyable fontSize="s" paddingSize="s">
              {JSON.stringify(
                {
                  context: item.context,
                  attribute_types: item.attribute_types,
                  first_seen: item.first_seen,
                },
                null,
                2
              )}
            </EuiCodeBlock>,
          ])
        )}
      />
    </EuiPageTemplate.Section>
  );
};
