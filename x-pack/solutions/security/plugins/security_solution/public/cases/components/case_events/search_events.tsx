/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { lastValueFrom } from 'rxjs';
import { KibanaServices } from '../../../common/lib/kibana';

export const searchEvents = async (
  signal: AbortSignal | undefined,
  dataView: DataView,
  parameters: {
    eventIds: string[];
    sort: SortColumnTable[];
    pageIndex: number;
    itemsPerPage: number;
  }
): Promise<TimelineItem[]> => {
  if (!dataView) {
    throw new Error('data view is not defined');
  }

  const { data } = KibanaServices.get();

  const response = await lastValueFrom(
    data.search.search({
      params: {
        index: dataView.getIndexPattern(),
        body: {
          query: {
            ids: {
              values: parameters.eventIds,
            },
          },
        },
        fields: ['*'],
        sort: parameters.sort.map((tableSort) => ({
          [tableSort.columnId]: tableSort.sortDirection,
        })),
        from: parameters.pageIndex * parameters.itemsPerPage,
        size: parameters.itemsPerPage,
      },
    })
  );

  if (signal?.aborted) {
    throw new AbortError();
  }

  return (
    response?.rawResponse?.hits?.hits?.map((row) => {
      const ecs = {
        _id: row?._id as string,
        _index: row._index as string,
      };

      return {
        _id: row._id as string,
        _index: row._index as string,
        ecs,
        data: [
          ...Object.entries(row.fields ?? {}).map(([field, value]) => ({ field, value })),
          { field: '_id', value: [row._id] },
        ],
      };
    }) ?? []
  );
};
