/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { type DataView } from '@kbn/data-views-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { SortColumnTable } from '@kbn/securitysolution-data-table';
import * as i18n from './translations';
import { useToasts } from '../../../common/lib/kibana';
import { searchEvents } from './search_events';

export const useGetEvents = (
  dataView: DataView,
  parameters: {
    eventIds: string[];
    sort: SortColumnTable[];
    pageIndex: number;
    itemsPerPage: number;
  }
) => {
  const toasts = useToasts();

  return useQuery(
    [
      dataView.getIndexPattern(),
      parameters.eventIds,
      parameters.sort,
      parameters.pageIndex,
      parameters.itemsPerPage,
    ],
    ({ signal }) => searchEvents(signal, dataView, parameters),
    {
      onError: (error: Error) => {
        if (error instanceof AbortError) {
          return;
        }

        toasts.addError(error, {
          title: i18n.EVENTS_ERROR_TITLE,
        });
      },
    }
  );
};
