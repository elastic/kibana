/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  formatDate,
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiText,
  EuiSpacer,
  EuiI18nNumber,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PlaygroundListObject, PlaygroundListResponse } from '../../types';
import { useKibana } from '../../hooks/use_kibana';
import { PLUGIN_ID } from '../../../common';

export interface PlaygroundsTableProps {
  playgroundsData: PlaygroundListResponse;
  sortField: 'updatedAt';
  sortDirection: 'asc' | 'desc';
  onChange: (criteria: CriteriaWithPagination<PlaygroundListObject>) => void;
}

export const PlaygroundsTable = ({
  playgroundsData,
  onChange,
  sortField,
  sortDirection,
}: PlaygroundsTableProps) => {
  const { application } = useKibana().services;
  const onNavigateToPlayground = useCallback(
    (id: string) => {
      application?.navigateToApp(PLUGIN_ID, { path: `/p/${id}` });
    },
    [application]
  );
  const columns: Array<EuiBasicTableColumn<PlaygroundListObject>> = useMemo(
    () => [
      {
        name: i18n.translate('xpack.searchPlayground.playgroundsList.table.columns.name.header', {
          defaultMessage: 'Playground',
        }),
        render: ({ id, name }: PlaygroundListObject) => (
          <EuiLink
            data-test-subj={`playground-link playground-link-${id}`}
            onClick={() => onNavigateToPlayground(id)}
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'updatedAt',
        name: i18n.translate(
          'xpack.searchPlayground.playgroundsList.table.columns.updatedAt.header',
          {
            defaultMessage: 'Updated',
          }
        ),
        render: (updatedAt: PlaygroundListObject['updatedAt']) =>
          updatedAt ? formatDate(updatedAt) : '---',
        sortable: true,
      },
    ],
    [onNavigateToPlayground]
  );
  const pageCount = useMemo(() => {
    if (playgroundsData._meta.total <= playgroundsData._meta.size)
      return <EuiI18nNumber value={playgroundsData._meta.total} />;

    const start = playgroundsData._meta.size * (playgroundsData._meta.page - 1) + 1;
    let end =
      playgroundsData._meta.size * (playgroundsData._meta.page - 1) + playgroundsData._meta.size;
    if (end > playgroundsData._meta.total) {
      end = playgroundsData._meta.total;
    }
    return (
      <strong>
        <EuiI18nNumber value={start} />-
        <EuiI18nNumber value={end} />
      </strong>
    );
  }, [playgroundsData]);
  const sorting: EuiTableSortingType<PlaygroundListObject> = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    enableAllColumns: false,
    readOnly: false,
  };

  return (
    <>
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.searchPlayground.playgroundsList.table.resultsCount"
          defaultMessage="Showing {pageCount} of {totalCount}"
          values={{
            pageCount,
            totalCount: <EuiI18nNumber value={playgroundsData._meta.total} />,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.searchPlayground.playgroundsList.table.caption', {
          defaultMessage: 'Caption for playgrounds table', // TODO: fix copy
        })}
        items={playgroundsData.items}
        columns={columns}
        pagination={{
          pageIndex: playgroundsData._meta.page - 1,
          pageSize: playgroundsData._meta.size,
          totalItemCount: playgroundsData._meta.total,
          showPerPageOptions: false,
        }}
        sorting={sorting}
        onChange={onChange}
      />
    </>
  );
};
