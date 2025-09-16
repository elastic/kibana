/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { type DataView } from '@kbn/data-views-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { EcsFlat } from '@elastic/ecs';
import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import * as i18n from '../translations';
import { KibanaServices, useToasts } from '../../../common/lib/kibana';

const searchEvents = async (
  signal: AbortSignal | undefined,
  dataView: DataView | undefined,
  parameters: {
    columns: string[];
    eventIds: string[];
    sort: SortColumnTable[];
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
        fields: parameters.columns,
        sort: parameters.sort.map((tableSort) => ({
          [tableSort.columnId]: tableSort.sortDirection,
        })),
      },
    })
  );

  if (signal?.aborted) {
    throw new AbortError();
  }

  return (
    response?.rawResponse?.hits?.hits?.map((row) => {
      const ecs = structuredClone(EcsFlat) as unknown as EcsSecurityExtension;
      ecs._id = row?._id as string;
      ecs._index = row._index as string;

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

export const useGetEvents = (
  dataView: DataView,
  parameters: {
    columns: string[];
    eventIds: string[];
    sort: SortColumnTable[];
  }
) => {
  const toasts = useToasts();

  return useQuery(
    [dataView.getIndexPattern(), parameters.columns, parameters.eventIds, parameters.sort],
    ({ signal }) => searchEvents(signal, dataView, parameters),
    {
      onError: (error: Error) => {
        if (error instanceof AbortError) {
          return;
        }

        toasts.addError(error, {
          title: i18n.ERROR_TITLE,
        });
      },
    }
  );
};
