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
import * as i18n from './translations';
import { KibanaServices, useToasts } from '../../common/lib/kibana';

const searchEvents = async (
  signal: AbortSignal | undefined,
  dataView: DataView | undefined,
  parameters: {
    caseId: string;
    columns: string[];
    eventIds: string[];
  }
) => {
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
      },
    })
  );

  if (signal?.aborted) {
    throw new AbortError();
  }

  // TODO: use timeline items here
  // return buildDataTableRecordList({
  //   dataView,
  //   records: response?.rawResponse?.hits?.hits ?? [],
  // });

  return [];
};

export const useGetEvents = (
  dataView: DataView | undefined,
  parameters: {
    caseId: string;
    columns: string[];
    eventIds: string[];
  }
) => {
  const toasts = useToasts();

  return useQuery(
    casesQueriesKeys.caseEvents(parameters.caseId, [
      dataView?.getIndexPattern(),
      ...parameters.eventIds,
      ...parameters.columns,
    ]),
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
