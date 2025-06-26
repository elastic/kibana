/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseVisualizationResponseResponse, VisualizationTablesWithMeta } from './types';
import type { useVisualizationResponse } from './use_visualization_response';

const mockSearchSessionId = 'searchSessionId';

const buildOkResponse = ({ tableCount = 1 } = {}): Required<UseVisualizationResponseResponse> => {
  const generatedTables: VisualizationTablesWithMeta['tables'] = {};
  let totalRowCount = 0;

  for (let i = 0; i < tableCount; i++) {
    const layerId = `layer-id-${i}`;
    const columnId = `column-id-${i}`;
    const rowCountForThisLayer = 1;

    generatedTables[layerId] = {
      type: 'datatable' as const,
      columns: [
        {
          id: columnId,
          name: `Column Name ${i}`,
          meta: {
            type: 'string',
            params: {
              id: 'string',
            },
          },
        },
      ],
      rows: Array.from({ length: rowCountForThisLayer }, (_, rowIndex) => ({
        [columnId]: `Row ${rowIndex} (Layer ${i})`,
      })),
      meta: {
        statistics: {
          totalCount: rowCountForThisLayer,
        },
      },
    };
    totalRowCount += rowCountForThisLayer;
  }

  return {
    searchSessionId: mockSearchSessionId,
    tables: {
      tables: generatedTables,
      meta: {
        statistics: {
          totalCount: totalRowCount,
        },
      },
    },
    loading: false,
  };
};

const buildEmptyOkResponse = (): Required<UseVisualizationResponseResponse> => ({
  searchSessionId: mockSearchSessionId,
  tables: {
    tables: {
      'layer-id-0': {
        type: 'datatable' as const,
        columns: [
          {
            id: 'column-id-0',
            name: 'Column Name 0',
            meta: {
              type: 'string',
              params: {
                id: 'string',
              },
            },
          },
        ],
        rows: [],
        meta: {
          statistics: {
            totalCount: 0,
          },
        },
      },
    },
    meta: {
      statistics: {
        totalCount: 0,
      },
    },
  },
  loading: false,
});

const buildLoadingResponse = (): UseVisualizationResponseResponse => ({
  searchSessionId: mockSearchSessionId,
  loading: true,
});

const buildErrResponse = (): UseVisualizationResponseResponse => ({
  searchSessionId: mockSearchSessionId,
  loading: false,
});

const buildNoSearchSessionIdOkResponse = (): UseVisualizationResponseResponse => {
  const { searchSessionId: _, ...okResponseWithoutSessionId } = buildOkResponse();
  return okResponseWithoutSessionId;
};

const create = () => {
  return jest.fn<UseVisualizationResponseResponse, []>().mockReturnValue(buildOkResponse());
};

export const useVisualizationResponseMock = {
  create,
  buildOkResponse,
  buildNoSearchSessionIdOkResponse,
  buildEmptyOkResponse,
  buildLoadingResponse,
  buildErrResponse,
};

export type UseVisualizationResponseMock = jest.MockedFunction<typeof useVisualizationResponse>;
