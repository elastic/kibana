/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ESSearchResponse } from '@kbn/es-types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { IInspectorInfo, isRunningResponse } from '@kbn/data-plugin/common';
import { getInspectResponse } from '../../common/utils/get_inspect_response';
import { useInspectorContext } from '../contexts/inspector/use_inspector_context';
import { FETCH_STATUS, useFetcher } from './use_fetcher';

export const useEsSearch = <DocumentSource extends unknown, TParams extends estypes.SearchRequest>(
  params: TParams,
  fnDeps: any[],
  options: { inspector?: IInspectorInfo; name: string }
): {
  data: ESSearchResponse<DocumentSource, TParams, { restTotalHitsAsInt: false }>;
  loading: boolean;
  error?: Error;
} => {
  const {
    services: { data },
  } = useKibana<{ data: DataPublicPluginStart }>();

  const { name } = options ?? {};

  const { addInspectorRequest } = useInspectorContext();

  const {
    data: response = {},
    loading,
    error,
  } = useFetcher(() => {
    if (params.index) {
      const startTime = Date.now();
      return new Promise((resolve, reject) => {
        const search$ = data.search
          .search(
            {
              params,
            },
            {
              legacyHitsTotal: false,
            }
          )
          .subscribe({
            next: (result) => {
              if (!isRunningResponse(result)) {
                if (addInspectorRequest) {
                  addInspectorRequest({
                    data: {
                      _inspect: [
                        getInspectResponse({
                          startTime,
                          esRequestParams: params,
                          esResponse: result.rawResponse,
                          esError: null,
                          esRequestStatus: 1,
                          operationName: name,
                          kibanaRequest: {
                            route: {
                              path: '/internal/search',
                              method: 'POST',
                            },
                          } as any,
                        }),
                      ],
                    },
                    status: FETCH_STATUS.SUCCESS,
                  });
                }
                // Final result
                resolve(result);
                search$.unsubscribe();
              }
            },
            error: (err) => {
              // eslint-disable-next-line no-console
              console.error(err);
              if (addInspectorRequest) {
                addInspectorRequest({
                  data: {
                    _inspect: [
                      getInspectResponse({
                        startTime,
                        esRequestParams: params,
                        esResponse: null,
                        esError: { originalError: err, name: err.name, message: err.message },
                        esRequestStatus: 2,
                        operationName: name,
                        kibanaRequest: {
                          route: {
                            path: '/internal/search',
                            method: 'POST',
                          },
                        } as any,
                      }),
                    ],
                  },
                  status: FETCH_STATUS.SUCCESS,
                });
              }
              reject(err);
            },
          });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...fnDeps]);

  const { rawResponse } = response as any;

  return {
    data: rawResponse as ESSearchResponse<DocumentSource, TParams, { restTotalHitsAsInt: false }>,
    loading: Boolean(loading),
    error,
  };
};

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}
