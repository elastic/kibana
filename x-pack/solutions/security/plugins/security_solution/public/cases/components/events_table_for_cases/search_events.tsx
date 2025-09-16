import { EcsFlat } from '@elastic/ecs';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { KibanaServices } from '@kbn/security-solution-plugin/public/common/lib/kibana';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import type { EcsSecurityExtension } from '@kbn/securitysolution-ecs';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { lastValueFrom } from 'rxjs';

export const searchEvents = async (
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
