/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { useMemo } from 'react';
import { useHighlightedFields } from './use_highlighted_fields';
import { convertHighlightedFieldsToPrevalenceFilters } from '../utils/highlighted_fields_helpers';
import type { AggregationValue } from './use_fetch_prevalence';
import {
  EVENT_KIND_AGG_KEY,
  FIELD_NAMES_AGG_KEY,
  HOST_NAME_AGG_KEY,
  HOSTS_AGG_KEY,
  useFetchPrevalence,
  USER_NAME_AGG_KEY,
  USERS_AGG_KEY,
} from './use_fetch_prevalence';
import { EventKind } from '../constants/event_kinds';

export interface PrevalenceData {
  field: string;
  values: string[];
  alertCount: number;
  docCount: number;
  hostPrevalence: number;
  userPrevalence: number;
}
export interface UsePrevalenceParams {
  /**
   * The from and to values for the query
   */
  interval: { from: string; to: string };
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  /**
   * User defined fields to highlight (defined on the rule)
   */
  investigationFields?: string[];
}

export interface UsePrevalenceResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Returns the prevalence data formatted for the EuiInMemoryTable component
   */
  data: PrevalenceData[];
}

/**
 * Hook to fetch the prevalence data, then prepares the data to be consumed by the EuiInMemoryTable component
 * in the PrevalenceDetails component
 */
export const usePrevalence = ({
  interval,
  dataFormattedForFieldBrowser,
  investigationFields,
}: UsePrevalenceParams): UsePrevalenceResult => {
  const highlightedFields = useHighlightedFields({
    dataFormattedForFieldBrowser,
    investigationFields,
  });
  const highlightedFieldsFilters = useMemo(
    () => convertHighlightedFieldsToPrevalenceFilters(highlightedFields),
    [highlightedFields]
  );
  const { data, loading, error } = useFetchPrevalence({ highlightedFieldsFilters, interval });

  const items: PrevalenceData[] = [];

  if (data && data.aggregations) {
    // total number of unique hosts in the environment
    const uniqueHostsInEnvironment = data.aggregations[HOSTS_AGG_KEY].value;

    // total number of unique users in the environment
    const uniqueUsersInEnvironment = data.aggregations[USERS_AGG_KEY].value;

    const fieldNames = Object.keys(data.aggregations[FIELD_NAMES_AGG_KEY].buckets);

    fieldNames.forEach((fieldName: string) => {
      const fieldValues = highlightedFields[fieldName].values;

      // retrieves the number of signals for the current field/value pair
      const alertCount =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][EVENT_KIND_AGG_KEY].buckets.find(
          (aggregationValue: AggregationValue) => aggregationValue.key === EventKind.signal
        )?.doc_count || 0;

      // calculate the number of documents (non-signal) for the current field/value pair
      let docCount = 0;
      data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][EVENT_KIND_AGG_KEY].buckets.reduce(
        (acc, curr) => {
          if (curr.key !== EventKind.signal) {
            docCount += curr.doc_count;
          }
          return acc;
        },
        docCount
      );

      // number of unique hosts in which the current field/value pair is present
      const uniqueHostsForCurrentFieldValuePair =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][HOST_NAME_AGG_KEY].value;

      // number of unique users in which the current field/value pair is present
      const uniqueUsersForCurrentFieldValuePair =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][USER_NAME_AGG_KEY].value;

      // calculate host prevalence
      const hostPrevalence = uniqueHostsInEnvironment
        ? uniqueHostsForCurrentFieldValuePair / uniqueHostsInEnvironment
        : 0;

      // calculate user prevalence
      const userPrevalence = uniqueUsersInEnvironment
        ? uniqueUsersForCurrentFieldValuePair / uniqueUsersInEnvironment
        : 0;

      items.push({
        field: fieldName,
        values: fieldValues,
        alertCount,
        docCount,
        hostPrevalence,
        userPrevalence,
      });
    });
  }

  return {
    loading,
    error,
    data: items,
  };
};
