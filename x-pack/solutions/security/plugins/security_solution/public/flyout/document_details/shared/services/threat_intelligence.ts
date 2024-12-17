/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { filter } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isRunningResponse } from '@kbn/data-plugin/common';
import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';
import { CtiQueries } from '../../../../../common/api/search_strategy';
import type { CtiEventEnrichmentStrategyResponse } from '../../../../../common/search_strategy';
import type { EventEnrichmentRequestOptionsInput } from '../../../../../common/api/search_strategy';

type GetEventEnrichmentProps = Omit<EventEnrichmentRequestOptionsInput, 'factoryQueryType'> & {
  /**
   * The data plugin start
   */
  data: DataPublicPluginStart;
  /**
   * An `AbortSignal` that allows the caller of `search` to abort a search request.
   */
  signal: AbortSignal;
};

/**
 * API call to retrieve the enrichments for a set of fields
 */
const getEventEnrichment = ({
  data,
  defaultIndex,
  eventFields,
  filterQuery,
  timerange,
  signal,
}: GetEventEnrichmentProps): Observable<CtiEventEnrichmentStrategyResponse> =>
  data.search.search<EventEnrichmentRequestOptionsInput, CtiEventEnrichmentStrategyResponse>(
    {
      defaultIndex,
      eventFields,
      factoryQueryType: CtiQueries.eventEnrichment,
      filterQuery,
      timerange,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

/**
 * Returns the enrichments for a set of fields, excluding the running response
 */
const getEventEnrichmentComplete = (
  props: GetEventEnrichmentProps
): Observable<CtiEventEnrichmentStrategyResponse> =>
  getEventEnrichment(props).pipe(filter((response) => !isRunningResponse(response)));

export const useEventEnrichmentComplete = () =>
  useObservable(withOptionalSignal(getEventEnrichmentComplete));
