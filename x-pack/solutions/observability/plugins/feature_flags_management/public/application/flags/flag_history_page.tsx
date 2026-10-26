/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiAccordion,
  EuiBasicTable,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { getEbtProps } from '@kbn/ebt-click';
import type { FlagHistoryItem } from '../../../common';
import { ApiErrorCallout } from '../api_error_callout';
import { FEATURE_FLAGS_EBT_ACTIONS, FEATURE_FLAGS_EBT_ELEMENT } from '../ebt';
import { paths } from '../paths';
import { useAppServices } from '../app_services';
import { useAsyncData } from '../use_async_data';

export const FlagHistoryPage = () => {
  const history = useHistory();
  const { flagKey = '' } = useParams<{ flagKey: string }>();
  const { api } = useAppServices();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const load = useCallback(
    () => api.getFlagHistory(flagKey, page, perPage),
    [api, flagKey, page, perPage]
  );
  const historyQuery = useAsyncData(load);

  const columns: Array<EuiBasicTableColumn<FlagHistoryItem>> = [
    {
      field: 'timestamp',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.timeColumnLabel', {
        defaultMessage: 'Time',
      }),
      render: (timestamp: string) => (
        <FormattedDate
          value={timestamp}
          year="numeric"
          month="short"
          day="2-digit"
          hour="2-digit"
          minute="2-digit"
        />
      ),
    },
    {
      field: 'action',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.actionColumnLabel', {
        defaultMessage: 'Action',
      }),
    },
    {
      field: 'user.name',
      name: i18n.translate('xpack.featureFlagsManagement.flags.history.userColumnLabel', {
        defaultMessage: 'User',
      }),
      render: (name: string, item: FlagHistoryItem) => item.user.full_name || name,
    },
  ];

  return (
    <EuiPageTemplate.Section>
      <EuiButtonEmpty
        data-test-subj="featureFlagsManagementFlagHistoryBackButton"
        iconType="chevronSingleLeft"
        href={history.createHref({ pathname: paths.flag(flagKey) })}
        {...getEbtProps({
          action: FEATURE_FLAGS_EBT_ACTIONS.back,
          element: FEATURE_FLAGS_EBT_ELEMENT,
        })}
      >
        <FormattedMessage
          id="xpack.featureFlagsManagement.flags.history.backButtonLabel"
          defaultMessage="Back to {flagKey}"
          values={{ flagKey }}
        />
      </EuiButtonEmpty>
      <EuiSpacer size="m" />
      <EuiText>
        <h2>
          <FormattedMessage
            id="xpack.featureFlagsManagement.flags.history.title"
            defaultMessage="History of {flagKey}"
            values={{ flagKey }}
          />
        </h2>
      </EuiText>
      <EuiSpacer size="m" />
      {historyQuery.error && (
        <ApiErrorCallout error={historyQuery.error} onReload={historyQuery.reload} />
      )}
      <EuiBasicTable
        data-test-subj="featureFlagsManagementFlagHistoryTable"
        items={historyQuery.data?.items ?? []}
        columns={columns}
        loading={historyQuery.loading}
        itemId="id"
        tableCaption={i18n.translate('xpack.featureFlagsManagement.flags.history.tableCaption', {
          defaultMessage: 'Flag change history',
        })}
        noItemsMessage={i18n.translate('xpack.featureFlagsManagement.flags.history.emptyLabel', {
          defaultMessage: 'No changes have been recorded for this flag.',
        })}
        pagination={{
          pageIndex: page - 1,
          pageSize: perPage,
          totalItemCount: historyQuery.data?.total ?? 0,
          pageSizeOptions: [10, 20, 50],
        }}
        onChange={({ page: nextPage }: CriteriaWithPagination<FlagHistoryItem>) => {
          setPage(nextPage.index + 1);
          setPerPage(nextPage.size);
        }}
        itemIdToExpandedRowMap={Object.fromEntries(
          (historyQuery.data?.items ?? []).map((item) => [
            item.id,
            <EuiCodeBlock key={item.id} language="json" isCopyable fontSize="s" paddingSize="s">
              {JSON.stringify(item.snapshot, null, 2)}
            </EuiCodeBlock>,
          ])
        )}
      />
      <EuiAccordion
        id="featureFlagsHistoryHelp"
        buttonContent={i18n.translate(
          'xpack.featureFlagsManagement.flags.history.expandHelpLabel',
          {
            defaultMessage: 'About this history',
          }
        )}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.featureFlagsManagement.flags.history.helpDescription"
              defaultMessage="Each row is the flag as it was just after the change. Expand a row to see that snapshot."
            />
          </p>
        </EuiText>
      </EuiAccordion>
    </EuiPageTemplate.Section>
  );
};
