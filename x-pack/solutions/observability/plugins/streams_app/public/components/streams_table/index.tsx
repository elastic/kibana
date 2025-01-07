/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiIcon,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AbortableAsyncState } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import React, { useMemo } from 'react';
import { isWiredStreamConfig, StreamDefinition } from '@kbn/streams-schema';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function StreamsTable({
  listFetch,
  query,
}: {
  listFetch: AbortableAsyncState<{ streams: StreamDefinition[] }>;
  query: string;
}) {
  const router = useStreamsAppRouter();

  const items = useMemo(() => {
    return listFetch.value?.streams ?? [];
  }, [listFetch.value?.streams]);

  const filteredItems = useMemo(() => {
    if (!query) {
      return items;
    }

    return items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, items]);

  const columns = useMemo<Array<EuiBasicTableColumn<StreamDefinition>>>(() => {
    return [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.streamsTable.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        render: (_, { name, stream }) => {
          return (
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiIcon type={isWiredStreamConfig(stream) ? 'branch' : 'bullseye'} />
              <EuiLink
                data-test-subj="logsaiColumnsLink"
                href={router.link('/{key}', { path: { key: name } })}
              >
                {name}
              </EuiLink>
            </EuiFlexGroup>
          );
        },
      },
    ];
  }, [router]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiTitle size="xxs">
        <h2>
          {i18n.translate('xpack.streams.streamsTable.tableTitle', {
            defaultMessage: 'Streams',
          })}
        </h2>
      </EuiTitle>
      <EuiBasicTable columns={columns} items={filteredItems} loading={listFetch.loading} />
    </EuiFlexGroup>
  );
}
