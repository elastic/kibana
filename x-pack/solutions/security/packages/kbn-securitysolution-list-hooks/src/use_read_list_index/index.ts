/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';

import { readListIndex, ApiParams } from '@kbn/securitysolution-list-api';
import { withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import {
  type SecurityAppError,
  isSecurityAppError,
  isNotFoundError,
} from '@kbn/securitysolution-t-grid';

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

      try {
        return await readListIndexWithOptionalSignal({ http, signal });
      } catch (err) {
        if (isIndexNotCreatedError(err)) {
          return parseReadIndexResultFrom404Error(err);
        }
        return Promise.reject(err);
      }
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

const errorMentionsListsIndex = (error: SecurityAppError): boolean =>
  error.body.message.includes('.lists-');
const errorMentionsItemsIndex = (error: SecurityAppError): boolean =>
  error.body.message.includes('.items-');

/**
 * Determines whether an error response from the `readListIndex`
 * API call indicates that the index is not yet created.
 */
export const isIndexNotCreatedError = (err: unknown): err is SecurityAppError => {
  return (
    isSecurityAppError(err) &&
    isNotFoundError(err) &&
    (errorMentionsListsIndex(err) || errorMentionsItemsIndex(err))
  );
};

/**
 * Parses the result of a 404 error from the read list index API into an actionable response
 *
 * This endpoint returns a 404 if either of the underlying indices do
 * not exist. By default, this causes the http client to throw an error,
 * but as this is a valid result from the endpoint, we want to catch that error
 * and present a result that is actionable to the consumer.
 * @param error The 404 IndexNotCreated error returned from the read list index API
 */
export const parseReadIndexResultFrom404Error = (
  error: SecurityAppError
): Awaited<ReturnType<typeof readListIndexWithOptionalSignal>> => {
  return {
    list_index: !errorMentionsListsIndex(error),
    list_item_index: !errorMentionsItemsIndex(error),
  };
};
