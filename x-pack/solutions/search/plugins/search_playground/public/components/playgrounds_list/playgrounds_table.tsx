/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { PLUGIN_ID, SearchPlaygroundQueryKeys } from '../../../common';
import { DeletePlaygroundModal } from '../saved_playground/delete_playground_modal';

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
  const [playgroundToDelete, setPlaygroundToDelete] = useState<PlaygroundListObject | null>(null);
  const { application } = useKibana().services;
  const queryClient = useQueryClient();
  const onNavigateToPlayground = useCallback(
    (id: string) => {
      application?.navigateToApp(PLUGIN_ID, { path: `/p/${id}` });
    },
    [application]
  );
  const onDeletePlaygroundSuccess = useCallback(() => {
    setPlaygroundToDelete(null);
    queryClient.invalidateQueries({ queryKey: [SearchPlaygroundQueryKeys.PlaygroundsList] });
  }, [queryClient]);
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
      {
        actions: [
          {
            name: i18n.translate(
              'xpack.searchPlayground.playgroundsList.table.columns.actions.delete.title',
              {
                defaultMessage: 'Delete',
              }
            ),
            description: (playground: PlaygroundListObject) =>
              i18n.translate(
                'xpack.searchPlayground.playgroundsList.table.columns.actions.delete.description',
                {
                  defaultMessage: 'Delete playground {name}',
                  values: { name: playground.name },
                }
              ),
            icon: 'trash',
            color: 'danger',
            type: 'icon',
            'data-test-subj': 'playgroundsListTableDeleteActionButton',
            isPrimary: true,
            onClick: (playground: PlaygroundListObject) => {
              setPlaygroundToDelete(playground);
            },
          },
        ],
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
        data-test-subj="playgroundsTable"
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
      {playgroundToDelete !== null && (
        <DeletePlaygroundModal
          playgroundId={playgroundToDelete.id}
          playgroundName={playgroundToDelete.name}
          onClose={() => {
            setPlaygroundToDelete(null);
          }}
          onDeleteSuccess={onDeletePlaygroundSuccess}
        />
      )}
    </>
  );
};
