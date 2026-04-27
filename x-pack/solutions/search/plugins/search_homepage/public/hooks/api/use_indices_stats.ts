/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import type { Index } from '@kbn/index-management-shared-types';

import { useKibana } from '../use_kibana';
import { getErrorCode } from '../../utils/get_error_message';

export interface IndicesStats {
  totalIndices: number;
  hiddenIndices: number;
  normalIndices: number;
}

const API_BASE_PATH = '/api/index_management';

export const useIndicesStats = (): UseQueryResult<IndicesStats | undefined> => {
  const { http } = useKibana().services;

  const queryResult = useQuery<Index[] | undefined, Error, IndicesStats | undefined>({
    queryKey: ['fetchIndicesStats'],
    queryFn: async () => {
      try {
        const response = await http.get<Index[]>(`${API_BASE_PATH}/indices`);
        return response;
      } catch (error) {
        if (getErrorCode(error) === 403) {
          return undefined;
        }
        throw error;
      }
    },
    select: (indices) => {
      if (!indices) {
        return undefined;
      }

      const hiddenIndices = indices.filter((index) => index.hidden).length;
      const normalIndices = indices.filter((index) => !index.hidden).length;
      const totalIndices = indices.length;

      return {
        totalIndices,
        hiddenIndices,
        normalIndices,
      };
    },
  });

  return {
    ...queryResult,
  };
};
