/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { readListIndex, ApiParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { READ_INDEX_QUERY_KEY } from '../constants';

const readListIndexWithOptionalSignal = withOptionalSignal(readListIndex);

export const useReadListIndex = ({
  http,
  isEnabled,
  onError,
}: {
  isEnabled: boolean;
  http: ApiParams['http'];
  onError?: (err: unknown) => void;
}) => {
  const query = useQuery(
    READ_INDEX_QUERY_KEY,
    async ({ signal }) => {
      if (!isEnabled) {
        return null;
      }

      return readListIndexWithOptionalSignal({ http, signal });
    },
    {
      onError,
      retry: false,
      refetchOnWindowFocus: false,
      enabled: isEnabled,
      staleTime: Infinity,
    }
  );

  return {
    result: query.data,
    loading: query.isFetching,
    error: query.error,
  };
};
