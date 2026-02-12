/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, merge } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/search-types';
import type { TimelineEventsQueries } from '../../../../../../common/api/search_strategy';
import type {
  EventHit,
  TimelineEventsDetailsItem,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../../../common/search_strategy';
import { ENRICHMENT_DESTINATION_PATH } from '../../../../../../common/constants';
import { inspectStringifyObject } from '../../../../../utils/build_query';
import type { TimelineFactory } from '../../types';
import { buildTimelineDetailsQuery } from './query.events_details.dsl';
import { getDataFromFieldsHits } from '../../../../../../common/utils/field_formatters';
import { buildEcsObjects } from '../../helpers/build_ecs_objects';

/**
 * Flattens a nested object into dotted-path keys with array values.
 * @internal Exported for testing only
 */
export const flattenNestedObject = (
  obj: Record<string, unknown>,
  prefix: string = ''
): Record<string, unknown[]> => {
  const result: Record<string, unknown[]> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenNestedObject(value as Record<string, unknown>, newKey);
      Object.assign(result, nested);
    } else {
      result[newKey] = Array.isArray(value) ? value : [value];
    }
  }

  return result;
};

export const addNestedFieldFromSource = (
  fieldsData: TimelineEventsDetailsItem[],
  source: Record<string, unknown> | undefined,
  fieldPath: string
): TimelineEventsDetailsItem[] => {
  if (!source) return fieldsData;

  const hasParentField = fieldsData.some((item) => item.field === fieldPath);
  if (hasParentField) return fieldsData;

  const nestedData = get(fieldPath, source);
  if (!nestedData) return fieldsData;

  const nestedArray = Array.isArray(nestedData) ? nestedData : [nestedData];
  const values = nestedArray.map((item) => {
    if (item !== null && typeof item === 'object') {
      const flattened = flattenNestedObject(item as Record<string, unknown>);
      return JSON.stringify(flattened);
    }
    return JSON.stringify(item);
  });

  const parentItem: TimelineEventsDetailsItem = {
    category: fieldPath.split('.')[0],
    field: fieldPath,
    values,
    originalValue: values,
    isObjectArray: true,
  };

  return [...fieldsData, parentItem];
};

export const timelineEventsDetails: TimelineFactory<TimelineEventsQueries.details> = {
  buildDsl: (parsedRequest) => {
    const { authFilter, ...options } = parsedRequest;
    const { indexName, eventId, runtimeMappings = {} } = options;
    return buildTimelineDetailsQuery({
      indexName,
      id: eventId,
      runtimeMappings,
      authFilter,
    });
  },
  parse: async (
    options,
    response: IEsSearchResponse<EventHit>
  ): Promise<TimelineEventsDetailsStrategyResponse> => {
    const { indexName, eventId, runtimeMappings = {} } = options;
    // _source is removed here as it's only needed in the rawEventData below
    const { fields, _source, ...hitsData } = response.rawResponse.hits.hits[0] ?? {};

    const inspect = {
      dsl: [
        inspectStringifyObject(
          buildTimelineDetailsQuery({ indexName, id: eventId, runtimeMappings })
        ),
      ],
    };
    if (response.isRunning) {
      return {
        ...response,
        data: [],
        inspect,
      };
    }

    let fieldsData = getDataFromFieldsHits(merge(fields, hitsData));

    fieldsData = addNestedFieldFromSource(
      fieldsData,
      _source as Record<string, unknown> | undefined,
      ENRICHMENT_DESTINATION_PATH
    );

    const rawEventData = response.rawResponse.hits.hits[0];
    const ecs = buildEcsObjects(rawEventData as EventHit);

    return {
      ...response,
      data: fieldsData,
      ecs,
      inspect,
      rawEventData,
    };
  },
};
