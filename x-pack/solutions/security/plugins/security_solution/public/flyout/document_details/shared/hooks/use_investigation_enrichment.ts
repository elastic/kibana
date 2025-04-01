/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty, isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import { i18n } from '@kbn/i18n';
import { useEventEnrichmentComplete } from '../services/threat_intelligence';
import type {
  CtiEventEnrichmentStrategyResponse,
  EventFields,
} from '../../../../../common/search_strategy';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import {
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../common/cti/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../../common/lib/kibana';
import { inputsActions } from '../../../../common/store/actions';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../../common/constants';

const INVESTIGATION_ENRICHMENT_REQUEST_ERROR = i18n.translate(
  'xpack.securitySolution.flyout.threatIntelligence.requestError',
  {
    defaultMessage: `An error occurred while requesting threat intelligence`,
  }
);

export const QUERY_ID = 'investigation_time_enrichment';
const noop = () => {};
const noEnrichments = { enrichments: [] };

export interface UseInvestigationTimeEnrichmentProps {
  /**
   * The event fields to fetch enrichment for
   */
  eventFields: EventFields;
}

export interface UseInvestigationTimeEnrichmentResult {
  /**
   * The result of the enrichment
   */
  result: CtiEventEnrichmentStrategyResponse | undefined | typeof noEnrichments;
  /**
   * The range of the query
   */
  range: { from: string; to: string };
  /**
   * Function to set the range of the query
   */
  setRange: (range: { from: string; to: string }) => void;
  /**
   * Whether the enrichment is loading
   */
  loading: boolean;
}

/**
 * Hook to fetch the enrichment for a set of event fields.
 * Holds the range of the query.
 * Returns the result of the enrichment, the range of the query, the function to set it and the loading state.
 */
export const useInvestigationTimeEnrichment = ({
  eventFields,
}: UseInvestigationTimeEnrichmentProps): UseInvestigationTimeEnrichmentResult => {
  const { addError } = useAppToasts();
  const { data, uiSettings } = useKibana().services;
  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const dispatch = useDispatch();

  const [range, setRange] = useState({
    from: DEFAULT_EVENT_ENRICHMENT_FROM,
    to: DEFAULT_EVENT_ENRICHMENT_TO,
  });

  const { error, loading, result, start } = useEventEnrichmentComplete();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: InputsModelId.global, id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!loading && result) {
      dispatch(
        inputsActions.setQuery({
          inputId: InputsModelId.global,
          id: QUERY_ID,
          inspect: {
            dsl: result.inspect.dsl,
            response: [JSON.stringify(result.rawResponse, null, 2)],
          },
          loading,
          refetch: noop,
        })
      );
    }

    return deleteQuery;
  }, [deleteQuery, dispatch, loading, result]);

  useEffect(() => {
    if (error) {
      addError(error, { title: INVESTIGATION_ENRICHMENT_REQUEST_ERROR });
    }
  }, [addError, error]);

  const prevEventFields = usePrevious(eventFields);
  const prevRange = usePrevious(range);

  useEffect(() => {
    if (
      !isEmpty(eventFields) &&
      (!isEqual(eventFields, prevEventFields) || !isEqual(range, prevRange))
    ) {
      start({
        data,
        timerange: { ...range, interval: '' },
        defaultIndex: defaultThreatIndices,
        eventFields,
        filterQuery: '',
      });
    }
  }, [start, data, eventFields, prevEventFields, range, prevRange, defaultThreatIndices]);

  return {
    result: isEmpty(eventFields) ? noEnrichments : result,
    range,
    setRange,
    loading,
  };
};
